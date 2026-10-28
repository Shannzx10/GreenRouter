"use client";

import { useEffect, useRef, useState } from "react";

// Navigasi section dokumentasi dengan penanda aktif mengikuti posisi scroll
// (scrollspy). Item aktif diwarnai hijau solid; klik item langsung mengaktifkan
// warnanya sebelum scroll selesai.
export default function DocsNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState<string>(() =>
    typeof window !== "undefined" && window.location.hash
      ? window.location.hash.slice(1)
      : items[0].id,
  );
  const navRef = useRef<HTMLElement>(null);

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
    const nav = navRef.current;
    if (!nav) return;
    const el = nav.querySelector<HTMLElement>(`[data-nav="${active}"]`);
    if (!el) return;
    const target = el.offsetLeft - nav.clientWidth / 2 + el.clientWidth / 2;
    nav.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [active]);

  return (
    <nav
      ref={navRef}
      className="glass sticky top-[68px] z-30 mt-6 flex gap-1.5 overflow-x-auto rounded-full p-1.5 lg:top-6"
    >
      {items.map((n) => (
        <a
          key={n.id}
          href={`#${n.id}`}
          data-nav={n.id}
          onClick={() => setActive(n.id)}
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
  );
}
