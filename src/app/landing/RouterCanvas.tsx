"use client";

import { useEffect, useRef } from "react";

// Diagram "cara kerja" berbasis canvas: paket data mengalir dari model ke
// GreenRouter lalu diteruskan ke tool. Arahkan kursor / sentuh sebuah ikon
// untuk menyorot jalurnya; klik untuk mengirim rentetan paket.
type P = { x: number; y: number };
type Curve = [P, P, P, P];
type Nd = {
  name: string;
  kind: "m" | "t";
  img?: HTMLImageElement;
  mm?: boolean;
  p: P;
  cv: Curve;
  hot: number;
  fl: number;
};
type Pk = { n: Nd; t: number; sp: number };

const Z: P = { x: 0, y: 0 };
const MM_PATH =
  "M11.43 3.92a.86.86 0 1 0-1.718 0v14.236a1.999 1.999 0 0 1-3.997 0V9.022a.86.86 0 1 0-1.718 0v3.87a1.999 1.999 0 0 1-3.997 0V11.49a.57.57 0 0 1 1.139 0v1.404a.86.86 0 0 0 1.719 0V9.022a1.999 1.999 0 0 1 3.997 0v9.134a.86.86 0 0 0 1.719 0V3.92a1.998 1.998 0 1 1 3.996 0v11.788a.57.57 0 1 1-1.139 0zm10.572 3.105a2 2 0 0 0-1.999 1.997v7.63a.86.86 0 0 1-1.718 0V3.923a1.999 1.999 0 0 0-3.997 0v16.16a.86.86 0 0 1-1.719 0V18.08a.57.57 0 1 0-1.138 0v2a1.998 1.998 0 0 0 3.996 0V3.92a.86.86 0 0 1 1.719 0v12.73a1.999 1.999 0 0 0 3.996 0V9.023a.86.86 0 1 1 1.72 0v6.686a.57.57 0 0 0 1.138 0V9.022a2 2 0 0 0-1.998-1.997";

const MODELS = [
  { name: "DeepSeek", src: "/assets/providers/deepseek.png" },
  { name: "Z.ai", src: "/assets/providers/zai.png" },
  { name: "MiniMax", mm: true },
  { name: "MiMo", src: "/assets/providers/mimo.png" },
  { name: "MiniCPM", src: "/assets/providers/minicpm.png" },
  { name: "Kimi", src: "/assets/providers/kimi.png" },
  { name: "Mercury", src: "/assets/providers/mercury.png" },
  { name: "Atria", src: "/assets/providers/atria.png" },
];
const TOOLS = [
  { name: "OpenCode", src: "/assets/tools/opencode.svg" },
  { name: "Claude Code", src: "/assets/tools/claudecode.svg" },
  { name: "Codex", src: "/assets/tools/codex-mark.svg" },
  { name: "Cursor", src: "/assets/tools/cursor.svg" },
  { name: "Cline", src: "/assets/tools/cline.svg" },
  { name: "Continue", src: "/assets/tools/continue.png" },
  { name: "Aider", src: "/assets/tools/aider.png" },
  { name: "Open WebUI", src: "/assets/tools/openwebui.png" },
];

const bez = (c: Curve, t: number): P => {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, d = 3 * u * t * t, e = t * t * t;
  return {
    x: a * c[0].x + b * c[1].x + d * c[2].x + e * c[3].x,
    y: a * c[0].y + b * c[1].y + d * c[2].y + e * c[3].y,
  };
};

export default function RouterCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const wrap = cv.parentElement!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mmPath = new Path2D(MM_PATH);
    const leaf = new Image();
    leaf.src = "/assets/brand/leaf.png";
    const mk = (kind: "m" | "t") => (it: { name: string; src?: string; mm?: boolean }): Nd => {
      let img: HTMLImageElement | undefined;
      if (it.src) {
        img = new Image();
        img.src = it.src;
      }
      return { name: it.name, kind, img, mm: it.mm, p: Z, cv: [Z, Z, Z, Z], hot: 0, fl: 0 };
    };
    const models = MODELS.map(mk("m"));
    const tools = TOOLS.map(mk("t"));
    const all = [...models, ...tools];
    const packets: Pk[] = [];

    let W = 0, H = 0, dpr = 1, size = 50, portrait = false, labels = true;
    let center: P = Z;
    let pulse = 0, time = 0, last = performance.now(), raf = 0, vis = true, spawnT = 0;
    let hover: Nd | "c" | null = null;
    let clearT: ReturnType<typeof setTimeout> | undefined;

    const layout = () => {
      const r = wrap.getBoundingClientRect();
      W = r.width;
      portrait = W < 640;
      labels = W >= 720;
      H = portrait ? 600 : 480;
      dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cv.style.height = H + "px";
      size = portrait ? 44 : 50;
      center = { x: W / 2, y: H / 2 };
      const place = (list: Nd[], side: -1 | 1) =>
        list.forEach((n, i) => {
          if (!portrait) {
            const pad = labels ? 118 : 36;
            n.p = { x: side < 0 ? pad + size / 2 : W - pad - size / 2, y: 36 + i * ((H - 72) / 7) };
          } else {
            const col = i % 4, row = Math.floor(i / 4);
            n.p = { x: (col + 0.5) * (W / 4), y: side < 0 ? 34 + row * (size + 30) : H - 34 - row * (size + 30) };
          }
          const a = side < 0 ? n.p : center, b = side < 0 ? center : n.p;
          if (!portrait) {
            const mx = (a.x + b.x) / 2;
            n.cv = [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b];
          } else {
            const my = (a.y + b.y) / 2;
            n.cv = [a, { x: a.x, y: my }, { x: b.x, y: my }, b];
          }
        });
      place(models, -1);
      place(tools, 1);
      if (reduce) draw();
    };

    const spawn = (n: Nd) => packets.push({ n, t: 0, sp: 0.5 + Math.random() * 0.3 });
    const rnd = <T,>(a: T[]) => a[(Math.random() * a.length) | 0];

    const step = (dt: number) => {
      time += dt;
      pulse = Math.max(0, pulse - dt * 2.2);
      spawnT -= dt;
      if (spawnT <= 0) {
        spawn(rnd(models));
        spawnT = 0.35 + Math.random() * 0.35;
      }
      if (hover && hover !== "c" && Math.random() < dt * 5) spawn(hover);
      if (hover === "c" && Math.random() < dt * 8) spawn(rnd(models));
      for (const n of all) {
        n.hot += ((hover === n ? 1 : 0) - n.hot) * Math.min(1, dt * 10);
        n.fl = Math.max(0, n.fl - dt * 2.5);
      }
      for (let i = packets.length - 1; i >= 0; i--) {
        const k = packets[i];
        k.t += dt * k.sp;
        if (k.t >= 1) {
          packets.splice(i, 1);
          if (k.n.kind === "m") {
            pulse = 1;
            spawn(rnd(tools));
          } else k.n.fl = 1;
        }
      }
    };

    const contain = (img: HTMLImageElement, x: number, y: number, s: number) => {
      const r = img.naturalWidth / img.naturalHeight;
      const w = r >= 1 ? s : s * r, h = r >= 1 ? s / r : s;
      ctx.drawImage(img, x + (s - w) / 2, y + (s - h) / 2, w, h);
    };

    const tile = (n: Nd) => {
      const g = Math.min(1, n.hot + n.fl);
      const s = size * (1 + n.hot * 0.14 + n.fl * 0.1);
      const x = n.p.x - s / 2, y = n.p.y - s / 2;
      ctx.save();
      if (g > 0.02) {
        ctx.shadowColor = "rgba(190,242,100,0.9)";
        ctx.shadowBlur = 26 * g;
      }
      ctx.beginPath();
      ctx.roundRect(x, y, s, s, s * 0.26);
      ctx.fillStyle = n.kind === "t" || n.mm ? "#f4f4f5" : "#0c110a";
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(190,242,100,${0.2 + 0.7 * g})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.clip();
      if (n.mm) {
        ctx.translate(n.p.x - s * 0.3, n.p.y - s * 0.3);
        ctx.scale((s * 0.6) / 24, (s * 0.6) / 24);
        ctx.fillStyle = "#F23F42";
        ctx.fill(mmPath);
      } else if (n.img && n.img.complete && n.img.naturalWidth) {
        if (n.kind === "t") contain(n.img, x + s * 0.18, y + s * 0.18, s * 0.64);
        else ctx.drawImage(n.img, x, y, s, s);
      }
      ctx.restore();

      ctx.font = "500 12px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillStyle = `rgba(228,228,231,${0.5 + 0.5 * g})`;
      if (labels) {
        ctx.textBaseline = "middle";
        ctx.textAlign = n.kind === "m" ? "right" : "left";
        ctx.fillText(n.name, n.p.x + (n.kind === "m" ? -size / 2 - 14 : size / 2 + 14), n.p.y);
      } else if (n.hot > 0.05) {
        ctx.globalAlpha = n.hot;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.name, n.p.x, n.p.y + (n.kind === "m" ? size / 2 + 14 : -size / 2 - 14));
        ctx.globalAlpha = 1;
      }
    };

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      for (const n of all) {
        const on = n.hot > 0.1 || hover === "c";
        const c = n.cv;
        ctx.strokeStyle = on ? "rgba(190,242,100,0.55)" : "rgba(190,242,100,0.13)";
        ctx.lineWidth = on ? 1.6 : 1;
        ctx.beginPath();
        ctx.moveTo(c[0].x, c[0].y);
        ctx.bezierCurveTo(c[1].x, c[1].y, c[2].x, c[2].y, c[3].x, c[3].y);
        ctx.stroke();
      }

      for (const k of packets) {
        const col = k.n.kind === "m" ? "190,242,100" : "110,231,183";
        for (let i = 6; i >= 0; i--) {
          const t = k.t - i * 0.022;
          if (t < 0) continue;
          const q = bez(k.n.cv, t);
          ctx.fillStyle = `rgba(${col},${i === 0 ? 1 : 0.3 - i * 0.04})`;
          ctx.beginPath();
          ctx.arc(q.x, q.y, i === 0 ? 3.2 : 2.6 - i * 0.25, 0, 6.2832);
          ctx.fill();
        }
        const q = bez(k.n.cv, k.t);
        ctx.fillStyle = `rgba(${col},0.18)`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 9, 0, 6.2832);
        ctx.fill();
      }

      for (const n of all) tile(n);

      // pusat: GreenRouter
      const hc = hover === "c" ? 1 : 0;
      for (let k = 0; k < 3; k++) {
        const ph = (time * 0.4 + k / 3) % 1;
        ctx.strokeStyle = `rgba(190,242,100,${(1 - ph) * 0.28})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(center.x, center.y, 40 + ph * 54, 0, 6.2832);
        ctx.stroke();
      }
      ctx.save();
      ctx.setLineDash([4, 9]);
      ctx.lineDashOffset = -time * 22;
      ctx.strokeStyle = "rgba(190,242,100,0.4)";
      ctx.beginPath();
      ctx.arc(center.x, center.y, 54 + pulse * 5, 0, 6.2832);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.shadowColor = "rgba(190,242,100,0.8)";
      ctx.shadowBlur = 22 + pulse * 36 + hc * 14;
      ctx.beginPath();
      ctx.arc(center.x, center.y, 40 + pulse * 3, 0, 6.2832);
      ctx.fillStyle = "#0b1308";
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(190,242,100,0.85)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      if (leaf.complete && leaf.naturalWidth) {
        const s = 46 * (1 + pulse * 0.14);
        contain(leaf, center.x - s / 2, center.y - s / 2, s);
      }
      ctx.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillStyle = "rgba(217,249,157,0.9)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("GREENROUTER", center.x, center.y + 74);
    }

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      step(dt);
      draw();
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (reduce || raf || !vis || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const pick = (e: PointerEvent): Nd | "c" | null => {
      const r = cv.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (Math.hypot(x - center.x, y - center.y) < 48) return "c";
      for (const n of all) if (Math.abs(x - n.p.x) < size * 0.7 && Math.abs(y - n.p.y) < size * 0.7) return n;
      return null;
    };
    const onMove = (e: PointerEvent) => {
      clearTimeout(clearT);
      hover = pick(e);
      cv.style.cursor = hover ? "pointer" : "default";
    };
    const onDown = (e: PointerEvent) => {
      clearTimeout(clearT);
      hover = pick(e);
      if (hover === "c") models.forEach(spawn);
      else if (hover) for (let i = 0; i < 3; i++) packets.push({ n: hover, t: -i * 0.12, sp: 0.7 });
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === "touch") clearT = setTimeout(() => (hover = null), 1100);
      else hover = null;
    };

    const io = new IntersectionObserver(([e]) => {
      vis = e.isIntersecting;
      if (vis) start();
      else stop();
    });
    const ro = new ResizeObserver(layout);
    const onVis = () => (document.hidden ? stop() : start());
    layout();
    io.observe(wrap);
    ro.observe(wrap);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVis);
    start();
    if (reduce) setTimeout(draw, 500);
    return () => {
      stop();
      clearTimeout(clearT);
      io.disconnect();
      ro.disconnect();
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div className="relative w-full">
      <canvas
        ref={ref}
        role="img"
        aria-label="Diagram: model AI dari berbagai provider masuk ke GreenRouter lalu diteruskan ke tool coding"
        className="block w-full touch-pan-y"
      />
    </div>
  );
}
