import "dotenv/config";
import { purgeExpiredSuspensions } from "../src/lib/suspension";
import { prisma } from "../src/lib/db";

// Dijalankan watchdog tiap jam: akun yang masa suspendnya sudah lewat 3 hari
// dihapus permanen dan emailnya masuk Blacklist (tidak bisa daftar lagi).
async function main() {
  const n = await purgeExpiredSuspensions();
  console.log(`${new Date().toISOString()} purge suspend: ${n} akun dihapus`);
}

main()
  .catch((e) => {
    console.error("purge suspend gagal total:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
