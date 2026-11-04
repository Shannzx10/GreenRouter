"use client";

import { useEffect, useRef, useState } from "react";

// Navigasi section dokumentasi dengan penanda aktif mengikuti posisi scroll
// (scrollspy). Desktop: daftar isi vertikal di sisi kiri. Mobile/tablet: bilah
// horizontal yang menempel di atas dan menggeser item aktif ke tengah.
export default function DocsNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState<string>(() =>
    typeof window !== "undefined" && window.location.hash
      ? window.location.hash.slice(1)
      : items[0].id,
  );
  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const sections = items
      .map((n) => document.getElementById(n.id))
      .filter((el): el is HTMLElement => el != null);
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-25% 0px -65% 0px", threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [items]);

  // Geser bilah navigasi (horizontal di mobile) agar item aktif selalu terlihat.
  useEffect(() => {
    const nav = barRef.current;
    if (!nav) return;
    const el = nav.querySelector<HTMLElement>(`[data-nav="${active}"]`);
    if (!el) return;
    const target = el.offsetLeft - nav.clientWidth / 2 + el.clientWidth / 2;
    nav.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [active]);

  return (
    <>
      {/* Mobile / tablet: bilah lengket */}
      <nav
        ref={barRef}
        aria-label="Bagian dokumentasi"
        className="sticky top-[68px] z-30 mt-6 flex gap-1.5 overflow-x-auto rounded-full border border-white/10 bg-[#080b07]/90 p-1.5 backdrop-blur-xl [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
      >
        {items.map((n) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            data-nav={n.id}
            onClick={() => setActive(n.id)}
            aria-current={n.id === active ? "location" : undefined}
            className={
              n.id === active
                ? "shrink-0 rounded-full bg-lime-400 px-3.5 py-1.5 text-[13px] font-semibold text-zinc-950 shadow-[0_6px_20px_-6px_rgba(163,230,53,0.7)] transition"
                : "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] text-zinc-300 transition hover:bg-lime-400/10 hover:text-lime-200"
            }
          >
            {n.label}
          </a>
        ))}
      </nav>

      {/* Desktop: daftar isi di sisi kiri */}
      <nav aria-label="Daftar isi" className="sticky top-8 hidden lg:block">
        <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-500">
          Di halaman ini
        </p>
        <ul className="relative space-y-0.5 border-l border-white/10">
          {items.map((n) => {
            const on = n.id === active;
            return (
              <li key={n.id} className="relative">
                {on && (
                  <span className="absolute -left-px top-1/2 h-5 w-0.5 -translate-y-1/2 bg-lime-300 shadow-[0_0_10px_rgba(190,242,100,0.9)]" />
                )}
                <a
                  href={`#${n.id}`}
                  onClick={() => setActive(n.id)}
                  aria-current={on ? "location" : undefined}
                  className={`block rounded-r-lg py-1.5 pl-4 pr-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-lime-300/60 ${
                    on ? "font-medium text-lime-200" : "text-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  {n.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
