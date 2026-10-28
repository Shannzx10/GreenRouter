import { cookies } from "next/headers";
import { verifySession, type Session } from "./crypto";
import { prisma } from "./db";

export const SESSION_COOKIE = "gr_session";

// Sesi login apa pun yang valid (user biasa maupun admin). Selain memeriksa
// tanda tangan token, status akun SELALU disegarkan dari database: akun
// yang dinonaktifkan/dihapus admin atau role-nya diubah berlaku seketika,
// tidak menunggu token kedaluwarsa (maks 7 hari).
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const s = verifySession(store.get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    select: { email: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return { ...s, email: user.email, role: user.role };
}

// Khusus admin: sesi harus ber-role ADMIN.
export async function getAdminSession(): Promise<Session | null> {
  const s = await getSession();
  return s && s.role === "ADMIN" ? s : null;
}
