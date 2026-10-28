"use client";

import { useEffect } from "react";

// Smooth-scroll anchor yang tahan perubahan viewport mobile.
// scroll-behavior:smooth bawaan browser meleset di Chrome Android karena
// bilah alamat menyusut/melebar di tengah animasi (target dihitung sekali
// di awal). Di sini target dihitung ulang dari posisi elemen di setiap
// frame, lalu di-snap persis di akhir — transisi tetap halus, pendaratan
// tetap presisi. Batal otomatis bila pengguna menyentuh/menggulir sendiri.
export default function SmoothAnchors() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let animating = false;
    const cancel = () => {
      animating = false;
      cancelAnimationFrame(raf);
    };

    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>(
        'a[href^="#"]',
      );
      if (!link) return;
      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;
      const el = document.querySelector(hash);
      if (!(el instanceof HTMLElement)) return;

      e.preventDefault();
      history.pushState(null, "", hash);

      const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      const targetY = () =>
        Math.max(0, el.getBoundingClientRect().top + window.scrollY - margin);
      const startY = window.scrollY;
      if (Math.abs(targetY() - startY) < 2) {
        window.scrollTo(0, targetY());
        return;
      }

      const duration = 650;
      const t0 = performance.now();
      animating = true;
      const step = (now: number) => {
        if (!animating) return;
        const t = Math.min(1, (now - t0) / duration);
        const eased =
          t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const dest = targetY();
        window.scrollTo(0, startY + (dest - startY) * eased);
        if (t < 1) {
          raf = requestAnimationFrame(step);
        } else {
          window.scrollTo(0, targetY());
          animating = false;
        }
      };
      raf = requestAnimationFrame(step);
    };

    document.addEventListener("click", onClick);
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      cancel();
    };
  }, []);

  return null;
}
