"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

// Pembungkus animasi scroll: konten memudar-naik halus saat masuk viewport,
// sekali saja. delay (ms) untuk efek bertingkat antar kartu.
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      // threshold WAJIB 0: ambang rasio (mis. 0.12) tidak pernah tercapai
      // pada blok yang lebih tinggi dari viewport (panel 100 baris log
      // tingginya belasan ribu px), sehingga bloknya transparan selamanya.
      { threshold: 0, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
