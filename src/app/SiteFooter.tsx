import Link from "next/link";

// Footer bersama untuk halaman publik (landing dan harga), diekstrak
// dari landing agar tampilannya selalu identik di semua halaman.
// Tautan jangkar memakai awalan "/" supaya tetap benar dari halaman
// mana pun, bukan hanya dari landing.
const POPULAR_IDS = [
  "deepseek-v4-flash-0731",
  "deepseek-v4-flash",
  "kimi-k2.6",
  "glm-5.3",
  "minimax-m2.7",
];

export default function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/[0.06] pb-8 pt-12 sm:mt-28">
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/brand/leaf.png" alt="GreenRouter" className="h-9 w-9 shrink-0 object-contain" />
            <span className="text-lg font-bold tracking-tight">
              Green<span className="text-lime-300">Router</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">
            Satu key untuk semua model AI.
          </p>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.32em] text-zinc-500">
            Work Fast · Work Smart
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Mulai</p>
          <ul className="mt-3 space-y-2.5 text-sm text-zinc-400">
            <li><Link href="/register" className="transition hover:text-lime-200">Daftar Gratis</Link></li>
            <li><Link href="/login" className="transition hover:text-lime-200">Masuk</Link></li>
            <li><Link href="/app/docs" className="transition hover:text-lime-200">Dokumentasi</Link></li>
            <li><Link href="/pricing" className="transition hover:text-lime-200">Harga</Link></li>
            <li><a href="/#model" className="transition hover:text-lime-200">Katalog Model</a></li>
            <li><a href="/#kuota" className="transition hover:text-lime-200">Kuota Akun Baru</a></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Model Populer</p>
          <ul className="mt-3 space-y-2.5 font-mono text-[13px] text-zinc-400">
            {POPULAR_IDS.map((id) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/[0.05] pt-6 text-xs text-zinc-500 sm:flex-row">
        <p>© 2026 GreenRouter. Seluruh hak cipta dilindungi.</p>
        <nav className="flex items-center gap-5">
          <Link href="/terms" className="transition hover:text-lime-200">Syarat Layanan</Link>
          <Link href="/privacy" className="transition hover:text-lime-200">Privasi</Link>
          <Link href="/refunds" className="transition hover:text-lime-200">Pengembalian</Link>
        </nav>
        <p className="font-medium tracking-wide text-zinc-400">Work Fast, Work Smart.</p>
      </div>
    </footer>
  );
}
