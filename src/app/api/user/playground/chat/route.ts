import { prisma } from "@/lib/db";
import { getActiveSession } from "@/lib/session";
import { cycleTokensUsed, fmtDateShort, hourlyRequestsUsed } from "@/lib/quota";
import { forwardChatCompletion, getCandidates, openAiError } from "@/server/gateway";

// POST /api/user/playground/chat — jalur chat Playground dashboard.
// Autentikasi memakai sesi login (bukan API key); pemeriksaan kuota,
// gerbang akses awal, failover, dan pencatatan UsageLog sama persis
// dengan gateway publik, hanya apiKeyId-nya null. Respons selalu
// streaming (SSE format OpenAI) agar UI bisa menampilkan jawaban
// kata demi kata.

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const MAX_MESSAGES = 41;
const MAX_CONTENT = 8000;
const MAX_SYSTEM = 2000;
// Pagu token jawaban khusus Playground, melindungi kuota dari model
// penalaran yang bisa membakar token sangat panjang dalam satu balas.
const MAX_PLAYGROUND_TOKENS = 8192;

export async function POST(req: Request) {
  const session = await getActiveSession();
  if (!session) {
    return openAiError(401, "Sesi tidak valid atau akun sedang disuspend", "invalid_request_error", "unauthorized");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: { id: true, createdAt: true, tokenLimit: true, requestLimitHourly: true, plan: true },
  });
  if (!user) {
    return openAiError(401, "Sesi tidak valid atau akun sedang disuspend", "invalid_request_error", "unauthorized");
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return openAiError(400, "Body harus berupa JSON yang valid");
  }

  const model = typeof body.model === "string" ? body.model : "";
  if (!model) return openAiError(400, "Field 'model' wajib diisi");

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return openAiError(400, "Field 'messages' wajib berupa array yang tidak kosong");
  }
  if (body.messages.length > MAX_MESSAGES) {
    return openAiError(400, `Percakapan terlalu panjang, maksimal ${MAX_MESSAGES} pesan`);
  }
  const messages: ChatMessage[] = [];
  for (const m of body.messages as unknown[]) {
    const msg = m as { role?: unknown; content?: unknown };
    if (
      (msg.role !== "user" && msg.role !== "assistant") ||
      typeof msg.content !== "string" ||
      msg.content.trim() === ""
    ) {
      return openAiError(400, "Setiap pesan wajib berisi role (user/assistant) dan content teks");
    }
    messages.push({ role: msg.role, content: msg.content.slice(0, MAX_CONTENT) });
  }
  if (messages[messages.length - 1].role !== "user") {
    return openAiError(400, "Pesan terakhir harus dari pengguna");
  }

  const system = typeof body.system === "string" ? body.system.trim().slice(0, MAX_SYSTEM) : "";
  const finalMessages: ChatMessage[] = system
    ? [{ role: "system", content: system }, ...messages]
    : messages;

  let temperature: number | undefined;
  if (typeof body.temperature === "number" && Number.isFinite(body.temperature)) {
    temperature = Math.min(2, Math.max(0, body.temperature));
  }

  // Kuota token per siklus 7 hari (sama seperti gateway publik).
  if (user.tokenLimit != null) {
    const { used, window } = await cycleTokensUsed(user.id, user.createdAt);
    if (used >= user.tokenLimit) {
      return openAiError(
        429,
        `Kuota token siklus ini habis (${used.toLocaleString("id-ID")} dari ${user.tokenLimit.toLocaleString("id-ID")} token). Kuota diperbarui otomatis pada ${fmtDateShort(window.end)}.`,
        "rate_limit_error",
        "quota_exceeded",
      );
    }
  }

  // Batas request per jam (sama seperti gateway publik).
  if (user.requestLimitHourly != null) {
    const { count, retryAfterSec } = await hourlyRequestsUsed(user.id);
    if (count >= user.requestLimitHourly) {
      const res = openAiError(
        429,
        `Batas ${user.requestLimitHourly} request per jam tercapai. Silakan coba lagi dalam ${Math.ceil((retryAfterSec ?? 60) / 60)} menit.`,
        "rate_limit_error",
        "hourly_limit_exceeded",
      );
      if (retryAfterSec) res.headers.set("Retry-After", String(retryAfterSec));
      return res;
    }
  }

  const { catalog, candidates } = await getCandidates(model);
  if (!catalog) {
    return openAiError(404, `Model '${model}' tidak ditemukan`, "invalid_request_error", "model_not_found");
  }
  // Akses awal: plan Gratis menerima jawaban yang sama seperti
  // model yang tidak dikenal, sama seperti gateway publik.
  if (catalog.earlyAccessUntil && catalog.earlyAccessUntil > new Date() && user.plan === "gratis") {
    return openAiError(404, `Model '${model}' tidak ditemukan`, "invalid_request_error", "model_not_found");
  }
  if (!candidates.length) {
    return openAiError(503, `Model '${model}' sedang dalam pemeliharaan sementara. Silakan coba model lain atau coba lagi nanti.`, "api_error", "service_unavailable");
  }

  let maxTokens = 2048;
  if (typeof body.maxTokens === "number" && Number.isFinite(body.maxTokens)) {
    maxTokens = Math.floor(body.maxTokens);
  }
  maxTokens = Math.min(
    MAX_PLAYGROUND_TOKENS,
    catalog.maxOutputTokens ?? MAX_PLAYGROUND_TOKENS,
    Math.max(16, maxTokens),
  );

  return forwardChatCompletion({
    apiKeyId: null,
    userId: user.id,
    modelId: model,
    candidates,
    body: {
      model,
      messages: finalMessages,
      stream: true,
      ...(temperature !== undefined ? { temperature } : {}),
      max_tokens: maxTokens,
    },
    stream: true,
    plan: user.plan,
  });
}
