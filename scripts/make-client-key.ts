import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generateClientKey } from "../src/lib/crypto";

// Buat satu key klien dan cetak nilai penuhnya (hanya saat pembuatan ini).
async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  const name = process.argv[2] ?? "Key Uji";
  const { full, prefix, hash } = generateClientKey();
  await prisma.apiKey.create({ data: { name, keyHash: hash, prefix } });
  console.log(full);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
