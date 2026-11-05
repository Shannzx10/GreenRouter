import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// Pembungkus UI bersama untuk halaman dashboard user.
export const PANEL = "rounded-3xl border border-white/[0.08] bg-white/[0.02]";

export function SectionHead({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.26em] text-lime-300/85">
          <span className="h-1.5 w-1.5 bg-lime-300" />
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h2>
        {children && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-400">{children}</p>}
      </div>
      {action}
    </div>
  );
}

export function Pill({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${className}`}>
      {children}
    </span>
  );
}

// Kepala halaman standar dashboard user (dipakai halaman selain Ringkasan).
export function PageHeader({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.26em] text-lime-300/85">
          <span className="h-1.5 w-1.5 bg-lime-300" />
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {children && <div className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">{children}</div>}
      </div>
      {/* Di mobile aksi melayang di kanan atas sejajar judul; di layar
          sm ke atas kembali sebaris di kanan blok judul. */}
      {actions && (
        <div className="absolute right-0 top-0 flex shrink-0 flex-wrap items-center gap-2 sm:static">
          {actions}
        </div>
      )}
    </div>
  );
}

// Kartu seksi bergaya konsisten: ikon + judul di kiri, keterangan kecil di kanan.
export function Card({
  icon: Icon,
  title,
  aside,
  tone = "lime",
  className = "",
  children,
}: {
  icon: LucideIcon;
  title: string;
  aside?: ReactNode;
  tone?: "lime" | "red";
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`${PANEL} p-5 sm:p-6 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-semibold">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
              tone === "red" ? "bg-red-500/10 text-red-300 ring-red-400/20" : "bg-lime-400/10 text-lime-300 ring-lime-300/20"
            }`}
          >
            <Icon size={18} />
          </span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
