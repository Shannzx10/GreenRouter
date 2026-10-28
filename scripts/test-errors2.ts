import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { encryptSecret, generateClientKey } from "../src/lib/crypto";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const MARKER = "RAW-HULU-JANGAN-BOCOR";

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("Admin tidak ditemukan");

  const provider = await prisma.provider.create({
    data: { name: "STUB-UJI-2", baseUrl: "http://127.0.0.1:8899/v1", isActive: true },
  });
  const upKey = await prisma.upstreamKey.create({
    data: {
      providerId: provider.id,
      label: "Key Stub 2",
      encryptedKey: encryptSecret("stub-secret-2"),
      keyHint: "stub2-…",
    },
  });
  const modelIds = ["stub-fail-409", "stub-fail-503"];
  for (const mid of modelIds) {
    const cat = await prisma.modelCatalog.create({
      data: { modelId: mid, displayName: `Stub ${mid}` },
    });
    await prisma.modelRoute.create({
      data: { modelId: cat.id, providerId: provider.id, upstreamModelId: mid, priority: 0 },
    });
  }
  const gen = generateClientKey();
  const clientKey = await prisma.apiKey.create({
    data: { name: "Key Uji Error 2", keyHash: gen.hash, prefix: gen.prefix, userId: admin.id },
  });

  const chat = async (model: string) => {
    const r = await fetch("http://127.0.0.1:7777/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${gen.full}`, "content-type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: "halo" }] }),
    });
    return { status: r.status, text: await r.text() };
  };
  const keyStatus = async () =>
    (await prisma.upstreamKey.findUnique({ where: { id: upKey.id } }))?.status;

  try {
    const r409 = await chat("stub-fail-409");
    console.log(
      "1) 409 replay dipetakan ke pesan sendiri:",
      r409.status === 409 && r409.text.includes("sudah pernah diproses") && !r409.text.includes(MARKER)
        ? "LOLOS"
        : `GAGAL (${r409.status}: ${r409.text.slice(0, 120)})`,
    );
    console.log("2) key tetap ACTIVE setelah 409:", (await keyStatus()) === "ACTIVE" ? "LOLOS" : "GAGAL");

    const r503 = await chat("stub-fail-503");
    console.log(
      "3) 503 hulu menjadi 503 tidak tersedia, tanpa badan mentah:",
      r503.status === 503 && r503.text.includes("tidak tersedia") && !r503.text.includes(MARKER)
        ? "LOLOS"
        : `GAGAL (${r503.status}: ${r503.text.slice(0, 120)})`,
    );
    console.log("4) key tetap ACTIVE setelah 503:", (await keyStatus()) === "ACTIVE" ? "LOLOS" : "GAGAL");
  } finally {
    await prisma.usageLog.deleteMany({ where: { modelId: { in: modelIds } } });
    await prisma.apiKey.delete({ where: { id: clientKey.id } }).catch(() => {});
    await prisma.provider.delete({ where: { id: provider.id } }).catch(() => {});
    await prisma.modelCatalog.deleteMany({ where: { modelId: { in: modelIds } } }).catch(() => {});
    console.log("data uji dibersihkan");
  }
}

main()
  .catch((e) => {
    console.error("GAGAL:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
