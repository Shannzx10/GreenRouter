import {
  authenticateClient,
  forwardChatCompletion,
  getCandidates,
  openAiError,
} from "@/server/gateway";
import { cycleTokensUsed, fmtDateShort, hourlyRequestsUsed } from "@/lib/quota";


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

  // Batas request per jam milik pemilik key (jendela bergeser, bila diatur).
  if (client.user && client.user.requestLimitHourly != null) {
    const { count, retryAfterSec } = await hourlyRequestsUsed(client.user.id);
    if (count >= client.user.requestLimitHourly) {
      const res = openAiError(
        429,
        `Batas ${client.user.requestLimitHourly} request per jam tercapai. Silakan coba lagi dalam ${Math.ceil((retryAfterSec ?? 60) / 60)} menit.`,
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
  if (!candidates.length) {
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
