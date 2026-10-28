import {
  authenticateClient,
  forwardChatCompletion,
  getCandidates,
  openAiError,
} from "@/server/gateway";
import { cycleTokensUsed, fmtDateShort } from "@/lib/quota";


// POST /v1/chat/completions — OpenAI-compatible, dengan failover antar key/provider.
export async function POST(req: Request) {
  const client = await authenticateClient(req);
  if (!client) {
    return openAiError(401, "API key tidak valid", "invalid_request_error", "invalid_api_key");
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return openAiError(400, "Body harus berupa JSON yang valid");
  }

  const model = typeof body.model === "string" ? body.model : "";
  if (!model) return openAiError(400, "Field 'model' wajib diisi");
  if (!Array.isArray(body.messages)) {
    return openAiError(400, "Field 'messages' wajib berupa array");
  }

  // Kuota token per siklus 7 hari milik pemilik key (bila diatur).
  if (client.user && client.user.tokenLimit != null) {
    const { used, window } = await cycleTokensUsed(client.user.id, client.user.createdAt);
    if (used >= client.user.tokenLimit) {
      return openAiError(
        429,
        `Kuota token siklus ini habis (${used.toLocaleString("id-ID")} dari ${client.user.tokenLimit.toLocaleString("id-ID")} token). Kuota diperbarui otomatis pada ${fmtDateShort(window.end)}.`,
        "rate_limit_error",
        "quota_exceeded",
      );
    }
  }

  const { catalog, candidates, retryAfterSec } = await getCandidates(model);
  if (!catalog) {
    return openAiError(404, `Model '${model}' tidak ditemukan`, "invalid_request_error", "model_not_found");
  }
  if (!candidates.length) {
    if (retryAfterSec) {
      // Semua key sedang rate-cooldown khusus model ini; sampaikan kapan
      // paling cepat bisa dicoba lagi lewat header Retry-After.
      const res = openAiError(
        429,
        "Terlalu banyak request dalam waktu singkat. Silakan coba lagi dalam beberapa saat.",
        "rate_limit_error",
        "rate_limited",
      );
      res.headers.set("Retry-After", String(retryAfterSec));
      return res;
    }
    return openAiError(503, `Tidak ada penyedia aktif untuk model '${model}'`, "upstream_error");
  }

  return forwardChatCompletion({
    apiKeyId: client.id,
    userId: client.user?.id ?? null,
    modelId: model,
    candidates,
    body,
    stream: body.stream === true,
  });
}
