import { getAdminSession } from "@/lib/session";
import { syncModelsFromUpstream } from "@/lib/model-sync";

// POST /api/admin/models/sync — tarik daftar model dari provider hulu,
// tambahkan yang baru ke katalog (sekaligus route-nya) dan segarkan
// metadata yang sudah ada. Logika yang sama dijalankan berkala oleh
// watchdog lewat scripts/sync-models.ts.
export async function POST() {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncModelsFromUpstream();
  return Response.json(result);
}
