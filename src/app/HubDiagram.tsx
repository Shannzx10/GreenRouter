"use client";

import { useEffect, useState } from "react";
import ProviderIcon from "./ProviderIcon";

// Diagram hub: SETIAP ikon punya garisnya sendiri yang ujungnya persis di
// titik tengah logo GreenRouter (dan sebaliknya ke tiap tool). Garis adalah
// SVG satu adegan yang diskalakan utuh di semua ukuran layar, ubin HTML
// memakai ukuran persen dari adegan yang sama sehingga selalu menutup
// pangkal dan ujung garis pada lebar berapa pun.
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

function ys(i: number): number {
  return 56 + i * ((H - 112) / (MODEL_TILES.length - 1));
}

// Semua garis berawal di tengah ubin asal dan BERAKHIR DI TENGAH logo.
function leftPath(y: number): string {
  return `M ${LEFT_X} ${y} C 320 ${y}, 340 ${CY}, ${CX} ${CY}`;
}
function rightPath(y: number): string {
  return `M ${CX} ${CY} C 660 ${CY}, 680 ${y}, ${RIGHT_X} ${y}`;
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
    active === key ? "stroke-lime-300 opacity-100" : "stroke-lime-200/55 opacity-90";

  const labelCls =
    "absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap font-medium text-zinc-400";
  const labelStyle = { fontSize: "clamp(8px, 1.5vw, 11px)" } as const;

  return (
    <div className="glass relative overflow-hidden rounded-[28px] px-3 py-6 sm:px-8 sm:py-8">
      <div className="relative mx-auto w-full max-w-5xl" style={{ aspectRatio: `${W}/${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" fill="none" aria-hidden>
          {MODEL_TILES.map((t, i) => (
            <g key={`m-${t.modelId}`}>
              <path d={leftPath(ys(i))} pathLength={1} className={`hub-path ${pathCls(`m:${t.modelId}`)} transition-all duration-300`} strokeWidth="2.4" strokeLinecap="round" />
            </g>
          ))}
          {TOOL_TILES.map((t, i) => (
            <g key={`t-${t.name}`}>
              <path d={rightPath(ys(i))} pathLength={1} className={`hub-path ${pathCls(`t:${t.name}`)} transition-all duration-300`} strokeWidth="2.4" strokeLinecap="round" />
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
            style={{ left: `${(LEFT_X / W) * 100}%`, top: `${(ys(i) / H) * 100}%`, width: "5.8%" }}
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
            <span className={labelCls} style={labelStyle}>
              {t.name}
            </span>
          </div>
        ))}

        {TOOL_TILES.map((t, i) => (
          <div
            key={t.name}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${(RIGHT_X / W) * 100}%`, top: `${(ys(i) / H) * 100}%`, width: "5.8%" }}
            onMouseEnter={() => setHovered(`t:${t.name}`)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              className={`flex aspect-square w-full items-center justify-center rounded-[22%] bg-[#0a0f0a] ring-1 transition-all duration-300 ${
                active === `t:${t.name}` ? "scale-110 ring-lime-300/70" : "ring-white/15"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.logo} alt={t.name} className="h-[58%] w-[58%] object-contain" loading="lazy" />
            </div>
            <span className={labelCls} style={labelStyle}>
              {t.name}
            </span>
          </div>
        ))}

        {/* Logo tengah: semua garis menyatu tepat di titik ini */}
        <div
          className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ width: "9.6%" }}
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
            style={{ fontSize: "clamp(10px, 2vw, 14px)" }}
          >
            GreenRouter
          </span>
        </div>
      </div>
    </div>
  );
}
