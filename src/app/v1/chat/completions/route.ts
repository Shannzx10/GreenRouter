import {
  authenticateClient,
  forwardChatCompletion,
  getCandidates,
  openAiError,
} from "@/server/gateway";
import { cycleKeyTokensUsed, cycleTokensUsed, fmtDateShort, hourlyRequestsUsed } from "@/lib/quota";


// POST /v1/chat/completions — OpenAI-compatible, dengan failover antar key/provider.
export async function POST(req: Request) {
  const client = await authenticateClient(req);
  if (client === "SUSPENDED") {
    return openAiError(403, "Akun pemilik key ini sedang disuspend. Semua akses API dihentikan sementara.", "invalid_request_error", "account_suspended");
  }
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

  // Batas token per key (fitur plan Max): key ini punya pagu sendiri
  // di dalam jendela siklus pemiliknya, di luar kuota akun.
  if (client.tokenLimit != null && client.user) {
    const { used, window } = await cycleKeyTokensUsed(client.id, client.user.createdAt);
    if (used >= client.tokenLimit) {
      return openAiError(
        429,
        `Batas token key ini untuk siklus ini sudah tercapai (${used.toLocaleString("id-ID")} dari ${client.tokenLimit.toLocaleString("id-ID")} token). Batas diperbarui otomatis pada ${fmtDateShort(window.end)}, atau naikkan batasnya di halaman Key.`,
        "rate_limit_error",
        "key_quota_exceeded",
      );
    }
  }

  const { catalog, candidates } = await getCandidates(model);
  if (!catalog) {
    return openAiError(404, `Model '${model}' tidak ditemukan`, "invalid_request_error", "model_not_found");
  }
  // Akses awal: selama masa akses awal, model baru hanya terbuka
  // untuk plan berbayar. Plan Gratis menerima jawaban yang sama
  // seperti model yang tidak dikenal.
  if (
    catalog.earlyAccessUntil &&
    catalog.earlyAccessUntil > new Date() &&
    (client.user?.plan ?? "gratis") === "gratis"
  ) {
    return openAiError(404, `Model '${model}' tidak ditemukan`, "invalid_request_error", "model_not_found");
  }
  if (!candidates.length) {
    return openAiError(503, `Model '${model}' sedang dalam pemeliharaan sementara. Silakan coba model lain atau coba lagi nanti.`, "api_error", "service_unavailable");
  }

  return forwardChatCompletion({
    apiKeyId: client.id,
    userId: client.user?.id ?? null,
    modelId: model,
    candidates,
    body,
    stream: body.stream === true,
    plan: client.user?.plan,
  });
}
