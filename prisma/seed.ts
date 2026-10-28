// Seed awal GreenRouter: provider LarpRouter + 1 key hulu (terenkripsi)
// + katalog model yang ditarik langsung dari GET {baseURL}/models.
//
// Jalankan: SEED_LARPROUTER_KEY=<key> npx tsx prisma/seed.ts
import "dotenv/config";
import { createCipheriv, randomBytes } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const BASE_URL = process.env.SEED_LARPROUTER_BASE_URL ?? "https://larprouter.com/v1";
const API_KEY = process.env.SEED_LARPROUTER_KEY;

if (!API_KEY) throw new Error("SEED_LARPROUTER_KEY belum di-set");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum di-set");
if (!process.env.ENCRYPTION_KEY) throw new Error("ENCRYPTION_KEY belum di-set");

function encrypt(plain: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString("base64")).join(".");
}

type ModelInfo = { id: string; name?: string };

// Snapshot katalog per 27 Okt 2026 — cadangan bila fetch live gagal (mis.
// kredensial proxy basi saat restore pasca VM-replace), supaya seed tetap
// bisa berjalan tanpa jaringan. Seed bersifat idempotent.
const FALLBACK_MODELS: ModelInfo[] = [
  { id: "deepseek-v4.1-flash" },
  { id: "deepseek-v4.1-flash-fast" },
  { id: "deepseek-v4.1-flash-1017-abliterated" },
  { id: "deepseek-v4.1-flash-1017-non-abliterated" },
  { id: "glm-5.3" },
  { id: "glm-5.3-flash" },
  { id: "minimax-m3.1-flash" },
];

async function fetchModels(): Promise<ModelInfo[]> {
  try {
    const res = await fetch(`${BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    if (!res.ok) throw new Error(`GET /models gagal: HTTP ${res.status}`);
    const json = (await res.json()) as { data?: ModelInfo[] };
    if (!json.data?.length) throw new Error("Daftar model kosong dari provider");
    return json.data;
  } catch (e) {
    console.warn(
      "Fetch katalog live gagal, pakai snapshot cadangan:",
      e instanceof Error ? e.message : e,
    );
    return FALLBACK_MODELS;
  }
}

async function main() {
  const models = await fetchModels();
  console.log(`Provider membalas ${models.length} model.`);

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const provider = await prisma.provider.upsert({
    where: { name: "LarpRouter" },
    update: { baseUrl: BASE_URL, isActive: true },
    create: { name: "LarpRouter", baseUrl: BASE_URL },
  });

  const keyHint = `${API_KEY!.slice(0, 5)}…${API_KEY!.slice(-4)}`;
  const existingKey = await prisma.upstreamKey.findFirst({
    where: { providerId: provider.id, keyHint },
  });
  if (!existingKey) {
    await prisma.upstreamKey.create({
      data: {
        providerId: provider.id,
        label: "LarpRouter #1",
        encryptedKey: encrypt(API_KEY!),
        keyHint,
      },
    });
    console.log("UpstreamKey dibuat:", keyHint);
  } else {
    console.log("UpstreamKey sudah ada:", keyHint);
  }

  let routed = 0;
  for (const m of models) {
    const catalog = await prisma.modelCatalog.upsert({
      where: { modelId: m.id },
      update: {},
      create: { modelId: m.id, displayName: m.name ?? m.id },
    });
    await prisma.modelRoute.upsert({
      where: {
        modelId_providerId: { modelId: catalog.id, providerId: provider.id },
      },
      update: { upstreamModelId: m.id, isActive: true },
      create: {
        modelId: catalog.id,
        providerId: provider.id,
        upstreamModelId: m.id,
      },
    });
    routed++;
  }
  console.log(`Katalog + routing terpasang untuk ${routed} model.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
