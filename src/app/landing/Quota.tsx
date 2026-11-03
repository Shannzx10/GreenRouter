"use client";

import { useEffect, useRef } from "react";

const TOTAL = 5_000_000;
const R = 88;
const C = 2 * Math.PI * R;

// Hitung naik 0 → 5.000.000 saat masuk layar.
export function CountUp({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current!;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / 1800);
        el.textContent = Math.round(TOTAL * (1 - Math.pow(1 - p, 4))).toLocaleString("id-ID");
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <span ref={ref} className={className}>
      5.000.000
    </span>
  );
}

// Gauge: kuota terpakai pelan-pelan lalu terisi penuh lagi di siklus berikutnya.
export function QuotaGauge() {
  const arc = useRef<SVGCircleElement>(null);
  const num = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const t0 = performance.now();
    const DUR = 11000;
    const tick = (now: number) => {
      const p = ((now - t0) % DUR) / DUR;
      const r = p < 0.8 ? 1 - 0.86 * (p / 0.8) : 0.14 + 0.86 * (1 - Math.pow(1 - (p - 0.8) / 0.2, 3));
      if (arc.current) arc.current.style.strokeDashoffset = String(C * (1 - r));
      if (num.current) num.current.textContent = Math.round(TOTAL * r).toLocaleString("id-ID");
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[280px]">
      <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="gq" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d9f99d" />
            <stop offset="1" stopColor="#5eead4" />
          </linearGradient>
        </defs>
        <circle cx="110" cy="110" r="104" fill="none" stroke="rgba(190,242,100,0.28)" strokeWidth="3"
          strokeDasharray={`${(2 * Math.PI * 104) / 7 - 6} 6`} />
        <circle cx="110" cy="110" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" />
        <circle ref={arc} cx="110" cy="110" r={R} fill="none" stroke="url(#gq)" strokeWidth="12"
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset="0"
          style={{ filter: "drop-shadow(0 0 8px rgba(190,242,100,0.55))" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span ref={num} className="font-mono text-[26px] font-bold tabular-nums tracking-tight text-lime-200 sm:text-3xl">
          5.000.000
        </span>
        <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">token · 7 hari</span>
      </div>
    </div>
  );
}
