import { prisma } from "@/lib/db";
import { decryptSecret, hashClientKey } from "@/lib/crypto";
import type {
  ApiKey,
  ModelCatalog,
  ModelRoute,
  Provider,
  UpstreamKey,
} from "@/generated/prisma/client";

// ---------- Util ----------
export function openAiError(
  status: number,
  message: string,
  type = "invalid_request_error",
  code?: string,
): Response {
  return Response.json(
    { error: { message, type, ...(code ? { code } : {}) } },
    { status },
  );
}

// Error dalam amplop Anthropic: { type: "error", error: { type, message } }.
export function anthropicError(
  status: number,
  message: string,
  type = "invalid_request_error",
): Response {
  return Response.json({ type: "error", error: { type, message } }, { status });
}

// ---------- Auth key klien ----------
export type AuthedClient = ApiKey & {
  user: {
    id: string;
    isActive: boolean;
    tokenLimit: number | null;
    requestLimitHourly: number | null;
    createdAt: Date;
  } | null;
};

export async function authenticateClient(req: Request): Promise<AuthedClient | null> {
  const auth = req.headers.get("authorization") ?? "";
  let token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  // Klien Anthropic (Claude Code, Anthropic SDK) mengirim key lewat x-api-key.
  if (!token) token = (req.headers.get("x-api-key") ?? "").trim();
  if (!token) return null;
  const row = await prisma.apiKey.findUnique({
    where: { keyHash: hashClientKey(token) },
    include: {
      user: {
        select: { id: true, isActive: true, tokenLimit: true, requestLimitHourly: true, createdAt: true },
      },
    },
  });
  if (!row || !row.isActive) return null;
  if (row.user && !row.user.isActive) return null; // pemilik akun dinonaktifkan admin
  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > 60_000) {
    prisma.apiKey
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});
  }
  return row;
}

// Pemakaian token per siklus 7 hari kini dihitung oleh @/lib/quota
// (cycleTokensUsed) — penegakan kuota ada di route chat completions.

// ---------- Kandidat hulu (routing per model + rotasi key) ----------
export type Candidate = { provider: Provider; route: ModelRoute; key: UpstreamKey };

const cursors = new Map<string, number>();

export async function getCandidates(
  modelId: string,
): Promise<{ catalog: ModelCatalog | null; candidates: Candidate[] }> {
  const catalog = await prisma.modelCatalog.findUnique({ where: { modelId } });
  if (!catalog) return { catalog: null, candidates: [] };

  const routes = await prisma.modelRoute.findMany({
    where: { modelId: catalog.id, isActive: true, provider: { isActive: true } },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    include: { provider: { include: { upstreamKeys: true } } },
  });

  const now = new Date();
  const candidates: Candidate[] = [];
  for (const route of routes) {
    const usable = route.provider.upstreamKeys.filter(
      (k) =>
        k.status === "ACTIVE" ||
        (k.status === "COOLDOWN" && k.cooldownUntil !== null && k.cooldownUntil <= now),
    );
    if (!usable.length) continue;
    const start = (cursors.get(route.providerId) ?? 0) % usable.length;
    const ordered = [...usable.slice(start), ...usable.slice(0, start)];
    cursors.set(route.providerId, start + 1);
    for (const key of ordered) {
      candidates.push({ provider: route.provider, route, key });
    }
  }
  return { catalog, candidates };
}

// ---------- Pemetaan error hulu ----------
// Status code dari hulu SELALU dicek di sini sebelum apa pun dikirim ke
// klien. Badan error hulu tidak pernah diteruskan mentah; klien selalu
// menerima pesan GreenRouter sendiri dalam amplop yang sesuai formatnya.

// Status yang memicu percobaan kandidat berikutnya (failover). Di luar
// daftar ini (400, 413, 422, dst.) error dianggap berasal dari request
// klien dan langsung dijawab tanpa mencoba kandidat lain.
const FAILOVER_STATUSES = new Set([401, 402, 403, 404, 408, 429]);

function isFailoverStatus(status: number): boolean {
  return FAILOVER_STATUSES.has(status) || status >= 500;
}

type ClientError = { status: number; type: string; code: string; message: string };

function mapUpstreamError(status: number): ClientError {
  switch (status) {
    case 400:
      return {
        status: 400,
        type: "invalid_request_error",
        code: "invalid_request",
        message: "Request tidak valid. Periksa kembali format dan isi request kamu.",
      };
    case 401:
    case 402:
    case 403:
      // Masalah di sisi layanan (key hulu tidak valid atau terkena limit),
      // bukan kesalahan klien, jadi jangan pernah dibocorkan sebagai 401/402.
      return {
        status: 503,
        type: "api_error",
        code: "service_unavailable",
        message: "Layanan AI sedang tidak tersedia untuk sementara. Silakan coba lagi nanti.",
      };
    case 404:
      return {
        status: 404,
        type: "invalid_request_error",
        code: "model_not_found",
        message: "Model tidak ditemukan. Gunakan ID model yang tersedia lewat GET /v1/models.",
      };
    case 408:
    case 504:
      return {
        status: 504,
        type: "api_error",
        code: "upstream_timeout",
        message: "Model tidak merespons tepat waktu. Silakan coba lagi.",
      };
    case 409:
      // ID request yang sama dipakai ulang (request_replay di hulu).
      return {
        status: 409,
        type: "invalid_request_error",
        code: "request_replay",
        message: "Request ini sudah pernah diproses sebelumnya. Kirim ulang sebagai request baru.",
      };
    case 413:
      return {
        status: 413,
        type: "invalid_request_error",
        code: "request_too_large",
        message: "Ukuran request terlalu besar.",
      };
    case 503:
      return {
        status: 503,
        type: "api_error",
        code: "service_unavailable",
        message: "Layanan AI sedang tidak tersedia untuk sementara. Silakan coba lagi nanti.",
      };
    case 422:
      return {
        status: 422,
        type: "invalid_request_error",
        code: "invalid_request",
        message: "Request tidak valid. Periksa kembali format dan isi request kamu.",
      };
    case 429:
      return {
        status: 429,
        type: "rate_limit_error",
        code: "rate_limited",
        message: "Terlalu banyak request dalam waktu singkat. Silakan coba lagi dalam beberapa saat.",
      };
    default:
      if (status >= 500) {
        return {
          status: 502,
          type: "api_error",
          code: "upstream_error",
          message: "Layanan AI sedang mengalami gangguan. Silakan coba lagi nanti.",
        };
      }
      return {
        status: 400,
        type: "invalid_request_error",
        code: "invalid_request",
        message: "Request tidak valid. Periksa kembali format dan isi request kamu.",
      };
  }
}

function clientErrorResponse(
  format: "openai" | "anthropic",
  upstreamStatus: number,
  retryAfterSec?: number | null,
): Response {
  const m = mapUpstreamError(upstreamStatus);
  let res: Response;
  if (format === "anthropic") {
    const type =
      m.status === 404 ? "not_found_error" : m.status === 429 ? "rate_limit_error" : m.type;
    res = anthropicError(m.status, m.message, type);
  } else {
    res = openAiError(m.status, m.message, m.type, m.code);
  }
  if (m.status === 429 && retryAfterSec && retryAfterSec > 0) {
    res.headers.set("Retry-After", String(Math.ceil(retryAfterSec)));
  }
  return res;
}

// Header Retry-After hulu: detik (angka) atau tanggal HTTP.
function parseRetryAfter(headers: Headers): number | null {
  const raw = headers.get("retry-after");
  if (!raw) return null;
  const secs = Number(raw);
  if (Number.isFinite(secs) && secs > 0) return Math.ceil(secs);
  const when = Date.parse(raw);
  if (!Number.isNaN(when)) {
    const diff = Math.ceil((when - Date.now()) / 1000);
    return diff > 0 ? diff : null;
  }
  return null;
}

// ---------- Status kesehatan key ----------
async function markKeyFailure(key: UpstreamKey, status: number): Promise<void> {
  try {
    if (status === 401 || status === 403) {
      // Key tidak valid atau tidak berhak: nonaktifkan permanen sampai
      // admin memeriksanya sendiri.
      await prisma.upstreamKey.update({
        where: { id: key.id },
        data: { status: "DISABLED", cooldownUntil: null, failCount: { increment: 1 } },
      });
    } else if (status === 402) {
      // Kredit/limit token hulu habis: tandai LIMITED. Key otomatis keluar
      // dari rotasi dan TIDAK pulih sendiri, menunggu tindakan admin
      // (banner peringatan tampil di Ringkasan admin).
      await prisma.upstreamKey.update({
        where: { id: key.id },
        data: { status: "LIMITED", cooldownUntil: null, failCount: { increment: 1 } },
      });
    } else if (status === 429) {
      // Rate-limit hulu bersifat sementara; cukup catat kegagalannya,
      // key tidak diblokir dan tetap ikut rotasi.
      await prisma.upstreamKey.update({
        where: { id: key.id },
        data: { failCount: { increment: 1 } },
      });
    } else {
      await prisma.upstreamKey.update({
        where: { id: key.id },
        data: { failCount: { increment: 1 } },
      });
    }
  } catch {}
}

async function markKeySuccess(key: UpstreamKey): Promise<void> {
  if (key.status === "ACTIVE" && key.failCount === 0) return;
  try {
    await prisma.upstreamKey.update({
      where: { id: key.id },
      data: { status: "ACTIVE", cooldownUntil: null, failCount: 0 },
    });
  } catch {}
}

// ---------- Log pemakaian ----------
type UsageData = {
  userId?: string | null;
  apiKeyId?: string;
  providerId?: string;
  upstreamKeyId?: string;
  modelId: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  status: "SUCCESS" | "ERROR";
  error?: string;
};

export async function logUsage(d: UsageData): Promise<void> {
  try {
    await prisma.usageLog.create({ data: d });
  } catch {}
}

type Usage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };

// ---------- Forward chat completions dengan failover ----------
export async function forwardChatCompletion(args: {
  apiKeyId: string;
  userId?: string | null;
  modelId: string;
  candidates: Candidate[];
  body: Record<string, unknown>;
  stream: boolean;
}): Promise<Response> {
  const started = Date.now();
  let lastStatus = 502;
  let lastBody = "";
  let lastCand: Candidate | null = null;
  let minRetryAfter: number | null = null;

  for (const cand of args.candidates) {
    const outBody: Record<string, unknown> = {
      ...args.body,
      model: cand.route.upstreamModelId,
    };
    if (args.stream && !outBody.stream_options) {
      outBody.stream_options = { include_usage: true };
    }

    let upstream: Response;
    try {
      upstream = await fetch(
        `${cand.provider.baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${decryptSecret(cand.key.encryptedKey)}`,
          },
          body: JSON.stringify(outBody),
          signal: AbortSignal.timeout(180_000),
        },
      );
    } catch (e) {
      await markKeyFailure(cand.key, 502);
      lastStatus = 502;
      lastBody = e instanceof Error ? e.message : "network error";
      lastCand = cand;
      continue;
    }

    if (!upstream.ok) {
      lastStatus = upstream.status;
      lastCand = cand;
      // Badan error hanya dibaca untuk log internal, tidak diteruskan.
      lastBody = await upstream.text().catch(() => "");
      if (isFailoverStatus(upstream.status)) {
        if (upstream.status === 429) {
          // Rate-limit hulu: simpan Retry-After tersingkat untuk disampaikan
          // ke klien bila semua kandidat ikut gagal.
          const ra = parseRetryAfter(upstream.headers);
          const wait = ra ?? 60;
          if (minRetryAfter === null || wait < minRetryAfter) minRetryAfter = wait;
        }
        await markKeyFailure(cand.key, upstream.status);
        continue; // coba kandidat berikutnya
      }
      // Error lain (400 dsb.) berasal dari request klien; jawab dengan
      // pesan GreenRouter sendiri, bukan badan error hulu.
      await logUsage({
        apiKeyId: args.apiKeyId,
        userId: args.userId ?? undefined,
        providerId: cand.provider.id,
        upstreamKeyId: cand.key.id,
        modelId: args.modelId,
        latencyMs: Date.now() - started,
        status: "ERROR",
        error: `upstream ${upstream.status}`,
      });
      return clientErrorResponse("openai", upstream.status);
    }

    await markKeySuccess(cand.key);

    if (!args.stream || !upstream.body) {
      const text = await upstream.text();
      let usage: Usage | undefined;
      try {
        usage = (JSON.parse(text) as { usage?: Usage }).usage;
      } catch {}
      await logUsage({
        apiKeyId: args.apiKeyId,
        userId: args.userId ?? undefined,
        providerId: cand.provider.id,
        upstreamKeyId: cand.key.id,
        modelId: args.modelId,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        latencyMs: Date.now() - started,
        status: "SUCCESS",
      });
      return new Response(text, {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // Streaming: teruskan chunk apa adanya, pindai usage di ekor stream.
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let tail = "";
    const bodyStream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          let usage: Usage | undefined;
          try {
            const m = tail.match(/"usage"\s*:\s*(\{[^{}]*\})/);
            if (m) usage = JSON.parse(m[1]) as Usage;
          } catch {}
          void logUsage({
            apiKeyId: args.apiKeyId,
            userId: args.userId ?? undefined,
            providerId: cand.provider.id,
            upstreamKeyId: cand.key.id,
            modelId: args.modelId,
            promptTokens: usage?.prompt_tokens,
            completionTokens: usage?.completion_tokens,
            totalTokens: usage?.total_tokens,
            latencyMs: Date.now() - started,
            status: "SUCCESS",
          });
          controller.close();
          return;
        }
        tail = (tail + decoder.decode(value, { stream: true })).slice(-4096);
        controller.enqueue(value);
      },
      cancel() {
        reader.cancel().catch(() => {});
      },
    });
    return new Response(bodyStream, {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  }

  // Semua kandidat gagal.
  await logUsage({
    apiKeyId: args.apiKeyId,
    userId: args.userId ?? undefined,
    providerId: lastCand?.provider.id,
    upstreamKeyId: lastCand?.key.id,
    modelId: args.modelId,
    latencyMs: Date.now() - started,
    status: "ERROR",
    error: `upstream ${lastStatus}: ${lastBody.slice(0, 200)}`,
  });
  return clientErrorResponse("openai", lastStatus, lastStatus === 429 ? minRetryAfter : undefined);
}

// ---------- Forward Anthropic Messages (POST /v1/messages) ----------
// Penerusan ala kadarnya seperti jalur OpenAI, tetapi ke endpoint Anthropic
// hulu ({baseUrl}/messages): header x-api-key + anthropic-version, usage
// berbentuk { input_tokens, output_tokens }, dan SSE khas Anthropic
// (message_start/message_delta membawa usage). Failover & pencatatan sama.
export async function forwardAnthropicMessages(args: {
  apiKeyId: string;
  userId?: string | null;
  modelId: string;
  candidates: Candidate[];
  body: Record<string, unknown>;
  stream: boolean;
  anthropicVersion?: string;
  anthropicBeta?: string;
}): Promise<Response> {
  const started = Date.now();
  let lastStatus = 502;
  let lastBody = "";
  let lastCand: Candidate | null = null;
  let minRetryAfter: number | null = null;

  for (const cand of args.candidates) {
    const outBody: Record<string, unknown> = {
      ...args.body,
      model: cand.route.upstreamModelId,
    };

    let upstream: Response;
    try {
      upstream = await fetch(`${cand.provider.baseUrl.replace(/\/$/, "")}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": decryptSecret(cand.key.encryptedKey),
          "anthropic-version": args.anthropicVersion ?? "2023-06-01",
          ...(args.anthropicBeta ? { "anthropic-beta": args.anthropicBeta } : {}),
        },
        body: JSON.stringify(outBody),
        signal: AbortSignal.timeout(180_000),
      });
    } catch (e) {
      await markKeyFailure(cand.key, 502);
      lastStatus = 502;
      lastBody = e instanceof Error ? e.message : "network error";
      lastCand = cand;
      continue;
    }

    if (!upstream.ok) {
      lastStatus = upstream.status;
      lastCand = cand;
      // Badan error hanya dibaca untuk log internal, tidak diteruskan.
      lastBody = await upstream.text().catch(() => "");
      if (isFailoverStatus(upstream.status)) {
        if (upstream.status === 429) {
          const ra = parseRetryAfter(upstream.headers);
          const wait = ra ?? 60;
          if (minRetryAfter === null || wait < minRetryAfter) minRetryAfter = wait;
        }
        await markKeyFailure(cand.key, upstream.status);
        continue;
      }
      await logUsage({
        apiKeyId: args.apiKeyId,
        userId: args.userId ?? undefined,
        providerId: cand.provider.id,
        upstreamKeyId: cand.key.id,
        modelId: args.modelId,
        latencyMs: Date.now() - started,
        status: "ERROR",
        error: `upstream ${upstream.status}`,
      });
      return clientErrorResponse("anthropic", upstream.status);
    }

    await markKeySuccess(cand.key);

    if (!args.stream || !upstream.body) {
      const text = await upstream.text();
      let usage: { input_tokens?: number; output_tokens?: number } | undefined;
      try {
        usage = (JSON.parse(text) as { usage?: typeof usage }).usage;
      } catch {}
      const promptTokens = usage?.input_tokens;
      const completionTokens = usage?.output_tokens;
      await logUsage({
        apiKeyId: args.apiKeyId,
        userId: args.userId ?? undefined,
        providerId: cand.provider.id,
        upstreamKeyId: cand.key.id,
        modelId: args.modelId,
        promptTokens,
        completionTokens,
        totalTokens:
          promptTokens != null || completionTokens != null
            ? (promptTokens ?? 0) + (completionTokens ?? 0)
            : undefined,
        latencyMs: Date.now() - started,
        status: "SUCCESS",
      });
      return new Response(text, {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // Streaming: teruskan event apa adanya; usage dipanen dari event
    // message_start (input_tokens) dan message_delta terakhir (output_tokens).
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const bodyStream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          const inMatch = buffer.match(/"input_tokens"\s*:\s*(\d+)/);
          const outMatches = [...buffer.matchAll(/"output_tokens"\s*:\s*(\d+)/g)];
          const promptTokens = inMatch ? parseInt(inMatch[1], 10) : undefined;
          const completionTokens = outMatches.length
            ? parseInt(outMatches[outMatches.length - 1][1], 10)
            : undefined;
          void logUsage({
            apiKeyId: args.apiKeyId,
            userId: args.userId ?? undefined,
            providerId: cand.provider.id,
            upstreamKeyId: cand.key.id,
            modelId: args.modelId,
            promptTokens,
            completionTokens,
            totalTokens:
              promptTokens != null || completionTokens != null
                ? (promptTokens ?? 0) + (completionTokens ?? 0)
                : undefined,
            latencyMs: Date.now() - started,
            status: "SUCCESS",
          });
          controller.close();
          return;
        }
        buffer = (buffer + decoder.decode(value, { stream: true })).slice(-16384);
        controller.enqueue(value);
      },
      cancel() {
        reader.cancel().catch(() => {});
      },
    });
    return new Response(bodyStream, {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  }

  // Semua kandidat gagal.
  await logUsage({
    apiKeyId: args.apiKeyId,
    userId: args.userId ?? undefined,
    providerId: lastCand?.provider.id,
    upstreamKeyId: lastCand?.key.id,
    modelId: args.modelId,
    latencyMs: Date.now() - started,
    status: "ERROR",
    error: `upstream ${lastStatus}: ${lastBody.slice(0, 200)}`,
  });
  return clientErrorResponse("anthropic", lastStatus, lastStatus === 429 ? minRetryAfter : undefined);
}
