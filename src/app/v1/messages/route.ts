import {
  anthropicError,
  authenticateClient,
  forwardAnthropicMessages,
  getCandidates,
} from "@/server/gateway";
import { cycleKeyTokensUsed, cycleTokensUsed, fmtDateShort, hourlyRequestsUsed } from "@/lib/quota";

// POST /v1/messages — kompatibel Anthropic (Claude Code & Anthropic SDK).
// Key klien, kuota siklus, routing, dan pencatatan sama seperti jalur OpenAI;
// yang berbeda hanya amplop error dan format yang diteruskan ke hulu.
export async function POST(req: Request) {
  const client = await authenticateClient(req);
  if (client === "SUSPENDED") {
    return anthropicError(403, "Akun pemilik key ini sedang disuspend. Semua akses API dihentikan sementara.", "permission_error");
  }
  if (!client) {
    return anthropicError(401, "API key tidak valid", "authentication_error");
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return anthropicError(400, "Body harus berupa JSON yang valid");
  }

  const model = typeof body.model === "string" ? body.model : "";
  if (!model) return anthropicError(400, "Field 'model' wajib diisi");
  if (!Array.isArray(body.messages)) {
    return anthropicError(400, "Field 'messages' wajib berupa array");
  }

  // Kuota token per siklus 7 hari milik pemilik key (sama seperti jalur OpenAI).
  if (client.user && client.user.tokenLimit != null) {
    const { used, window } = await cycleTokensUsed(client.user.id, client.user.createdAt);
    if (used >= client.user.tokenLimit) {
      return anthropicError(
        429,
        `Kuota token siklus ini habis (${used.toLocaleString("id-ID")} dari ${client.user.tokenLimit.toLocaleString("id-ID")} token). Kuota diperbarui otomatis pada ${fmtDateShort(window.end)}.`,
        "rate_limit_error",
      );
    }
  }

  // Batas request per jam milik pemilik key (jendela bergeser, bila diatur).
  if (client.user && client.user.requestLimitHourly != null) {
    const { count, retryAfterSec } = await hourlyRequestsUsed(client.user.id);
    if (count >= client.user.requestLimitHourly) {
      const res = anthropicError(
        429,
        `Batas ${client.user.requestLimitHourly} request per jam tercapai. Silakan coba lagi dalam ${Math.ceil((retryAfterSec ?? 60) / 60)} menit.`,
        "rate_limit_error",
      );
      if (retryAfterSec) res.headers.set("Retry-After", String(retryAfterSec));
      return res;
    }
  }

  // Batas token per key (fitur plan Max), sama seperti jalur OpenAI.
  if (client.tokenLimit != null && client.user) {
    const { used, window } = await cycleKeyTokensUsed(client.id, client.user.createdAt);
    if (used >= client.tokenLimit) {
      return anthropicError(
        429,
        `Batas token key ini untuk siklus ini sudah tercapai (${used.toLocaleString("id-ID")} dari ${client.tokenLimit.toLocaleString("id-ID")} token). Batas diperbarui otomatis pada ${fmtDateShort(window.end)}, atau naikkan batasnya di halaman Key.`,
        "rate_limit_error",
      );
    }
  }

  const { catalog, candidates } = await getCandidates(model);
  if (!catalog) {
    return anthropicError(404, `Model '${model}' tidak ditemukan`, "not_found_error");
  }
  // Akses awal: plan Gratis menerima jawaban yang sama seperti
  // model yang tidak dikenal selama masa akses awal berjalan.
  if (
    catalog.earlyAccessUntil &&
    catalog.earlyAccessUntil > new Date() &&
    (client.user?.plan ?? "gratis") === "gratis"
  ) {
    return anthropicError(404, `Model '${model}' tidak ditemukan`, "not_found_error");
  }
  if (!candidates.length) {
    return anthropicError(503, `Model '${model}' sedang dalam pemeliharaan sementara. Silakan coba model lain atau coba lagi nanti.`, "api_error");
  }

  return forwardAnthropicMessages({
    apiKeyId: client.id,
    userId: client.user?.id ?? null,
    modelId: model,
    candidates,
    body,
    stream: body.stream === true,
    anthropicVersion: req.headers.get("anthropic-version") ?? undefined,
    anthropicBeta: req.headers.get("anthropic-beta") ?? undefined,
    plan: client.user?.plan,
  });
}
