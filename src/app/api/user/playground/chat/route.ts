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

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };
type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
};

const MAX_MESSAGES = 41;
const MAX_CONTENT = 8000;
const MAX_SYSTEM = 2000;
const MAX_IMAGES_PER_MESSAGE = 3;
// Data URI base64 dari berkas 3 MB berukuran sekitar 4 juta karakter.
const MAX_IMAGE_CHARS = 4_500_000;
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
  let hasImage = false;
  for (const m of body.messages as unknown[]) {
    const msg = m as { role?: unknown; content?: unknown };
    if (msg.role !== "user" && msg.role !== "assistant") {
      return openAiError(400, "Setiap pesan wajib berisi role (user/assistant) dan content");
    }
    if (typeof msg.content === "string") {
      if (msg.content.trim() === "") {
        // Pesan assistant kosong (jawaban model pernah tidak keluar)
        // dibuang dari riwayat, BUKAN menolak seluruh request; tanpa
        // ini satu jawaban kosong mengunci percakapan selamanya.
        if (msg.role === "assistant") continue;
        return openAiError(400, "Content pesan tidak boleh kosong");
      }
      messages.push({ role: msg.role, content: msg.content.slice(0, MAX_CONTENT) });
      continue;
    }
    // Bentuk bagian konten (teks + lampiran gambar) hanya untuk
    // pesan pengguna; lampiran wajib data URI gambar, bukan URL luar.
    if (msg.role !== "user" || !Array.isArray(msg.content)) {
      return openAiError(400, "Content pesan harus berupa teks atau daftar bagian konten");
    }
    if (msg.content.length === 0 || msg.content.length > MAX_IMAGES_PER_MESSAGE + 1) {
      return openAiError(400, "Bagian konten pesan tidak valid");
    }
    const parts: ContentPart[] = [];
    let images = 0;
    let hasText = false;
    for (const p of msg.content as unknown[]) {
      const part = p as { type?: unknown; text?: unknown; image_url?: { url?: unknown } };
      if (part.type === "text" && typeof part.text === "string") {
        if (part.text.trim() !== "") hasText = true;
        parts.push({ type: "text", text: part.text.slice(0, MAX_CONTENT) });
      } else if (
        part.type === "image_url" &&
        typeof part.image_url?.url === "string" &&
        part.image_url.url.startsWith("data:image/") &&
        part.image_url.url.length <= MAX_IMAGE_CHARS
      ) {
        images++;
        hasImage = true;
        parts.push({ type: "image_url", image_url: { url: part.image_url.url } });
      } else {
        return openAiError(
          400,
          "Bagian konten tidak didukung. Lampiran harus berupa gambar data URI, maksimal 3 MB per gambar.",
        );
      }
    }
    if (images > MAX_IMAGES_PER_MESSAGE) {
      return openAiError(400, `Maksimal ${MAX_IMAGES_PER_MESSAGE} gambar per pesan`);
    }
    if (!hasText && images === 0) {
      return openAiError(400, "Content pesan tidak boleh kosong");
    }
    messages.push({ role: msg.role, content: parts });
  }
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
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
  // Lampiran gambar hanya diteruskan ke model berkemampuan gambar;
  // UI menonaktifkan tombol lampirannya, gerbang ini lapisan kedua.
  if (hasImage) {
    const mods = (catalog.inputModalities ?? "").split(",").map((x) => x.trim());
    if (!mods.includes("image")) {
      return openAiError(
        400,
        `Model '${model}' tidak mendukung lampiran gambar`,
        "invalid_request_error",
        "image_not_supported",
      );
    }
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
