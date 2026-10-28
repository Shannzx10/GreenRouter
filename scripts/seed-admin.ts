import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/crypto";

// Buat/perbarui user admin dari ADMIN_EMAIL + ADMIN_PASSWORD di .env (idempotent).
async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("ADMIN_EMAIL / ADMIN_PASSWORD belum di-set di .env");

  const passwordHash = hashPassword(password);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash, role: "ADMIN" },
  });
  console.log("Admin siap:", email);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
