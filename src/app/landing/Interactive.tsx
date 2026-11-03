"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

// Kartu dengan spotlight yang mengikuti kursor (+ tilt 3D opsional, hanya untuk mouse).
export function Spot({
  children,
  className = "",
  tilt = false,
  max = 8,
}: {
  children: ReactNode;
  className?: string;
  tilt?: boolean;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    if (tilt && e.pointerType === "mouse") {
      const px = x / r.width - 0.5;
      const py = y / r.height - 0.5;
      el.style.transform = `perspective(1100px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
    }
  };
  const leave = () => {
    if (ref.current && tilt) ref.current.style.transform = "";
  };
  return (
    <div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      className={`spot ${tilt ? "spot-tilt " : ""}${className}`}
    >
      {children}
    </div>
  );
}

// Elemen "magnetik": sedikit tertarik ke arah kursor.
export function Magnetic({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const move = (e: PointerEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${dx * 0.18}px, ${dy * 0.28}px)`;
  };
  return (
    <span
      ref={ref}
      onPointerMove={move}
      onPointerLeave={() => ref.current && (ref.current.style.transform = "")}
      className={`magnetic inline-block ${className}`}
    >
      {children}
    </span>
  );
}
