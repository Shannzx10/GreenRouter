import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { prismaErrorResponse } from "@/lib/api-error";

type Ctx = { params: Promise<{ id: string }> };

const MODALITIES = ["text", "image", "video", "pdf", "audio"];
const CAPABILITIES = ["reasoning", "tool_call", "structured_output", "attachment"];

function toCsv(value: unknown, allowed: string[]): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const items = Array.isArray(value) ? value : String(value).split(",");
  const clean = [...new Set(items.map((s) => String(s).trim().toLowerCase()))].filter((s) =>
    allowed.includes(s),
  );
  return clean.length ? clean.join(",") : null;
}

function toTokenCount(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.displayName !== undefined) {
    if (typeof body.displayName !== "string" || !body.displayName.trim()) {
      return Response.json({ error: "displayName wajib diisi" }, { status: 400 });
    }
    data.displayName = body.displayName.trim();
  }
  const ctx = toTokenCount(body.contextTokens);
  if (ctx !== undefined) data.contextTokens = ctx;
  const maxOut = toTokenCount(body.maxOutputTokens);
  if (maxOut !== undefined) data.maxOutputTokens = maxOut;
  const mods = toCsv(body.inputModalities, MODALITIES);
  if (mods !== undefined) data.inputModalities = mods;
  const caps = toCsv(body.capabilities, CAPABILITIES);
  if (caps !== undefined) data.capabilities = caps;
  if (body.knowledgeCutoff !== undefined) {
    const kc = body.knowledgeCutoff === null ? "" : String(body.knowledgeCutoff).trim();
    if (kc && !/^\d{4}-\d{2}$/.test(kc)) {
      return Response.json({ error: "Format knowledgeCutoff harus YYYY-MM" }, { status: 400 });
    }
    data.knowledgeCutoff = kc || null;
  }
  if (body.earlyAccessUntil !== undefined) {
    if (body.earlyAccessUntil === null || body.earlyAccessUntil === "") {
      data.earlyAccessUntil = null;
    } else {
      const d = new Date(String(body.earlyAccessUntil));
      if (Number.isNaN(d.getTime())) {
        return Response.json({ error: "Format earlyAccessUntil tidak valid" }, { status: 400 });
      }
      data.earlyAccessUntil = d;
    }
  }
  if (Object.keys(data).length === 0) {
    return Response.json({ error: "Tidak ada field yang diubah" }, { status: 400 });
  }

  try {
    const model = await prisma.modelCatalog.update({ where: { id }, data });
    return Response.json({ model });
  } catch (e) {
    const r = prismaErrorResponse(e);
    if (r) return r;
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await prisma.modelCatalog.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    const r = prismaErrorResponse(e);
    if (r) return r;
    throw e;
  }
}
