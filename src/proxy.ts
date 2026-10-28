import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/crypto";

// Cek optimistis: /admin/* dan /app/* wajib punya cookie sesi.
// Verifikasi tanda tangan + role tetap dilakukan di server (layout + API).
// Sebaliknya /login dan /register tidak untuk yang sudah login: sesi valid
// langsung dilempar ke areanya (cek sesi penuh di sini karena halaman login
// sendiri bisa tersaji dari shell statis).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has("gr_session");

  if (pathname === "/login" || pathname === "/register") {
    const s = verifySession(request.cookies.get("gr_session")?.value);
    if (s) {
      const url = request.nextUrl.clone();
      url.pathname = s.role === "ADMIN" ? "/admin" : "/app";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/app")) {
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/app/:path*", "/login", "/register"],
};
