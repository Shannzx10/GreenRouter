import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signSession } from "@/lib/crypto";
import { SESSION_COOKIE, getSession } from "@/lib/session";
import { DEFAULT_REQUEST_LIMIT_HOURLY, DEFAULT_TOKEN_LIMIT } from "@/lib/quota";

// Login OAuth (Google & GitHub) tanpa library tambahan.
// Satu email = satu akun. Setiap akun mencatat metode masuknya
// (User.authProviders, mis. "google" atau "google,password"): masuk dengan
// metode yang belum terdaftar untuk email itu DITOLAK dengan info metode
// yang benar — bukan diam-diam digabung, bukan pula akun duplikat.
// Metode tambahan bisa dihubungkan dari halaman Profil (mode link).

export type OAuthProviderName = "google" | "github";

const STATE_COOKIE = "gr_oauth_state";

export function appUrl(): string {
  return (process.env.APP_URL ?? "https://www.greenrouter.eu.cc").replace(/\/+$/, "");
}

function creds(provider: OAuthProviderName): { id: string; secret: string } | null {
  const id =
    provider === "google" ? process.env.GOOGLE_CLIENT_ID : process.env.GITHUB_CLIENT_ID;
  const secret =
    provider === "google"
      ? process.env.GOOGLE_CLIENT_SECRET
      : process.env.GITHUB_CLIENT_SECRET;
  if (!id || !secret) return null;
  return { id, secret };
}

export function oauthEnabled(provider: OAuthProviderName): boolean {
  return creds(provider) !== null;
}

function redirectUri(provider: OAuthProviderName): string {
  return `${appUrl()}/api/auth/${provider}/callback`;
}

// ---------- Metode masuk (authProviders) ----------
export function providerLabel(p: string): string {
  return p === "google"
    ? "Google"
    : p === "github"
      ? "GitHub"
      : p === "password"
        ? "email+password"
        : p;
}

export function providerSet(user: { authProviders: string }): string[] {
  return user.authProviders
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function describeProviders(set: string[]): string {
  return set.map(providerLabel).join(" / ");
}

function fail(message: string, to = "/login"): NextResponse {
  const res = NextResponse.redirect(
    `${appUrl()}${to}?error=${encodeURIComponent(message)}`,
  );
  res.cookies.delete(STATE_COOKIE);
  return res;
}

// ---------- Langkah 1: arahkan user ke provider ----------
// linkUid diisi = mode hubungkan akun (dari Profil, user sudah login).
export function startOAuth(
  provider: OAuthProviderName,
  linkUid?: string,
): NextResponse {
  const c = creds(provider);
  if (!c) return fail("Login OAuth belum dikonfigurasi admin");
  const state = randomBytes(16).toString("hex");
  const mode = linkUid ? `link:${linkUid}` : "login";
  const params = new URLSearchParams({
    client_id: c.id,
    redirect_uri: redirectUri(provider),
    response_type: "code",
    state,
  });
  let url: string;
  if (provider === "google") {
    params.set("scope", "openid email profile");
    params.set("prompt", "select_account");
    url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  } else {
    params.set("scope", "read:user user:email");
    url = `https://github.com/login/oauth/authorize?${params}`;
  }
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, `${provider}:${state}:${mode}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}

// ---------- Langkah 2: callback dari provider ----------
type OAuthProfile = {
  email: string;
  name: string | null;
  image: string | null;
  verified: boolean;
};

async function exchangeAndFetchProfile(
  provider: OAuthProviderName,
  code: string,
): Promise<OAuthProfile> {
  const c = creds(provider);
  if (!c) throw new Error("not configured");
  const tokenRes = await fetch(
    provider === "google"
      ? "https://oauth2.googleapis.com/token"
      : "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: c.id,
        client_secret: c.secret,
        code,
        redirect_uri: redirectUri(provider),
        ...(provider === "google" ? { grant_type: "authorization_code" } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    },
  );
  const tokenData = (await tokenRes.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!tokenRes.ok || !tokenData.access_token) {
    console.error(
      `[oauth:${provider}] token exchange gagal: HTTP ${tokenRes.status} ${JSON.stringify(tokenData).slice(0, 400)}`,
    );
    throw new Error("token exchange failed");
  }
  const token = tokenData.access_token;

  if (provider === "google") {
    const r = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) {
      console.error(`[oauth:google] userinfo gagal: HTTP ${r.status}`);
      throw new Error("userinfo failed");
    }
    const p = (await r.json()) as {
      email?: string;
      name?: string;
      picture?: string;
      email_verified?: boolean;
    };
    return {
      email: (p.email ?? "").toLowerCase(),
      name: p.name ?? null,
      image: p.picture ?? null,
      verified: p.email_verified === true,
    };
  }

  const headers = {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "user-agent": "GreenRouter",
  };
  const emailsRes = await fetch("https://api.github.com/user/emails", {
    headers,
    signal: AbortSignal.timeout(20_000),
  });
  if (!emailsRes.ok) throw new Error("emails failed");
  const emails = (await emailsRes.json()) as {
    email: string;
    primary: boolean;
    verified: boolean;
  }[];
  const chosen = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
  if (!chosen) throw new Error("no verified email");
  const userRes = await fetch("https://api.github.com/user", {
    headers,
    signal: AbortSignal.timeout(20_000),
  });
  const u = userRes.ok
    ? ((await userRes.json()) as { name?: string; login?: string; avatar_url?: string })
    : {};
  return {
    email: chosen.email.toLowerCase(),
    name: u.name ?? u.login ?? null,
    image: u.avatar_url ?? null,
    verified: true,
  };
}

export async function finishOAuth(
  provider: OAuthProviderName,
  req: Request,
): Promise<NextResponse> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");

  const store = await cookies();
  const saved = store.get(STATE_COOKIE)?.value ?? "";
  const [savedProvider, savedState, modeRaw] = saved.split(":");
  const isLink = modeRaw === "link";
  const linkUid = isLink ? saved.split(":")[3] : undefined;
  const backTo = isLink ? "/app/profile" : "/login";

  if (
    providerError ||
    !code ||
    !state ||
    savedProvider !== provider ||
    savedState !== state
  ) {
    return fail("Login dibatalkan atau sesi OAuth tidak valid. Coba lagi.", backTo);
  }

  let profile: OAuthProfile;
  try {
    profile = await exchangeAndFetchProfile(provider, code);
  } catch (e) {
    console.error(`[oauth:${provider}] exchange/profile gagal:`, e);
    return fail("Gagal menghubungi provider login. Coba lagi sebentar.", backTo);
  }
  if (!profile.email || !profile.verified) {
    return fail("Email dari provider belum terverifikasi.", backTo);
  }

  // ----- Mode hubungkan akun (dari halaman Profil) -----
  if (isLink) {
    const session = await getSession();
    if (!session || session.uid !== linkUid) {
      return fail("Sesi hubungkan akun tidak valid. Coba lagi.", "/app/profile");
    }
    const me = await prisma.user.findUnique({ where: { id: linkUid } });
    if (!me) return fail("Akun tidak ditemukan.", "/app/profile");
    if (profile.email !== me.email) {
      return fail(
        `Email akun ${providerLabel(provider)} itu (${profile.email}) berbeda dengan email akunmu (${me.email}). Hubungkan akun dengan email yang sama.`,
        "/app/profile",
      );
    }
    const set = providerSet(me);
    if (!set.includes(provider)) set.push(provider);
    await prisma.user.update({
      where: { id: me.id },
      data: {
        authProviders: set.join(","),
        image: profile.image ?? me.image,
        name: me.name ?? profile.name,
      },
    });
    const res = NextResponse.redirect(`${appUrl()}/app/profile?linked=${provider}`);
    res.cookies.delete(STATE_COOKIE);
    return res;
  }

  // ----- Mode login / daftar -----
  let user = await prisma.user.findUnique({ where: { email: profile.email } });
  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          image: profile.image,
          authProviders: provider,
          role: "USER",
          // Akun baru: kuota awal per siklus 7 hari + batas request per jam.
          tokenLimit: DEFAULT_TOKEN_LIMIT,
          requestLimitHourly: DEFAULT_REQUEST_LIMIT_HOURLY,
          // Password acak yang tidak diketahui siapa pun; user bisa menyetel
          // password sungguhan dari halaman Profil (prefix "oauth:" penandanya).
          passwordHash: `oauth:${hashPassword(randomBytes(24).toString("hex"))}`,
        },
      });
    } catch (e) {
      // Balapan dua login pertama yang bersamaan: salah satu create kena
      // unique email (P2002) — ambil akun yang baru dibuat itu, jangan duplikat.
      if ((e as { code?: string }).code !== "P2002") throw e;
      user = await prisma.user.findUniqueOrThrow({ where: { email: profile.email } });
    }
  } else {
    const set = providerSet(user);
    if (!set.includes(provider)) {
      return fail(
        `Email ini terdaftar lewat ${describeProviders(set)}. Silakan masuk dengan ${describeProviders(set)}.`,
      );
    }
    // Segarkan foto profil & nama dari provider.
    const patch: { image?: string; name?: string } = {};
    if (profile.image && profile.image !== user.image) patch.image = profile.image;
    if (!user.name && profile.name) patch.name = profile.name;
    if (Object.keys(patch).length > 0) {
      user = await prisma.user.update({ where: { id: user.id }, data: patch });
    }
  }
  if (!user.isActive) {
    return fail("Akun dinonaktifkan. Hubungi admin.");
  }

  const token = signSession({ uid: user.id, email: user.email, role: user.role });
  const res = NextResponse.redirect(`${appUrl()}${user.role === "ADMIN" ? "/admin" : "/app"}`);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
  res.cookies.delete(STATE_COOKIE);
  return res;
}
