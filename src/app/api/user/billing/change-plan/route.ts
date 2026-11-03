import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getPaddleInstance } from "@/lib/paddle";
import { intervalOfPriceId, priceIdForPlan } from "@/lib/plans";
import { getActiveSession } from "@/lib/session";

// Mengganti plan langganan yang SUDAH aktif (mis. Pro ke Max).
// Ini BUKAN checkout baru: langganan yang ada diubah isinya lewat API
// Paddle dengan prorasi seketika, jadi pelanggan tidak pernah punya
// dua langganan dan tidak ditagih ganda. Limit akun berubah sesudah
// webhook subscription.updated tiba, sama seperti jalur checkout.
export async function POST(req: Request) {
  await connection();
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { plan?: string } | null;
  const target = body?.plan;
  if (target !== "pro" && target !== "max") {
    return NextResponse.json({ error: "Plan tujuan tidak dikenal." }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user?.paddleSubscriptionId || !user.paddleSubStatus) {
    return NextResponse.json(
      { error: "Kamu belum memiliki langganan aktif." },
      { status: 400 },
    );
  }
  if (!["active", "trialing", "past_due"].includes(user.paddleSubStatus)) {
    return NextResponse.json(
      { error: "Langgananmu tidak sedang aktif, ganti plan tidak tersedia." },
      { status: 400 },
    );
  }
  if (user.plan === target) {
    return NextResponse.json(
      { error: "Kamu sudah memakai plan ini." },
      { status: 400 },
    );
  }
  try {
    const paddle = getPaddleInstance();
    // Interval penagihan dipertahankan: pelanggan tahunan yang
    // ganti plan tetap ditagih tahunan, begitu juga bulanan.
    // Interval dibaca dari price id langganan yang sedang berjalan.
    const current = await paddle.subscriptions.get(user.paddleSubscriptionId);
    const interval = intervalOfPriceId(current.items[0]?.price?.id);
    const priceId = priceIdForPlan(target, interval);
    if (!priceId) {
      return NextResponse.json(
        { error: "Plan belum tersedia untuk dibeli." },
        { status: 503 },
      );
    }
    await paddle.subscriptions.update(user.paddleSubscriptionId, {
      items: [{ priceId, quantity: 1 }],
      prorationBillingMode: "prorated_immediately",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[paddle] gagal ganti plan:", e);
    return NextResponse.json(
      { error: "Ganti plan gagal diproses, coba lagi nanti." },
      { status: 502 },
    );
  }
}
