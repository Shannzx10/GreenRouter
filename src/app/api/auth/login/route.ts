import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { signSession, verifyPassword } from "@/lib/crypto";
import { SESSION_COOKIE } from "@/lib/session";
import { describeProviders, providerSet } from "@/lib/oauth";

// Rem percobaan login: maks 8 kegagalan per (IP, email) dalam 15 menit,
// selebihnya ditolak sementara. In-memory cukup untuk satu proses server;
// melengkapi biaya scrypt yang memang lambat per percobaan.
const failures = new Map<string, number[]>();
const WINDOW_MS = 15 * 60_000;
const MAX_FAIL = 8;

function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local"
  );
}

function throttled(key: string): boolean {
  const now = Date.now();
  const list = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  failures.set(key, list);
  return list.length >= MAX_FAIL;
}

function recordFailure(key: string): void {
  const list = failures.get(key) ?? [];
  list.push(Date.now());
  failures.set(key, list);
}

// Login untuk semua user. Frontend mengarahkan ADMIN ke /admin, USER ke /app.
export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return Response.json({ error: "Email dan password wajib diisi" }, { status: 400 });
  }
  const throttleKey = `${clientIp(req)}|${email}`;
  if (throttled(throttleKey)) {
    return Response.json(
      { error: "Terlalu banyak percobaan masuk. Silakan coba lagi dalam beberapa menit." },
      { status: 429 },
    );
  }
  const user = await prisma.user.findUnique({ where: { email } });
  // Akun OAuth yang belum menyetel password: beri tahu metode yang benar,
  // jangan sekadar "password salah".
  if (user && user.passwordHash.startsWith("oauth:")) {
    const methods = describeProviders(
      providerSet(user).filter((p) => p !== "password"),
    );
    return Response.json(
      {
        error: `Email ini terdaftar lewat ${methods} dan belum punya password. Silakan masuk dengan ${methods}, atau setel password dulu dari halaman Profil setelah masuk.`,
      },
      { status: 401 },
    );
  }
  if (!user || !verifyPassword(password, user.passwordHash)) {
    recordFailure(throttleKey);
    return Response.json({ error: "Email atau password salah" }, { status: 401 });
  }
  // Akun tersuspend BOLEH login: sesinya akan diarahkan ke /suspended.
  failures.delete(throttleKey);
  const token = signSession({ uid: user.id, email: user.email, role: user.role });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
  return Response.json({ ok: true, email: user.email, role: user.role });
}
