import { prisma } from "@/lib/db";
import { authenticateClient, openAiError } from "@/server/gateway";

function parseCsv(v: string | null): string[] {
  return v
    ? v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}

// GET /v1/models — daftar model dari katalog GreenRouter sendiri (bukan
// teruskan mentah dari hulu), hanya yang punya minimal satu route aktif,
// lengkap dengan metadata hasil parsing kita: nama tampilan, konteks,
// modalitas masukan, dan kemampuan.
export async function GET(req: Request) {
  const client = await authenticateClient(req);
  if (!client) {
    return openAiError(401, "API key tidak valid", "invalid_request_error", "invalid_api_key");
  }
  const models = await prisma.modelCatalog.findMany({
    where: { routes: { some: { isActive: true, provider: { isActive: true } } } },
    orderBy: { modelId: "asc" },
  });
  // Akses awal: model yang masih dalam masa akses awal hanya
  // tampil untuk plan berbayar; plan Gratis tidak melihatnya.
  const plan = client === "SUSPENDED" ? "gratis" : (client.user?.plan ?? "gratis");
  const now = new Date();
  const visible =
    plan === "gratis"
      ? models.filter((m) => !m.earlyAccessUntil || m.earlyAccessUntil <= now)
      : models;
  return Response.json({
    object: "list",
    data: visible.map((m) => ({
      id: m.modelId,
      object: "model",
      created: Math.floor(m.createdAt.getTime() / 1000),
      owned_by: "greenrouter",
      display_name: m.displayName,
      ...(m.contextTokens != null ? { context_window: m.contextTokens } : {}),
      ...(m.maxOutputTokens != null ? { max_output_tokens: m.maxOutputTokens } : {}),
      ...(m.inputModalities
        ? { input_modalities: parseCsv(m.inputModalities) }
        : {}),
      ...(m.capabilities ? { capabilities: parseCsv(m.capabilities) } : {}),
      ...(m.knowledgeCutoff ? { knowledge_cutoff: m.knowledgeCutoff } : {}),
    })),
  });
}
