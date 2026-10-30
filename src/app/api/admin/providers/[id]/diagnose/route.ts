import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { decryptSecret } from "@/lib/crypto";

function authOf(encrypted: string): string {
  return "Bearer ".concat(decryptSecret(encrypted));
}

// Diagnosis langsung satu provider: untuk SETIAP key, ambil daftar model
// yang benar-benar dilayani key itu (isi pool-nya), lalu untuk SETIAP route
// kirim satu chat kecil memakai key yang pool-nya memuat model tersebut.
// Hasil chat ditulis sebagai ModelHealthCheck (sama seperti tes kesehatan
// harian), TIDAK menulis UsageLog dan tidak mengubah status key.
type Ctx = { params: Promise<{ id: string }> };

function errSnippet(body: string): string {
  try {
    const j = JSON.parse(body) as { error?: { message?: string } | string };
    if (typeof j.error === "string") return j.error.slice(0, 160);
    if (j.error?.message) return j.error.message.slice(0, 160);
  } catch {}
  return body.slice(0, 160);
}

export async function POST(_req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const provider = await prisma.provider.findUnique({
    where: { id },
    include: {
      upstreamKeys: { orderBy: { createdAt: "asc" } },
      routes: {
        where: { isActive: true },
        include: { model: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!provider) return Response.json({ error: "Provider tidak ditemukan" }, { status: 404 });
  const base = provider.baseUrl.replace(/\/$/, "");

  type KeyResult = {
    keyId: string;
    label: string;
    status: string;
    ok: boolean;
    httpStatus: number;
    latencyMs: number;
    modelIds: string[];
    error?: string;
  };
  const keyResults: KeyResult[] = [];
  for (const k of provider.upstreamKeys) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${base}/models`, {
        headers: { authorization: authOf(k.encryptedKey) },
        signal: AbortSignal.timeout(20_000),
      });
      const text = await res.text();
      let modelIds: string[] = [];
      if (res.ok) {
        try {
          const j = JSON.parse(text) as { data?: { id: string }[] };
          modelIds = (j.data ?? []).map((m) => m.id).slice(0, 60);
        } catch {}
      }
      keyResults.push({
        keyId: k.id,
        label: k.label,
        status: k.status,
        ok: res.ok,
        httpStatus: res.status,
        latencyMs: Date.now() - t0,
        modelIds,
        error: res.ok ? undefined : errSnippet(text),
      });
    } catch (e) {
      keyResults.push({
        keyId: k.id,
        label: k.label,
        status: k.status,
        ok: false,
        httpStatus: 0,
        latencyMs: Date.now() - t0,
        modelIds: [],
        error: e instanceof Error ? e.message.slice(0, 160) : "network error",
      });
    }
  }

  const routeResults = [];
  for (const r of provider.routes) {
    // Key yang pool-nya terbukti memuat model ini; bila daftar model semua
    // key gagal diambil, pakai key ACTIVE pertama sebagai cadangan.
    const matched = keyResults.find((kr) => kr.ok && kr.modelIds.includes(r.upstreamModelId));
    const fallback =
      keyResults.find((kr) => kr.status === "ACTIVE") ?? keyResults[0];
    const chosen = matched ?? fallback;
    const keyRow = provider.upstreamKeys.find((k) => k.id === chosen?.keyId);
    if (!chosen || !keyRow) {
      routeResults.push({
        modelId: r.model.modelId,
        displayName: r.model.displayName,
        upstreamModelId: r.upstreamModelId,
        keyLabel: null,
        ok: false,
        httpStatus: 0,
        latencyMs: 0,
        error: "Tidak ada key untuk dites",
      });
      continue;
    }
    const t0 = Date.now();
    let ok = false;
    let httpStatus = 0;
    let error: string | undefined;
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: authOf(keyRow.encryptedKey),
        },
        body: JSON.stringify({
          model: r.upstreamModelId,
          messages: [{ role: "user", content: "Halo" }],
          max_tokens: 16,
        }),
        signal: AbortSignal.timeout(45_000),
      });
      httpStatus = res.status;
      const text = await res.text();
      ok = res.ok;
      if (!ok) error = errSnippet(text);
    } catch (e) {
      error = e instanceof Error ? e.message.slice(0, 160) : "network error";
    }
    const latencyMs = Date.now() - t0;
    try {
      await prisma.modelHealthCheck.create({
        data: {
          modelId: r.model.modelId,
          status: ok ? "SUCCESS" : "ERROR",
          latencyMs,
          error: ok ? null : (error ?? "gagal").slice(0, 200),
        },
      });
    } catch {}
    routeResults.push({
      modelId: r.model.modelId,
      displayName: r.model.displayName,
      upstreamModelId: r.upstreamModelId,
      keyLabel: keyRow.label,
      ok,
      httpStatus,
      latencyMs,
      error,
    });
  }

  return Response.json({ ranAt: new Date().toISOString(), keys: keyResults, routes: routeResults });
}
