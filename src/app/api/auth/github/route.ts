import { connection } from "next/server";
import { startOAuth } from "@/lib/oauth";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  await connection();
  // ?link=1 = hubungkan ke akun yang sedang login (dari halaman Profil).
  let linkUid: string | undefined;
  if (new URL(req.url).searchParams.get("link") === "1") {
    const s = await getSession();
    if (s) linkUid = s.uid;
  }
  return startOAuth("github", linkUid);
}
