import { prisma } from "./db";
import { decryptSecret } from "./crypto";

// Sinkronisasi katalog model dari provider hulu (mis. LarpRouter).
// Payload hulu TIDAK disalin mentah: hanya field yang kita kenal yang
// diparsing ke skema katalog sendiri (field asing seperti harga dibuang).
// Model baru otomatis dibuatkan katalog + route ke providernya agar
// langsung bisa dipakai; model yang sudah ada disegarkan metadata
// teknisnya. Nama tampilan yang sudah dikustomisasi admin tidak ditimpa.

type UpstreamModel = {
  id?: unknown;
  display_name?: unknown;
  context_window?: unknown;
  max_output_tokens?: unknown;
  modalities?: { input?: unknown };
  capabilities?: Record<string, unknown>;
  knowledge_cutoff?: unknown;
};

export type SyncResult = {
  providers: number;
  added: number;
  updated: number;
  total: number;
  errors: string[];
};

const MOD_ORDER = ["text", "image", "video", "pdf", "audio"];
const CAP_ORDER = ["reasoning", "tool_call", "structured_output", "attachment"];

function toCsv(values: string[], order: string[]): string | null {
  const set = new Set(values.map((v) => v.toLowerCase()));
  const sorted = order.filter((v) => set.has(v));
  return sorted.length ? sorted.join(",") : null;
}

function numOrUndef(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function strOrUndef(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

export async function syncModelsFromUpstream(): Promise<SyncResult> {
  const result: SyncResult = { providers: 0, added: 0, updated: 0, total: 0, errors: [] };
  const providers = await prisma.provider.findMany({
    where: { isActive: true, autoSync: true },
    include: { upstreamKeys: true },
  });

  for (const provider of providers) {
    const key =
      provider.upstreamKeys.find((k) => k.status === "ACTIVE") ??
      provider.upstreamKeys.find((k) => k.status === "COOLDOWN");
    if (!key) continue;

    let list: UpstreamModel[] = [];
    try {
      const res = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/models`, {
        headers: { authorization: `Bearer ${decryptSecret(key.encryptedKey)}` },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        result.errors.push(`${provider.name}: HTTP ${res.status}`);
        continue;
      }
      const json = (await res.json()) as { data?: UpstreamModel[] };
      list = Array.isArray(json.data) ? json.data : [];
    } catch (e) {
      result.errors.push(`${provider.name}: ${e instanceof Error ? e.message : "gagal mengambil"}`);
      continue;
    }
    result.providers++;

    for (const um of list) {
      const modelId = strOrUndef(um.id);
      if (!modelId) continue;
      result.total++;

      const capsRaw =
        um.capabilities && typeof um.capabilities === "object"
          ? Object.entries(um.capabilities)
              .filter(([, v]) => v === true)
              .map(([k]) => k)
          : [];
      const modsRaw = Array.isArray(um.modalities?.input)
        ? (um.modalities.input as unknown[]).filter((x): x is string => typeof x === "string")
        : [];

      const meta = {
        contextTokens: numOrUndef(um.context_window),
        maxOutputTokens: numOrUndef(um.max_output_tokens),
        inputModalities: modsRaw.length ? toCsv(modsRaw, MOD_ORDER) : undefined,
        capabilities: capsRaw.length ? toCsv(capsRaw, CAP_ORDER) : undefined,
        knowledgeCutoff: strOrUndef(um.knowledge_cutoff),
      };

      const existing = await prisma.modelCatalog.findUnique({ where: { modelId } });
      if (!existing) {
        const created = await prisma.modelCatalog.create({
          data: {
            modelId,
            displayName: strOrUndef(um.display_name) ?? modelId,
            contextTokens: meta.contextTokens ?? null,
            maxOutputTokens: meta.maxOutputTokens ?? null,
            inputModalities: meta.inputModalities ?? null,
            capabilities: meta.capabilities ?? null,
            knowledgeCutoff: meta.knowledgeCutoff ?? null,
          },
        });
        await prisma.modelRoute.create({
          data: { modelId: created.id, providerId: provider.id, upstreamModelId: modelId, priority: 0 },
        });
        result.added++;
      } else {
        await prisma.modelCatalog.update({
          where: { id: existing.id },
          data: {
            ...(meta.contextTokens !== undefined ? { contextTokens: meta.contextTokens } : {}),
            ...(meta.maxOutputTokens !== undefined ? { maxOutputTokens: meta.maxOutputTokens } : {}),
            ...(meta.inputModalities !== undefined ? { inputModalities: meta.inputModalities } : {}),
            ...(meta.capabilities !== undefined ? { capabilities: meta.capabilities } : {}),
            ...(meta.knowledgeCutoff !== undefined ? { knowledgeCutoff: meta.knowledgeCutoff } : {}),
            ...(existing.displayName === existing.modelId && strOrUndef(um.display_name)
              ? { displayName: strOrUndef(um.display_name) }
              : {}),
          },
        });
        await prisma.modelRoute.upsert({
          where: { modelId_providerId: { modelId: existing.id, providerId: provider.id } },
          create: { modelId: existing.id, providerId: provider.id, upstreamModelId: modelId, priority: 0 },
          update: {},
        });
        result.updated++;
      }
    }
  }
  return result;
}
