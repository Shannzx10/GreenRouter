import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getPaddleInstance } from "@/lib/paddle";
import { getActiveSession } from "@/lib/session";

// GET /api/user/billing/invoice/[id] — menampilkan invoice PDF resmi
// Paddle milik user yang sedang masuk, langsung di browser.
//
// Dua hal yang dijaga:
// 1. Kepemilikan: id transaksi berasal dari URL, jadi selalu diperiksa
//    ulang ke Paddle, customerId transaksi harus sama dengan milik
//    user di database kita.
// 2. Cara tampil: berkas invoice di server Paddle dikirim dengan
//    header Content-Disposition "attachment", yang memaksa browser
//    mengunduhnya. Karena itu PDF-nya diteruskan lewat server ini
//    dengan disposition "inline" supaya terbuka di penampil PDF
//    browser. Isi berkasnya persis invoice resmi Paddle, tidak diubah.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await connection();
  const session = await getActiveSession();
  if (!session) {
    return Response.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user?.paddleCustomerId) {
    return Response.json(
      { error: "Kamu belum memiliki riwayat pembayaran." },
      { status: 400 },
    );
  }

  const { id } = await params;
  try {
    const paddle = getPaddleInstance();
    const txn = await paddle.transactions.get(id);
    if (txn.customerId !== user.paddleCustomerId) {
      return Response.json(
        { error: "Transaksi ini bukan milik akunmu." },
        { status: 403 },
      );
    }
    if (!txn.invoiceId) {
      return Response.json(
        { error: "Invoice belum tersedia untuk pembayaran ini." },
        { status: 400 },
      );
    }
    const pdf = await paddle.transactions.getInvoicePDF(id);
    const file = await fetch(pdf.url);
    if (!file.ok) throw new Error(`Unduh invoice gagal: ${file.status}`);
    const bytes = await file.arrayBuffer();
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${txn.invoiceNumber ?? id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[paddle] gagal menampilkan invoice:", e);
    return Response.json(
      { error: "Invoice sedang tidak tersedia, coba lagi nanti." },
      { status: 502 },
    );
  }
}
