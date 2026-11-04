import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import UserSidebar from "./UserSidebar";

// Area user selalu dirender saat request (data runtime, tanpa prerender).
export const instant = false;

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.suspended) redirect("/suspended");
  return (
    <div className="lp-grain relative min-h-screen bg-[#060806] lg:flex">
      <div className="lp-grid pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-70" />
      <div className="pointer-events-none absolute right-0 top-0 h-[320px] w-[520px] max-w-full rounded-full bg-lime-400/[0.06] blur-[110px]" />
      <UserSidebar email={session.email} role={session.role} plan={session.plan} />
      <main className="relative min-w-0 flex-1 px-4 pb-28 pt-[76px] sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
        {children}
      </main>
    </div>
  );
}
