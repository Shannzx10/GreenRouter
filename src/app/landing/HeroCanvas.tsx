"use client";

import { useEffect, useRef } from "react";

// Jaringan node yang hidup: node saling terhubung, paket data berlari antar node,
// kursor (atau jari / kursor otomatis di HP) menjadi "router" yang menarik node,
// klik/tap melepas gelombang kejut.
type Nd = { x: number; y: number; vx: number; vy: number; bx: number; by: number; r: number };
type Pk = { a: Nd; b: Nd | null; t: number; sp: number };
type Rg = { x: number; y: number; t: number };

export default function HeroCanvas({ className = "", density = 1 }: { className?: string; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const host = cv.parentElement!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, dpr = 1, raf = 0, last = performance.now(), time = 0, vis = true;
    let nodes: Nd[] = [];
    const packets: Pk[] = [];
    const rings: Rg[] = [];
    const m = { x: 0, y: 0, tx: 0, ty: 0, on: false, seen: 0 };
    const LIME = "190,242,100";

    const resize = () => {
      const r = host.getBoundingClientRect();
      W = r.width;
      H = r.height;
      dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      const n = Math.round(Math.min(95, Math.max(24, (W * H) / 15000)) * density);
      nodes = Array.from({ length: n }, () => {
        const bx = (Math.random() - 0.5) * 0.3, by = (Math.random() - 0.5) * 0.3;
        return { x: Math.random() * W, y: Math.random() * H, vx: bx, vy: by, bx, by, r: Math.random() * 1.3 + 0.8 };
      });
      packets.length = 0;
      m.x = m.tx = W / 2;
      m.y = m.ty = H / 2;
      if (reduce) draw();
    };

    const step = (dt: number) => {
      const now = performance.now();
      const live = m.on && now - m.seen < 3500;
      if (!live) {
        m.tx = W * (0.5 + 0.34 * Math.sin(time * 0.45));
        m.ty = H * (0.5 + 0.3 * Math.sin(time * 0.31 + 1));
      }
      m.x += (m.tx - m.x) * Math.min(1, dt * 8);
      m.y += (m.ty - m.y) * Math.min(1, dt * 8);

      for (let i = rings.length - 1; i >= 0; i--) {
        rings[i].t += dt;
        if (rings[i].t > 1.3) rings.splice(i, 1);
      }
      for (const n of nodes) {
        const dx = m.x - n.x, dy = m.y - n.y, d = Math.hypot(dx, dy);
        if (d < 210 && d > 1) {
          const f = (1 - d / 210) * 0.05;
          n.vx += (dx / d) * f;
          n.vy += (dy / d) * f;
        }
        for (const g of rings) {
          const rad = g.t * 480;
          const gx = n.x - g.x, gy = n.y - g.y, gd = Math.hypot(gx, gy);
          if (gd > 1 && Math.abs(gd - rad) < 28) {
            const k = (1 - g.t / 1.3) * 0.9;
            n.vx += (gx / gd) * k;
            n.vy += (gy / gd) * k;
          }
        }
        n.vx += (n.bx - n.vx) * 0.012;
        n.vy += (n.by - n.vy) * 0.012;
        const sp = Math.hypot(n.vx, n.vy);
        if (sp > 1.6) {
          n.vx *= 1.6 / sp;
          n.vy *= 1.6 / sp;
        }
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = W + 20;
        else if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20;
        else if (n.y > H + 20) n.y = -20;
      }

      const L = Math.min(150, Math.max(90, W / 9));
      if (packets.length < 14 && Math.random() < dt * 7 && nodes.length) {
        const a = nodes[(Math.random() * nodes.length) | 0];
        let b: Nd | null = null;
        for (const c of nodes) {
          if (c !== a && Math.hypot(c.x - a.x, c.y - a.y) < L && Math.random() < 0.4) {
            b = c;
            break;
          }
        }
        if (Math.hypot(m.x - a.x, m.y - a.y) < L * 1.5 && (!b || Math.random() < 0.5)) packets.push({ a, b: null, t: 0, sp: 1.1 });
        else if (b) packets.push({ a, b, t: 0, sp: 0.8 + Math.random() * 0.7 });
      }
      for (let i = packets.length - 1; i >= 0; i--) {
        packets[i].t += dt * packets[i].sp;
        if (packets[i].t >= 1) packets.splice(i, 1);
      }
    };

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const L = Math.min(150, Math.max(90, W / 9));

      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < L) {
            ctx.strokeStyle = `rgba(${LIME},${(1 - d / L) * 0.2})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        const dm = Math.hypot(a.x - m.x, a.y - m.y);
        if (dm < L * 1.5) {
          ctx.strokeStyle = `rgba(${LIME},${(1 - dm / (L * 1.5)) * 0.6})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        const dm = Math.hypot(n.x - m.x, n.y - m.y);
        const k = dm < 200 ? 1 - dm / 200 : 0;
        ctx.fillStyle = `rgba(${LIME},${0.35 + k * 0.65})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + k * 1.6, 0, 6.2832);
        ctx.fill();
      }

      for (const p of packets) {
        const bx = p.b ? p.b.x : m.x, by = p.b ? p.b.y : m.y;
        const x = p.a.x + (bx - p.a.x) * p.t, y = p.a.y + (by - p.a.y) * p.t;
        ctx.fillStyle = `rgba(${LIME},0.18)`;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, 6.2832);
        ctx.fill();
        ctx.fillStyle = "#ecfccb";
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, 6.2832);
        ctx.fill();
      }

      for (const g of rings) {
        ctx.strokeStyle = `rgba(${LIME},${(1 - g.t / 1.3) * 0.55})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.t * 480, 0, 6.2832);
        ctx.stroke();
      }

      const gr = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 110);
      gr.addColorStop(0, `rgba(${LIME},0.2)`);
      gr.addColorStop(1, `rgba(${LIME},0)`);
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 110, 0, 6.2832);
      ctx.fill();
      ctx.strokeStyle = `rgba(${LIME},0.8)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 7, 0, 6.2832);
      ctx.stroke();
    }

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
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

    const inside = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      return x >= 0 && y >= 0 && x <= r.width && y <= r.height ? { x, y } : null;
    };
    const onMove = (e: PointerEvent) => {
      const p = inside(e);
      if (p) {
        m.tx = p.x;
        m.ty = p.y;
        m.on = true;
        m.seen = performance.now();
      } else m.on = false;
    };
    const onDown = (e: PointerEvent) => {
      const p = inside(e);
      if (p) {
        rings.push({ x: p.x, y: p.y, t: 0 });
        m.tx = p.x;
        m.ty = p.y;
        m.on = true;
        m.seen = performance.now();
      }
    };
    const io = new IntersectionObserver(
      ([e]) => {
        vis = e.isIntersecting;
        if (vis) start();
        else stop();
      },
      { threshold: 0 },
    );
    const ro = new ResizeObserver(resize);
    const onVis = () => (document.hidden ? stop() : start());

    resize();
    io.observe(host);
    ro.observe(host);
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    start();
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerdown", onDown);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [density]);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none h-full w-full ${className}`} />;
}
