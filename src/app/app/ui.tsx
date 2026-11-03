import type { ReactNode } from "react";

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
