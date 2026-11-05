"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "#fitur", label: "Fitur" },
  { href: "#cara-mulai", label: "Cara Mulai" },
  { href: "#model", label: "Model" },
  { href: "#kuota", label: "Kuota" },
  { href: "/pricing", label: "Harga" },
  { href: "/app/docs", label: "Dokumentasi" },
];

// landing=false: dipakai di halaman lain (mis. harga), jangkar mengarah ke "/#..."
// dan "Harga" ditandai aktif. loggedIn: tombol masuk/daftar diganti "Ke Dashboard".
export default function Nav({ landing = true, loggedIn = false }: { landing?: boolean; loggedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState(landing ? "" : "/pricing");
  const links = LINKS.map((l) => (!landing && l.href.startsWith("#") ? { ...l, href: "/" + l.href } : l));
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const upd = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
      setScrolled(scrollY > 24);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(upd);
    };
    upd();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => {
      removeEventListener("scroll", on);
      removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!landing) return;
    const ids = ["fitur", "cara-mulai", "model", "kuota"];
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive("#" + e.target.id)),
      { rootMargin: "-40% 0px -55% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [landing]);

  return (
    <>
      <div
        ref={bar}
        className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left scale-x-0 bg-gradient-to-r from-lime-300 via-emerald-300 to-teal-300"
      />
      <div className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
        <div className="mx-auto max-w-6xl">
          <header
            className={
              "flex items-center justify-between rounded-full border py-2 pl-4 pr-2 transition duration-300 " +
              (scrolled || open
                ? "border-white/10 bg-zinc-950/75 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl"
                : "border-transparent")
            }
          >
            <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/brand/leaf.png" alt="GreenRouter" className="h-8 w-8 shrink-0 object-contain" />
              <span className="text-lg font-bold tracking-tight">
                Green<span className="text-lime-300">Router</span>
              </span>
            </Link>

            <nav className="hidden items-center gap-1 text-sm text-zinc-400 lg:flex">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className={
                    "rounded-full px-3.5 py-1.5 transition hover:text-lime-200 " +
                    (active === l.href ? "bg-white/[0.07] text-lime-200" : "")
                  }
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-1.5">
              {!loggedIn && (
                <Link
                  href="/login"
                  className="hidden rounded-full px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.06] hover:text-lime-200 sm:block"
                >
                  Masuk
                </Link>
              )}
              <Link
                href={loggedIn ? "/app" : "/register"}
                className="btn-shine inline-flex items-center rounded-full bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300"
              >
                {loggedIn ? "Ke Dashboard" : "Daftar Gratis"}
              </Link>
              <button
                type="button"
                aria-label={open ? "Tutup menu" : "Buka menu"}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-200 transition hover:bg-white/[0.08] lg:hidden"
              >
                {open ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </header>

          <div
            className={
              "grid overflow-hidden transition-all duration-300 lg:hidden " +
              (open ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")
            }
          >
            <div className="min-h-0 overflow-hidden">
              <nav className="rounded-3xl border border-white/10 bg-zinc-950/90 p-2 backdrop-blur-xl">
                {links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between rounded-2xl px-4 py-3 text-[15px] text-zinc-200 transition hover:bg-white/[0.06] hover:text-lime-200"
                  >
                    {l.label}
                    <span className="font-mono text-xs text-zinc-600">→</span>
                  </a>
                ))}
                {!loggedIn && (
                <Link
                  href="/login"
                  className="mt-1 flex items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-[15px] font-medium text-zinc-100 sm:hidden"
                >
                  Masuk
                </Link>
                )}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
