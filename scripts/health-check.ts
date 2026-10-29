import "dotenv/config";
import { runModelHealthChecks } from "../src/server/gateway";
import { prisma } from "../src/lib/db";

async function main() {
  const results = await runModelHealthChecks();
  for (const r of results) {
    console.log(
      `${new Date().toISOString()} ${r.ok ? "OK  " : "GAGAL"} ${r.modelId} | ${r.latencyMs} ms${r.error ? ` | ${r.error.slice(0, 120)}` : ""}`,
    );
  }
}

main()
  .catch((e) => {
    console.error("health-check gagal total:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
