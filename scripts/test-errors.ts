import "dotenv/config";
import { readFileSync } from "node:fs";
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
    data: { name: "STUB-UJI", baseUrl: "http://127.0.0.1:8899/v1", isActive: true },
  });
  const upKey = await prisma.upstreamKey.create({
    data: {
      providerId: provider.id,
      label: "Key Stub",
      encryptedKey: encryptSecret("stub-secret-key"),
      keyHint: "stub-…",
    },
  });
  const modelIds = ["stub-ok", "stub-fail-400", "stub-fail-402"];
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
    data: { name: "Key Uji Error", keyHash: gen.hash, prefix: gen.prefix, userId: admin.id },
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
  const hits = () => JSON.parse(readFileSync("/tmp/stub-hits.json", "utf8")) as Record<string, number>;

  try {
    const ok = await chat("stub-ok");
    console.log("1) sukses 200:", ok.status === 200 && ok.text.includes("Balasan stub OK") ? "LOLOS" : `GAGAL (${ok.status})`);

    const bad = await chat("stub-fail-400");
    console.log(
      "2) 400 dipetakan ke pesan sendiri, tanpa badan mentah:",
      bad.status === 400 && bad.text.includes("Request tidak valid") && !bad.text.includes(MARKER)
        ? "LOLOS"
        : `GAGAL (${bad.status}: ${bad.text.slice(0, 120)})`,
    );
    console.log("3) key tetap ACTIVE setelah 400:", (await keyStatus()) === "ACTIVE" ? "LOLOS" : "GAGAL");

    const lim = await chat("stub-fail-402");
    console.log(
      "4) 402 menjadi 503 pesan sendiri, tanpa badan mentah:",
      lim.status === 503 && lim.text.includes("tidak tersedia") && !lim.text.includes(MARKER)
        ? "LOLOS"
        : `GAGAL (${lim.status}: ${lim.text.slice(0, 120)})`,
    );
    console.log("5) key berubah LIMITED setelah 402:", (await keyStatus()) === "LIMITED" ? "LOLOS" : `GAGAL (${await keyStatus()})`);

    const hitsBefore = hits()["stub-fail-402"] ?? 0;
    const again = await chat("stub-fail-402");
    const hitsAfter = hits()["stub-fail-402"] ?? 0;
    console.log(
      "6) key LIMITED tidak dipakai lagi (stub tidak dihit lagi):",
      hitsAfter === hitsBefore ? `LOLOS (status klien ${again.status})` : "GAGAL",
    );
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
