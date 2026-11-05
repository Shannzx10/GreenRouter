"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Check, ShieldCheck } from "lucide-react";

const PROV = ["deepseek", "zai", "mimo", "kimi", "mercury"];

// Logo provider mengorbit mengelilingi satu key.
export function KeyViz() {
  return (
    <div className="relative mx-auto h-36 w-36">
      <div className="absolute inset-0 rounded-full border border-dashed border-lime-300/20" />
      <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-lime-300/50 bg-lime-400/10 shadow-[0_0_30px_rgba(163,230,53,0.35)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/brand/leaf.png" alt="" className="h-8 w-8 object-contain" />
      </div>
      {PROV.map((p, i) => (
        <span key={p} className="orbit-item absolute left-1/2 top-1/2 -ml-3.5 -mt-3.5" style={{ "--a": `${i * 45}deg` } as CSSProperties}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/assets/providers/${p}.png`} alt="" className="h-7 w-7 rounded-lg ring-1 ring-white/15" loading="lazy" />
        </span>
      ))}
    </div>
  );
}

// Teks mengalir seperti streaming.
export function StreamViz() {
  const [t, setT] = useState("");
  useEffect(() => {
    const full = "Halo! Aku siap membantu. Mau mulai dari mana?";
    let i = 0;
    let to: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (i <= full.length) {
        setT(full.slice(0, i++));
        to = setTimeout(tick, i === 1 ? 500 : 26 + Math.random() * 40);
      } else {
        i = 0;
        to = setTimeout(tick, 2200);
      }
    };
    tick();
    return () => clearTimeout(to);
  }, []);
  return (
    <div className="mx-auto h-36 w-full max-w-sm rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-[13px] leading-relaxed text-zinc-300">
      <span className="text-lime-300">›</span> {t}
      <span className="caret-blink ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 bg-lime-300" />
    </div>
  );
}

export function QuotaViz() {
  return (
    <div className="flex h-36 flex-col justify-center gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
          <div className="bar-fill h-full rounded-full bg-gradient-to-r from-lime-300 to-emerald-300" style={{ animationDelay: `${i * 0.5}s`, ["--w" as string]: `${[78, 52, 90][i]}%` }} />
        </div>
      ))}
    </div>
  );
}

export function ShieldViz() {
  return (
    <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
      <span className="hub-ring absolute h-20 w-20 rounded-full border border-lime-300/40" />
      <span className="hub-ring absolute h-20 w-20 rounded-full border border-lime-300/40" style={{ animationDelay: "-1.3s" }} />
      <span className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-lime-300/30 bg-lime-400/10 text-lime-300">
        <ShieldCheck size={36} />
      </span>
    </div>
  );
}

export function CompatViz() {
  return (
    <div className="flex h-36 flex-col items-center justify-center gap-2.5 font-mono text-[13px]">
      {["OpenAI", "Anthropic"].map((n, i) => (
        <span key={n} className="alt-pill w-40 rounded-full border px-4 py-2 text-center" style={{ animationDelay: `${i * -1.5}s` }}>
          {n}
        </span>
      ))}
      <span className="text-[11px] text-zinc-500">base URL → key yang sama</span>
    </div>
  );
}

export function SpeedViz() {
  const [s, setS] = useState(0);
  useEffect(() => {
    let v = 0;
    const id = setInterval(() => {
      v = v >= 60 ? (v >= 90 ? 0 : v + 1) : v + 1;
      setS(Math.min(60, v));
    }, 55);
    return () => clearInterval(id);
  }, []);
  const done = s >= 60;
  return (
    <div className="flex h-24 items-center justify-center gap-5 sm:h-28">
      <span className="font-mono text-4xl font-bold tabular-nums tracking-tight text-zinc-100 sm:text-5xl">
        00:{String(s).padStart(2, "0")}
      </span>
      <span
        className={
          "flex h-11 w-11 items-center justify-center rounded-full border transition duration-300 " +
          (done ? "scale-100 border-lime-300 bg-lime-400 text-zinc-950" : "scale-90 border-white/15 text-transparent")
        }
      >
        <Check size={20} />
      </span>
    </div>
  );
}
