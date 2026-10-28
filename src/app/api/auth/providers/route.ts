import { connection } from "next/server";
import { oauthEnabled } from "@/lib/oauth";

// Provider OAuth mana saja yang sudah dikonfigurasi admin (untuk tombol di UI).
// connection(): status env harus dibaca saat request, bukan saat build.
export async function GET() {
  await connection();
  return Response.json({
    google: oauthEnabled("google"),
    github: oauthEnabled("github"),
  });
}
