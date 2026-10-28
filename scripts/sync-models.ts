import "dotenv/config";
import { syncModelsFromUpstream } from "../src/lib/model-sync";

// Dijalankan berkala oleh watchdog (maks sekali per 6 jam) dan bisa juga
// manual: npx tsx scripts/sync-models.ts
async function main() {
  const r = await syncModelsFromUpstream();
  console.log(new Date().toISOString(), JSON.stringify(r));
}

main().catch((e) => {
  console.error("sync-models GAGAL:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
