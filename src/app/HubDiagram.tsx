"use client";

import { useEffect, useState } from "react";
import ProviderIcon from "./ProviderIcon";

// Diagram hub: SETIAP ikon punya garis strip mengalir sendiri yang ujungnya
// persis di titik tengah logo GreenRouter (dan sebaliknya ke tiap tool).
// Dua kanvas dengan geometri berbeda: lanskap untuk desktop, potret tinggi
// untuk HP, supaya ikon selalu besar dan berjarak lega, tidak menyusut jadi
// kecil dan berdesakan. Ubin tool berlatar putih karena logo mereka glyph
// hitam yang hilang di atas latar gelap.
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

type Geom = {
  W: number;
  H: number;
  leftX: number;
  rightX: number;
  cx: number;
  cy: number;
  top: number;
  bottom: number;
  tilePct: number;
  logoPct: number;
};

const DESKTOP: Geom = {
  W: 1000, H: 560, leftX: 110, rightX: 890, cx: 500, cy: 280,
  top: 64, bottom: 496, tilePct: 6.2, logoPct: 10,
};
const MOBILE: Geom = {
  W: 560, H: 1020, leftX: 72, rightX: 488, cx: 280, cy: 510,
  top: 86, bottom: 934, tilePct: 12.5, logoPct: 19,
};

function ys(g: Geom, i: number): number {
  return g.top + i * ((g.bottom - g.top) / (MODEL_TILES.length - 1));
}
function leftPath(g: Geom, y: number): string {
  const c1 = g.leftX + (g.cx - g.leftX) * 0.54;
  const c2 = g.cx - (g.cx - g.leftX) * 0.41;
  return `M ${g.leftX} ${y} C ${c1} ${y}, ${c2} ${g.cy}, ${g.cx} ${g.cy}`;
}
function rightPath(g: Geom, y: number): string {
  const c1 = g.cx + (g.rightX - g.cx) * 0.41;
  const c2 = g.rightX - (g.rightX - g.cx) * 0.54;
  return `M ${g.cx} ${g.cy} C ${c1} ${g.cy}, ${c2} ${y}, ${g.rightX} ${y}`;
}

function Scene({
  g,
  active,
  setHovered,
  className,
  labelSize,
}: {
  g: Geom;
  active: string;
  setHovered: (k: string | null) => void;
  className: string;
  labelSize: string;
}) {
  const pathCls = (key: string) =>
    active === key ? "stroke-lime-300 opacity-100" : "stroke-lime-200/55 opacity-90";

  return (
    <div className={`relative mx-auto w-full max-w-5xl ${className}`} style={{ aspectRatio: `${g.W}/${g.H}` }}>
      <svg viewBox={`0 0 ${g.W} ${g.H}`} className="absolute inset-0 h-full w-full" fill="none" aria-hidden>
        {MODEL_TILES.map((t, i) => (
          <path
            key={`m-${t.modelId}`}
            d={leftPath(g, ys(g, i))}
            pathLength={1}
            className={`hub-path ${pathCls(`m:${t.modelId}`)} transition-all duration-300`}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        ))}
        {TOOL_TILES.map((t, i) => (
          <path
            key={`t-${t.name}`}
            d={rightPath(g, ys(g, i))}
            pathLength={1}
            className={`hub-path ${pathCls(`t:${t.name}`)} transition-all duration-300`}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
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
          style={{ left: `${(g.leftX / g.W) * 100}%`, top: `${(ys(g, i) / g.H) * 100}%`, width: `${g.tilePct}%` }}
          onMouseEnter={() => setHovered(`m:${t.modelId}`)}
          onMouseLeave={() => setHovered(null)}
        >
          <div
            className={`aspect-square w-full rounded-[22%] bg-[#0a0f0a] p-[6%] ring-1 transition-all duration-300 ${
              active === `m:${t.modelId}` ? "scale-110 ring-lime-300/70" : "ring-white/15"
            }`}
          >
            <ProviderIcon modelId={t.modelId} className="h-full w-full" />
          </div>
          <span
            className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap font-medium text-zinc-400"
            style={{ fontSize: labelSize }}
          >
            {t.name}
          </span>
        </div>
      ))}

      {TOOL_TILES.map((t, i) => (
        <div
          key={t.name}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${(g.rightX / g.W) * 100}%`, top: `${(ys(g, i) / g.H) * 100}%`, width: `${g.tilePct}%` }}
          onMouseEnter={() => setHovered(`t:${t.name}`)}
          onMouseLeave={() => setHovered(null)}
        >
          <div
            className={`flex aspect-square w-full items-center justify-center rounded-[22%] bg-white ring-1 transition-all duration-300 ${
              active === `t:${t.name}` ? "scale-110 ring-lime-300/80" : "ring-white/40"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.logo} alt={t.name} className="h-[62%] w-[62%] object-contain" loading="lazy" />
          </div>
          <span
            className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap font-medium text-zinc-400"
            style={{ fontSize: labelSize }}
          >
            {t.name}
          </span>
        </div>
      ))}

      {/* Logo tengah: semua garis menyatu tepat di titik ini */}
      <div
        className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
        style={{ width: `${g.logoPct}%` }}
      >
        <div className="relative">
          <span className="hub-ring absolute inset-0 rounded-[26%] border border-lime-300/50" aria-hidden />
          <div className="relative flex aspect-square w-full items-center justify-center rounded-[26%] bg-[#0a0f0a] shadow-[0_0_60px_-10px_rgba(163,230,53,0.55)] ring-1 ring-lime-300/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/brand/leaf.png" alt="GreenRouter" className="h-[62%] w-[62%] object-contain" />
          </div>
        </div>
        <span
          className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap font-bold tracking-wide text-zinc-100"
          style={{ fontSize: labelSize }}
        >
          GreenRouter
        </span>
      </div>
    </div>
  );
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

  return (
    <div className="glass relative overflow-hidden rounded-[28px] px-3 py-6 sm:px-8 sm:py-8">
      <Scene g={DESKTOP} active={active} setHovered={setHovered} className="hidden md:block" labelSize="clamp(9px, 1.5vw, 11px)" />
      <Scene g={MOBILE} active={active} setHovered={setHovered} className="md:hidden" labelSize="clamp(10px, 3vw, 12px)" />
    </div>
  );
}
