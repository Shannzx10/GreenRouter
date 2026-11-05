import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getPaddleInstance } from "@/lib/paddle";
import { intervalOfPriceId, planById, planByPriceId } from "@/lib/plans";
import { PageHeader, PANEL, Pill } from "../ui";

// Halaman Tagihan: status langganan berjalan dari cerminan database,
// plus riwayat pembayaran yang dibaca langsung dari Paddle saat
// halaman dibuka (tidak disimpan di database kita). Kegagalan membaca
// Paddle hanya mengosongkan riwayatnya, halaman tetap tampil.

type TxnRow = {
  id: string;
  date: Date;
  label: string;
  invoiceNumber: string | null;
  amount: string;
  status: string;
};

const TXN_STATUS: Record<string, { label: string; cls: string }> = {
  completed: { label: "Lunas", cls: "bg-lime-400/10 text-lime-300" },
  paid: { label: "Lunas", cls: "bg-lime-400/10 text-lime-300" },
  billed: { label: "Menunggu pembayaran", cls: "bg-amber-400/10 text-amber-300" },
  ready: { label: "Menunggu pembayaran", cls: "bg-amber-400/10 text-amber-300" },
  past_due: { label: "Pembayaran gagal", cls: "bg-red-500/15 text-red-300" },
  canceled: { label: "Dibatalkan", cls: "bg-white/[0.06] text-zinc-400" },
  draft: { label: "Draf", cls: "bg-white/[0.06] text-zinc-400" },
};

const SUB_STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Aktif", cls: "bg-lime-400/10 text-lime-300" },
  trialing: { label: "Uji coba", cls: "bg-lime-400/10 text-lime-300" },
  past_due: { label: "Pembayaran tertunda", cls: "bg-red-500/15 text-red-300" },
  paused: { label: "Dijeda", cls: "bg-amber-400/10 text-amber-300" },
  canceled: { label: "Berakhir", cls: "bg-white/[0.06] text-zinc-400" },
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString("id-ID", { dateStyle: "long" });
}

function fmtMoney(minorUnits: string | undefined, currency: string): string {
  const amount = Number(minorUnits ?? "0") / 100;
  try {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("id-ID")}`;
  }
}

export default async function TagihanPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: {
      plan: true,
      paddleCustomerId: true,
      paddleSubscriptionId: true,
      paddleSubStatus: true,
      paddleCancelAt: true,
    },
  });
  if (!user) redirect("/login");

  let nextBilledAt: Date | null = null;
  const txns: TxnRow[] = [];
  let historyFailed = false;

  if (user.paddleCustomerId && process.env.PADDLE_API_KEY) {
    try {
      const paddle = getPaddleInstance();
      if (user.paddleSubscriptionId) {
        const sub = await paddle.subscriptions.get(user.paddleSubscriptionId);
        if (sub.nextBilledAt) nextBilledAt = new Date(sub.nextBilledAt);
      }
      for await (const t of paddle.transactions.list({
        customerId: [user.paddleCustomerId],
        perPage: 25,
      })) {
        const priceId = t.items[0]?.price?.id;
        const plan = planByPriceId(priceId);
        const label = plan
          ? `${plan.name}, ${intervalOfPriceId(priceId) === "yearly" ? "Tahunan" : "Bulanan"}`
          : "Langganan GreenRouter";
        txns.push({
          id: t.id,
          date: new Date(t.billedAt ?? t.createdAt),
          label,
          invoiceNumber: t.invoiceNumber,
          amount: fmtMoney(t.details?.totals?.total ?? t.details?.totals?.grandTotal, t.currencyCode),
          status: t.status,
        });
        if (txns.length >= 25) break;
      }
      txns.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch {
      historyFailed = true;
    }
  }

  const plan = planById(user.plan);
  const subState = user.paddleSubStatus ? SUB_STATUS[user.paddleSubStatus] : undefined;

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <PageHeader eyebrow="Akun" title="Tagihan">
        <p>Status langganan dan riwayat pembayaranmu.</p>
      </PageHeader>

      {/* Status langganan */}
      <section className={`${PANEL} mt-6 p-5 sm:p-6`}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-zinc-100">Plan {plan.name}</h2>
          {user.plan !== "gratis" && subState && <Pill className={subState.cls}>{subState.label}</Pill>}
        </div>
        {user.plan === "gratis" ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Kamu sedang memakai plan Gratis. Naik ke plan berbayar untuk kuota token dan batas
              request yang jauh lebih besar.
            </p>
            <Link
              href="/pricing"
              className="btn-shine mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-lime-400 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300"
            >
              Lihat Plan <ArrowUpRight size={15} />
            </Link>
          </>
        ) : (
          <dl className="mt-4 space-y-2 text-sm">
            {user.paddleCancelAt ? (
              <p className="leading-relaxed text-zinc-400">
                Langganan dijadwalkan berakhir pada {fmtDate(user.paddleCancelAt)}. Kamu tetap
                memakai plan ini sampai tanggal itu, sesudahnya akun kembali ke plan Gratis.
              </p>
            ) : user.paddleSubStatus === "past_due" ? (
              <p className="leading-relaxed text-zinc-400">
                Pembayaran terakhir belum berhasil. Perbarui metode pembayaranmu dari portal
                pelanggan di halaman Profil agar langganan tidak berhenti.
              </p>
            ) : (
              <>
                {nextBilledAt && (
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-zinc-500">Perpanjangan berikutnya:</dt>
                    <dd className="text-zinc-200">{fmtDate(nextBilledAt)}</dd>
                  </div>
                )}
                <p className="leading-relaxed text-zinc-400">
                  Langganan diperpanjang otomatis. Ubah metode pembayaran, unduh invoice, atau
                  batalkan dari portal pelanggan di halaman Profil.
                </p>
              </>
            )}
          </dl>
        )}
      </section>

      {/* Riwayat pembayaran */}
      <section className={`${PANEL} mt-4 overflow-hidden`}>
        <h2 className="px-5 pt-5 text-base font-semibold text-zinc-100 sm:px-6 sm:pt-6">
          Riwayat Pembayaran
        </h2>
        {historyFailed ? (
          <p className="px-5 pb-6 pt-3 text-sm text-zinc-500 sm:px-6">
            Riwayat pembayaran sedang tidak bisa dibaca. Silakan coba lagi nanti.
          </p>
        ) : txns.length === 0 ? (
          <p className="px-5 pb-6 pt-3 text-sm text-zinc-500 sm:px-6">Belum ada pembayaran.</p>
        ) : (
          <>
            <ul className="mt-2 divide-y divide-white/[0.06] md:hidden">
              {txns.map((t) => {
                const st = TXN_STATUS[t.status] ?? { label: t.status, cls: "bg-white/[0.06] text-zinc-400" };
                return (
                  <li key={t.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm text-zinc-200">{t.label}</p>
                      <Pill className={st.cls}>{st.label}</Pill>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {fmtDate(t.date)}
                      {t.invoiceNumber && <> · Invoice {t.invoiceNumber}</>}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold tabular-nums text-zinc-100">{t.amount}</p>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 hidden overflow-x-auto pb-2 md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">Tanggal</th>
                    <th className="px-6 py-3 font-medium">Keterangan</th>
                    <th className="px-6 py-3 text-right font-medium">Jumlah</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t) => {
                    const st = TXN_STATUS[t.status] ?? { label: t.status, cls: "bg-white/[0.06] text-zinc-400" };
                    return (
                      <tr key={t.id} className="border-t border-white/[0.05] align-top transition hover:bg-white/[0.025]">
                        <td className="whitespace-nowrap px-6 py-3 text-zinc-400">{fmtDate(t.date)}</td>
                        <td className="px-6 py-3">
                          <span className="text-zinc-200">{t.label}</span>
                          {t.invoiceNumber && (
                            <span className="block text-xs text-zinc-500">Invoice {t.invoiceNumber}</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-right font-medium tabular-nums text-zinc-100">
                          {t.amount}
                        </td>
                        <td className="px-6 py-3">
                          <Pill className={st.cls}>{st.label}</Pill>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
