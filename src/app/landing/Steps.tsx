"use client";

import { useEffect, useRef } from "react";
import { Spot } from "./Interactive";

// Timeline langkah: garis mengisi mengikuti scroll dan tiap langkah menyala bertahap.
export default function Steps({ steps }: { steps: { n: string; title: string; body: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current!;
    let raf = 0;
    const upd = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.78 - r.top) / (r.height + innerHeight * 0.18)));
      el.style.setProperty("--p", p.toFixed(3));
      el.querySelectorAll<HTMLElement>("[data-step]").forEach((s, i) => {
        s.dataset.on = p > i / steps.length + 0.04 ? "1" : "0";
      });
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(upd);
    };
    upd();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => {
      removeEventListener("scroll", on);
      removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [steps.length]);

  return (
    <div ref={ref} className="relative grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
      <div className="absolute bottom-3 left-[11px] top-3 w-px bg-white/10 md:hidden">
        <div className="step-fill-y h-full w-full origin-top bg-lime-300" />
      </div>
      <div className="absolute left-3 right-0 top-[11px] hidden h-px bg-white/10 md:block">
        <div className="step-fill-x h-full w-full origin-left bg-lime-300" />
      </div>
      {steps.map((s) => (
        <div key={s.n} data-step data-on="0" className="step relative pl-10 md:pl-0 md:pt-10">
          <span className="step-dot absolute left-0 top-5 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-[#060806] md:top-0">
            <span className="h-2 w-2 rounded-full bg-lime-300" />
          </span>
          <Spot className="h-full overflow-hidden rounded-3xl p-6">
            <span className="step-n pointer-events-none absolute -right-1 -top-4 text-[92px] font-extrabold leading-none">
              {s.n}
            </span>
            <p className="relative mt-8 font-semibold">{s.title}</p>
            <p className="relative mt-1.5 text-sm leading-relaxed text-zinc-400">{s.body}</p>
          </Spot>
        </div>
      ))}
    </div>
  );
}
