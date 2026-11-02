import { cookies } from "next/headers";
import { verifySession, type Session } from "./crypto";
import { prisma } from "./db";

export const SESSION_COOKIE = "gr_session";

export type SessionWithStatus = Session & { suspended: boolean };

// Sesi login apa pun yang valid (user biasa maupun admin). Selain memeriksa
// tanda tangan token, status akun SELALU disegarkan dari database: akun
// yang dihapus admin atau role-nya diubah berlaku seketika, tidak menunggu
// token kedaluwarsa (maks 7 hari). Akun TERSUSPEND tetap dapat sesi (dengan
// flag suspended) supaya bisa diarahkan ke halaman /suspended dan logout;
// gerbangnya ada di layout /app dan /admin serta getActiveSession di bawah.
export async function getSession(): Promise<SessionWithStatus | null> {
  const store = await cookies();
  const s = verifySession(store.get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    select: { email: true, role: true, suspendedAt: true },
  });
  if (!user) return null;
  return { ...s, email: user.email, role: user.role, suspended: user.suspendedAt !== null };
}

// Sesi untuk aktivitas normal: user tersuspend dianggap tidak login.
export async function getActiveSession(): Promise<SessionWithStatus | null> {
  const s = await getSession();
  return s && !s.suspended ? s : null;
}

// Khusus admin: sesi harus ber-role ADMIN dan tidak tersuspend.
export async function getAdminSession(): Promise<Session | null> {
  const s = await getActiveSession();
  return s && s.role === "ADMIN" ? s : null;
}
