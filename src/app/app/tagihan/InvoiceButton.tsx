import { FileText } from "lucide-react";

// Tautan Lihat Invoice per baris riwayat pembayaran. Membuka endpoint
// invoice kita di tab baru; server di sana memeriksa kepemilikan
// transaksi lalu meneruskan PDF resmi Paddle dengan header tampil
// (bukan unduh), lihat api/user/billing/invoice/[id].
export default function InvoiceButton({ transactionId }: { transactionId: string }) {
  return (
    <a
      href={`/api/user/billing/invoice/${transactionId}`}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-lime-300/90 outline-none transition hover:text-lime-200 focus-visible:ring-2 focus-visible:ring-lime-300/60"
    >
      <FileText size={13} />
      Lihat Invoice
    </a>
  );
}
