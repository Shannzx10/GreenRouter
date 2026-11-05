"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  FlaskConical,
  KeyRound,
  Layers,
  LayoutDashboard,
  Menu,
  Receipt,
  ScrollText,
  ShieldCheck,
  User,
  Zap,
} from "lucide-react";

const NAV = [
  { href: "/app", label: "Ringkasan", short: "Ringkasan", icon: LayoutDashboard, exact: true },
  { href: "/app/keys", label: "Key Saya", short: "Key", icon: KeyRound, exact: false },
  { href: "/app/models", label: "Katalog Model", short: "Model", icon: Layers, exact: false },
  { href: "/app/performa", label: "Performa", short: "Performa", icon: Activity, exact: false },
  { href: "/app/playground", label: "Playground", short: "Playground", icon: FlaskConical, exact: false },
  { href: "/app/logs", label: "Log Pemakaian", short: "Log", icon: ScrollText, exact: false },
  { href: "/app/docs", label: "Dokumentasi", short: "Docs", icon: BookOpen, exact: false },
  { href: "/app/tagihan", label: "Tagihan", short: "Tagihan", icon: Receipt, exact: false },
  { href: "/app/profile", label: "Profil", short: "Profil", icon: User, exact: false },
];

const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60";

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/brand/leaf.png" alt="GreenRouter" className="h-9 w-9 shrink-0 object-contain" />
      {!compact && (
        <span className="text-lg font-bold tracking-tight">
          Green<span className="text-lime-300">Router</span>
        </span>
      )}
    </div>
  );
}

// Bar bawah mobile hanya 4 tab utama + tombol More; sisanya (Performa,
// Playground, Docs, Profil) masuk panel "More". Sidebar desktop lengkap.
const MOBILE_MAIN_HREFS = ["/app", "/app/keys", "/app/models", "/app/logs"];
const MOBILE_MAIN = NAV.filter((item) => MOBILE_MAIN_HREFS.includes(item.href));
const MOBILE_MORE = NAV.filter((item) => !MOBILE_MAIN_HREFS.includes(item.href));

// Status ciut sidebar desktop disimpan di localStorage dan dibaca
// lewat external store: snapshot server selalu default ciut (HTML
// awal konsisten), snapshot klien membaca pilihan tersimpan user.
const SIDEBAR_EVENT = "gr-user-sidebar-change";

function subscribeSidebar(cb: () => void) {
  window.addEventListener(SIDEBAR_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(SIDEBAR_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function useSidebarMin(): [boolean, () => void] {
  const min = useSyncExternalStore(
    subscribeSidebar,
    () => localStorage.getItem("gr-user-sidebar") !== "full",
    () => true,
  );
  function toggleMin() {
    localStorage.setItem("gr-user-sidebar", min ? "full" : "min");
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
  }
  return [min, toggleMin];
}

export default function UserSidebar({ email, role, plan }: { email: string; role: string; plan: string }) {
  const pathname = usePathname();
  // Label upgrade hanya untuk plan di bawah Max; plan Max sudah mentok
  // dan tidak bisa naik lagi, selaras tombol di kartu Plan halaman Profil.
  const canUpgrade = plan !== "max";
  const [moreOpen, setMoreOpen] = useState(false);
  // Sidebar desktop bisa diciutkan jadi rel ikon; DEFAULT-nya ciut,
  // pilihan terakhir user diingat (yang tersimpan hanya pengecualiannya).
  const [min, toggleMin] = useSidebarMin();

  // Panel "More" tertutup tiap pindah halaman (penyesuaian saat render,
  // bukan efek).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMoreOpen(false);
  }

  const active = (item: (typeof NAV)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <>
      {/* ===== Sidebar desktop (bisa diciutkan) ===== */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.07] bg-[#070a06]/80 px-3.5 py-6 backdrop-blur-xl transition-[width] duration-300 lg:flex ${
          min ? "w-[76px]" : "w-64"
        }`}
      >
        <div className={`mb-8 ${min ? "flex justify-center" : "px-2"}`}>
          <Brand compact={min} />
        </div>
        {!min && (
          <p className="mb-2 px-3.5 font-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-600">Menu</p>
        )}
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const on = active(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={min ? item.label : undefined}
                aria-current={on ? "page" : undefined}
                className={`relative flex items-center gap-3 whitespace-nowrap rounded-2xl py-2.5 text-sm transition ${FOCUS} ${
                  min ? "justify-center px-0" : "px-3.5"
                } ${
                  on
                    ? "bg-lime-400/10 font-medium text-lime-200"
                    : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100"
                }`}
              >
                {on && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-lime-300 shadow-[0_0_10px_rgba(190,242,100,0.8)]" />}
                <Icon size={18} className="shrink-0" />
                {!min && item.label}
              </Link>
            );
          })}
          {role === "ADMIN" && (
            <Link
              href="/admin"
              title={min ? "Panel Admin" : undefined}
              className={`flex items-center gap-3 whitespace-nowrap rounded-2xl py-2.5 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-zinc-100 ${
                min ? "justify-center px-0" : "px-3.5"
              }`}
            >
              <ShieldCheck size={18} className="shrink-0" /> {!min && "Panel Admin"}
            </Link>
          )}
        </nav>
        <div className="mt-auto border-t border-white/[0.07] pt-4">
          {canUpgrade && (
            <Link
              href="/pricing"
              title={min ? "Upgrade Plan" : undefined}
              className={`mb-1 flex items-center gap-3 whitespace-nowrap rounded-2xl border border-lime-300/20 bg-lime-400/[0.07] py-2.5 text-sm font-medium text-lime-200 transition hover:bg-lime-400/15 ${FOCUS} ${
                min ? "justify-center px-0" : "px-3.5"
              }`}
            >
              <Zap size={18} className="shrink-0" /> {!min && "Upgrade Plan"}
            </Link>
          )}
          <button
            onClick={toggleMin}
            title={min ? "Lebarkan sidebar" : "Ciutkan sidebar"}
            className={`mb-1 flex w-full items-center gap-3 whitespace-nowrap rounded-2xl py-2.5 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-zinc-100 ${
              min ? "justify-center px-0" : "px-3.5"
            }`}
          >
            {min ? <ChevronsRight size={18} className="shrink-0" /> : <ChevronsLeft size={18} className="shrink-0" />}
            {!min && "Ciutkan"}
          </button>
          <div className={`mt-2 flex items-center gap-2.5 ${min ? "justify-center" : "px-2"}`} title={min ? email : undefined}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime-400 text-sm font-extrabold text-zinc-950">
              {email.charAt(0).toUpperCase()}
            </span>
            {!min && <p className="min-w-0 truncate text-xs text-zinc-400">{email}</p>}
          </div>
        </div>
      </aside>

      {/* ===== Topbar mobile ===== */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center border-b border-white/[0.07] bg-[#060806]/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Brand />
        {canUpgrade && (
          <Link
            href="/pricing"
            className={`ml-auto inline-flex items-center gap-1.5 rounded-full border border-lime-300/25 bg-lime-400/10 px-3 py-1.5 text-xs font-semibold text-lime-200 ${FOCUS}`}
          >
            <Zap size={13} /> Upgrade
          </Link>
        )}
      </header>

      {/* ===== Navigasi bawah mobile: 4 tab utama + More ===== */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="fixed inset-x-3 z-40 rounded-3xl border border-white/10 bg-zinc-950/95 p-2 shadow-2xl backdrop-blur-xl lg:hidden"
            style={{ bottom: "calc(76px + env(safe-area-inset-bottom))" }}
          >
            <p className="px-3 pb-1.5 pt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              Lainnya
            </p>
            {MOBILE_MORE.map((item) => {
              const Icon = item.icon;
              const on = active(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-3.5 rounded-2xl px-3 py-3 text-sm transition ${
                    on
                      ? "bg-lime-400/10 font-medium text-lime-200"
                      : "text-zinc-300 hover:bg-white/[0.04]"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${
                      on
                        ? "bg-lime-400/10 text-lime-300 ring-lime-300/20"
                        : "bg-white/[0.04] text-zinc-400 ring-white/[0.06]"
                    }`}
                  >
                    <Icon size={17} />
                  </span>
                  {item.label}
                  {on && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-lime-300" />}
                </Link>
              );
            })}
            {role === "ADMIN" && (
              <Link
                href="/admin"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3.5 rounded-2xl px-3 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.04]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-zinc-400 ring-1 ring-white/[0.06]">
                  <ShieldCheck size={17} />
                </span>
                Panel Admin
              </Link>
            )}
          </div>
        </>
      )}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-[#060806]/92 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5">
          {MOBILE_MAIN.map((item) => {
            const Icon = item.icon;
            const on = active(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${FOCUS} ${
                  on ? "text-lime-300" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {on && <span className="absolute top-0 h-[2px] w-8 rounded-b-full bg-lime-300 shadow-[0_0_10px_rgba(190,242,100,0.9)]" />}
                <Icon size={20} strokeWidth={on ? 2.4 : 2} />
                {item.short}
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${
              moreOpen || MOBILE_MORE.some((item) => active(item))
                ? "text-lime-300"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            aria-expanded={moreOpen}
          >
            <Menu size={20} strokeWidth={moreOpen ? 2.4 : 2} />
            More
          </button>
        </div>
      </nav>
    </>
  );
}
