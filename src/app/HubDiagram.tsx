"use client";

import { useEffect, useState } from "react";
import ProviderIcon from "./ProviderIcon";

// Diagram hub: model AI di kiri menyatu ke GreenRouter di tengah, lalu
// menyebar ke tool coding di kanan. Garis digambar sebagai SVG di belakang
// ubin HTML; kedua sisi memakai sistem koordinat yang sama sehingga ujung
// garis selalu tertutup ubin pada ukuran layar berapa pun.
const MODEL_TILES = [
  { modelId: "deepseek-v4-flash-0731", name: "DeepSeek" },
  { modelId: "glm-5.3", name: "Z.ai" },
  { modelId: "minimax-m2.7", name: "MiniMax" },
  { modelId: "mimo-v2.6-flash", name: "MiMo" },
  { modelId: "minicpm-v-4.7-35b-a3b", name: "MiniCPM" },
  { modelId: "kimi-k2.6", name: "Kimi" },
  { modelId: "mercury-3", name: "Mercury" },
  { modelId: "atria-dawn", name: "Atria" },
];

const TOOL_TILES = [
  { name: "OpenCode", logo: "/assets/tools/opencode.svg" },
  { name: "Claude Code", logo: "/assets/tools/claudecode.svg" },
  { name: "Codex", logo: "/assets/tools/codex-mark.svg" },
  { name: "Cursor", logo: "/assets/tools/cursor.svg" },
  { name: "Cline", logo: "/assets/tools/cline.svg" },
  { name: "Continue", logo: "/assets/tools/continue.png" },
  { name: "Aider", logo: "/assets/tools/aider.png" },
  { name: "Open WebUI", logo: "/assets/tools/openwebui.png" },
];

const W = 1000;
const H = 560;
const LEFT_X = 110;
const RIGHT_X = 890;
const CX = 500;
const CY = 280;
const GAP = 62; // jarak tepi logo tengah ke ujung garis

function ys(i: number): number {
  return 56 + i * ((H - 112) / (MODEL_TILES.length - 1));
}

function leftPath(y: number): string {
  return `M ${LEFT_X} ${y} C 300 ${y}, 360 ${CY}, ${CX - GAP} ${CY}`;
}
function rightPath(y: number): string {
  return `M ${CX + GAP} ${CY} C 640 ${CY}, 700 ${y}, ${RIGHT_X} ${y}`;
}

export default function HubDiagram() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [cycle, setCycle] = useState(0);

  const cycleKeys = [
    ...MODEL_TILES.map((t) => `m:${t.modelId}`),
    ...TOOL_TILES.map((t) => `t:${t.name}`),
  ];
  useEffect(() => {
    if (hovered) return;
    const id = setInterval(() => setCycle((c) => (c + 1) % cycleKeys.length), 2100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered]);
  const active = hovered ?? cycleKeys[cycle];

  const pathCls = (key: string) =>
    active === key
      ? "stroke-lime-300 opacity-100"
      : "stroke-lime-200/35 opacity-70";
  const underCls = (key: string) =>
    active === key ? "stroke-lime-300/25" : "stroke-white/[0.06]";

  return (
    <div className="glass relative overflow-hidden rounded-[28px] px-4 py-8 sm:px-8">
      {/* ===== Adegan desktop: garis SVG + ubin HTML satu koordinat ===== */}
      <div className="relative mx-auto hidden w-full max-w-5xl md:block" style={{ aspectRatio: `${W}/${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" fill="none" aria-hidden>
          {MODEL_TILES.map((t, i) => (
            <g key={`u-m-${t.modelId}`}>
              <path d={leftPath(ys(i))} className={`${underCls(`m:${t.modelId}`)} transition-all duration-300`} strokeWidth="5" strokeLinecap="round" />
              <path d={leftPath(ys(i))} pathLength={1} className={`hub-path ${pathCls(`m:${t.modelId}`)} transition-all duration-300`} strokeWidth="1.8" strokeLinecap="round" />
            </g>
          ))}
          {TOOL_TILES.map((t, i) => (
            <g key={`u-t-${t.name}`}>
              <path d={rightPath(ys(i))} className={`${underCls(`t:${t.name}`)} transition-all duration-300`} strokeWidth="5" strokeLinecap="round" />
              <path d={rightPath(ys(i))} pathLength={1} className={`hub-path ${pathCls(`t:${t.name}`)} transition-all duration-300`} strokeWidth="1.8" strokeLinecap="round" />
            </g>
          ))}
        </svg>

        <span className="absolute left-[3%] top-0 text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">
          Model AI
        </span>
        <span className="absolute right-[3%] top-0 text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">
          Tool Favoritmu
        </span>

        {MODEL_TILES.map((t, i) => (
          <div
            key={t.modelId}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${(LEFT_X / W) * 100}%`, top: `${(ys(i) / H) * 100}%` }}
            onMouseEnter={() => setHovered(`m:${t.modelId}`)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              className={`h-12 w-12 rounded-2xl bg-[#0a0f0a] p-1 ring-1 transition-all duration-300 lg:h-14 lg:w-14 ${
                active === `m:${t.modelId}` ? "scale-110 ring-lime-300/70" : "ring-white/15"
              }`}
            >
              <ProviderIcon modelId={t.modelId} className="h-full w-full" />
            </div>
            <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-zinc-400">
              {t.name}
            </span>
          </div>
        ))}

        {TOOL_TILES.map((t, i) => (
          <div
            key={t.name}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${(RIGHT_X / W) * 100}%`, top: `${(ys(i) / H) * 100}%` }}
            onMouseEnter={() => setHovered(`t:${t.name}`)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0a0f0a] ring-1 transition-all duration-300 lg:h-14 lg:w-14 ${
                active === `t:${t.name}` ? "scale-110 ring-lime-300/70" : "ring-white/15"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.logo} alt={t.name} className="h-7 w-7 object-contain lg:h-8 lg:w-8" loading="lazy" />
            </div>
            <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-zinc-400">
              {t.name}
            </span>
          </div>
        ))}

        {/* Logo tengah */}
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <span className="hub-ring absolute inset-0 rounded-[26px] border border-lime-300/50" aria-hidden />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#0a0f0a] shadow-[0_0_60px_-10px_rgba(163,230,53,0.55)] ring-1 ring-lime-300/40 lg:h-24 lg:w-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/brand/leaf.png" alt="GreenRouter" className="h-12 w-12 object-contain lg:h-14 lg:w-14" />
            </div>
          </div>
          <span className="absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap text-sm font-bold tracking-wide text-zinc-100">
            GreenRouter
          </span>
        </div>
      </div>

      {/* ===== Varian HP: aliran vertikal ===== */}
      <div className="md:hidden">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">Model AI</p>
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-3">
          {MODEL_TILES.map((t) => (
            <div key={t.modelId} className="flex w-14 flex-col items-center gap-1">
              <div className="h-11 w-11 rounded-2xl bg-[#0a0f0a] p-1 ring-1 ring-white/15">
                <ProviderIcon modelId={t.modelId} className="h-full w-full" />
              </div>
              <span className="text-[10px] font-medium text-zinc-400">{t.name}</span>
            </div>
          ))}
        </div>

        <div className="relative mx-auto h-12 w-px bg-gradient-to-b from-lime-300/50 via-lime-300/25 to-lime-300/50">
          <span className="hub-drop-dot absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-lime-300" aria-hidden />
        </div>

        <div className="relative mx-auto w-fit">
          <span className="hub-ring absolute inset-0 rounded-[26px] border border-lime-300/50" aria-hidden />
          <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[26px] bg-[#0a0f0a] shadow-[0_0_60px_-10px_rgba(163,230,53,0.55)] ring-1 ring-lime-300/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/brand/leaf.png" alt="GreenRouter" className="h-11 w-11 object-contain" />
          </div>
        </div>
        <p className="mt-2.5 text-center text-sm font-bold tracking-wide text-zinc-100">GreenRouter</p>

        <div className="relative mx-auto h-12 w-px bg-gradient-to-b from-lime-300/50 via-lime-300/25 to-lime-300/50">
          <span className="hub-drop-dot absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-lime-300" aria-hidden />
        </div>

        <p className="text-center text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">Tool Favoritmu</p>
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-3">
          {TOOL_TILES.map((t) => (
            <div key={t.name} className="flex w-14 flex-col items-center gap-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0a0f0a] ring-1 ring-white/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.logo} alt={t.name} className="h-6 w-6 object-contain" loading="lazy" />
              </div>
              <span className="text-center text-[10px] font-medium leading-tight text-zinc-400">{t.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
