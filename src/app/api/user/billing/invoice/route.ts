import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getPaddleInstance } from "@/lib/paddle";
import { getActiveSession } from "@/lib/session";

// Mengambil URL invoice PDF Paddle untuk SATU transaksi milik user
// yang sedang masuk, supaya halaman Tagihan bisa mengarahkan user
// langsung ke invoice resminya di Paddle. Id transaksi datang dari
// klien, jadi kepemilikannya selalu diperiksa ulang: customerId pada
// transaksi harus sama dengan customerId user di database kita.
// URL invoice dibuat Paddle per permintaan dan berumur pendek.
export async function POST(req: Request) {
  await connection();
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user?.paddleCustomerId) {
    return NextResponse.json(
      { error: "Kamu belum memiliki riwayat pembayaran." },
      { status: 400 },
    );
  }

  let transactionId = "";
  try {
    const body = (await req.json()) as { transactionId?: unknown } | null;
    if (typeof body?.transactionId === "string") transactionId = body.transactionId;
  } catch {
    transactionId = "";
  }
  if (!transactionId) {
    return NextResponse.json({ error: "Id transaksi wajib diisi." }, { status: 400 });
  }

  try {
    const paddle = getPaddleInstance();
    const txn = await paddle.transactions.get(transactionId);
    if (txn.customerId !== user.paddleCustomerId) {
      return NextResponse.json(
        { error: "Transaksi ini bukan milik akunmu." },
        { status: 403 },
      );
    }
    if (!txn.invoiceId) {
      return NextResponse.json(
        { error: "Invoice belum tersedia untuk pembayaran ini." },
        { status: 400 },
      );
    }
    const pdf = await paddle.transactions.getInvoicePDF(transactionId);
    return NextResponse.json({ url: pdf.url });
  } catch (e) {
    console.error("[paddle] gagal mengambil invoice:", e);
    return NextResponse.json(
      { error: "Invoice sedang tidak tersedia, coba lagi nanti." },
      { status: 502 },
    );
  }
}
