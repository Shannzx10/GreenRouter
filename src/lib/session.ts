import { cookies } from "next/headers";
import { verifySession, type Session } from "./crypto";

export const SESSION_COOKIE = "gr_session";

// Sesi login apa pun yang valid (user biasa maupun admin).
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

// Khusus admin: sesi harus ber-role ADMIN.
export async function getAdminSession(): Promise<Session | null> {
  const s = await getSession();
  return s && s.role === "ADMIN" ? s : null;
}
