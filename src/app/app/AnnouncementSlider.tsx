"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";

export type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  dateLabel: string;
};

// Slider pengumuman dashboard user: satu panel, slide bergeser otomatis
// tiap 3 detik, berhenti saat kursor menyentuh panel, dot indikator di
// bawah bisa diklik untuk loncat dan mereset timer.
export default function AnnouncementSlider({ items }: { items: AnnouncementItem[] }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = items.length;

  useEffect(() => {
    if (n < 2 || paused) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % n), 3000);
    return () => clearInterval(id);
  }, [n, paused, idx]);

  if (n === 0) return null;

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-lime-300/20 bg-gradient-to-r from-lime-400/[0.07] to-transparent"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {items.map((a) => (
          <article key={a.id} className="w-full shrink-0 p-4 sm:p-5">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
                <Megaphone size={19} />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-lime-300">
                  Pengumuman
                  <span className="ml-2 font-medium normal-case tracking-normal text-zinc-500">
                    {a.dateLabel}
                  </span>
                </p>
                <h3 className="mt-1 font-semibold">{a.title}</h3>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-zinc-400">
                  {a.body}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      {n > 1 && (
        <div className="flex items-center justify-center gap-1.5 pb-3">
          {items.map((a, i) => (
            <button
              key={a.id}
              type="button"
              aria-label={`Ke pengumuman ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === idx ? "w-6 bg-lime-300" : "w-2 bg-zinc-600 hover:bg-zinc-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
