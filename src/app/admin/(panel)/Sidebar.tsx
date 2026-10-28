"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronsLeft,
  ChevronsRight,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Network,
  ScrollText,
  Server,
  Users,
} from "lucide-react";
import ConfirmModal from "@/app/ConfirmModal";

const NAV = [
  { href: "/admin", label: "Ringkasan", short: "Ringkasan", icon: LayoutDashboard, exact: true },
  { href: "/admin/announcements", label: "Pengumuman", short: "Info", icon: Megaphone, exact: false },
  { href: "/admin/providers", label: "Provider", short: "Provider", icon: Server, exact: false },
  { href: "/admin/users", label: "Pengguna", short: "User", icon: Users, exact: false },
  { href: "/admin/models", label: "Model & Route", short: "Model", icon: Network, exact: false },
  { href: "/admin/api-keys", label: "Key Klien", short: "Key", icon: KeyRound, exact: false },
  { href: "/admin/logs", label: "Log Pemakaian", short: "Log", icon: ScrollText, exact: false },
];

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

// Tab utama bar bawah mobile hanya 4 + tombol More; sisanya (Model, Key,
// Log) masuk panel "More" agar bar tidak sesak. Sidebar desktop tetap 7.
const MOBILE_MAIN = NAV.slice(0, 4);
const MOBILE_MORE = NAV.slice(4);

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // Sidebar desktop bisa diciutkan jadi rel ikon; DEFAULT-nya ciut, pilihan
  // terakhir user diingat per area (yang tersimpan hanya pengecualiannya).
  const [min, setMin] = useState(true);

  useEffect(() => {
    setMin(localStorage.getItem("gr-admin-sidebar") !== "full");
  }, []);

  function toggleMin() {
    setMin((v) => {
      localStorage.setItem("gr-admin-sidebar", v ? "full" : "min");
      return !v;
    });
  }

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  async function doLogout() {
    setLoggingOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const active = (item: (typeof NAV)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <>
      {/* ===== Sidebar desktop (bisa diciutkan) ===== */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.06] bg-white/[0.02] px-4 py-6 transition-[width] duration-300 lg:flex ${
          min ? "w-[76px]" : "w-64"
        }`}
      >
        <div className={`mb-8 ${min ? "flex justify-center" : "px-2"}`}>
          <Brand compact={min} />
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const on = active(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={min ? item.label : undefined}
                className={`flex items-center gap-3 whitespace-nowrap rounded-2xl py-2.5 text-sm transition ${
                  min ? "justify-center px-0" : "px-3.5"
                } ${
                  on
                    ? "bg-lime-400/10 font-medium text-lime-200"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
                }`}
              >
                <Icon size={18} className="shrink-0" />
                {!min && item.label}
                {on && !min && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-lime-300" />}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-white/[0.06] pt-4">
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
          {!min && <p className="mb-2 truncate px-2 text-xs text-zinc-500">{email}</p>}
          <button
            onClick={() => setLogoutOpen(true)}
            title={min ? "Keluar" : undefined}
            className={`flex w-full items-center gap-3 whitespace-nowrap rounded-2xl py-2.5 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-red-300 ${
              min ? "justify-center px-0" : "px-3.5"
            }`}
          >
            <LogOut size={18} className="shrink-0" /> {!min && "Keluar"}
          </button>
        </div>
      </aside>

      {/* ===== Topbar mobile ===== */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center border-b border-white/[0.06] bg-[#060806]/85 px-4 py-3 backdrop-blur-md lg:hidden">
        <Brand />
      </header>

      {/* ===== Navigasi bawah mobile: 4 tab utama + Menu ===== */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="glass fixed inset-x-3 z-40 rounded-3xl p-2 lg:hidden"
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
            <div className="mx-3 my-2 border-t border-white/[0.06]" />
            <button
              onClick={() => {
                setMoreOpen(false);
                setLogoutOpen(true);
              }}
              className="flex w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-sm text-red-300 transition hover:bg-red-500/10"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-300 ring-1 ring-red-400/20">
                <LogOut size={17} />
              </span>
              Keluar
            </button>
          </div>
        </>
      )}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-[#060806]/92 backdrop-blur-md lg:hidden"
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
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${
                  on ? "text-lime-300" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
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

      {logoutOpen && (
        <ConfirmModal
          icon={LogOut}
          tone="danger"
          title="Keluar dari GreenRouter?"
          description="Sesi admin kamu di perangkat ini akan diakhiri. Kamu harus masuk lagi untuk membuka panel admin."
          confirmLabel="Ya, Keluar"
          busy={loggingOut}
          onCancel={() => setLogoutOpen(false)}
          onConfirm={doLogout}
        />
      )}
    </>
  );
}
