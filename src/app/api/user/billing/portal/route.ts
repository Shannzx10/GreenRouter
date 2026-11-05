import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getPaddleInstance } from "@/lib/paddle";
import { getActiveSession } from "@/lib/session";

// Menukar sesi portal pelanggan Paddle untuk user yang sedang masuk.
// URL portal berumur pendek dan memuat akses mengelola langganan user
// itu sendiri (ganti metode pembayaran, batalkan, unduh invoice),
// jadi endpoint ini selalu memeriksa sesi aktif lebih dulu.
export async function POST() {
  await connection();
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user?.paddleCustomerId) {
    return NextResponse.json(
      { error: "Kamu belum memiliki langganan berbayar." },
      { status: 400 },
    );
  }
  try {
    const paddle = getPaddleInstance();
    const portal = await paddle.customerPortalSessions.create(
      user.paddleCustomerId,
      user.paddleSubscriptionId ? [user.paddleSubscriptionId] : [],
    );
    return NextResponse.json({ url: portal.urls.general.overview });
  } catch (e) {
    console.error("[paddle] gagal membuat sesi portal:", e);
    return NextResponse.json(
      { error: "Portal pelanggan sedang tidak tersedia, coba lagi nanti." },
      { status: 502 },
    );
  }
}
