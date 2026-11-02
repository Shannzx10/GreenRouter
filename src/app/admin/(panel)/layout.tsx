import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "./Sidebar";

// Area admin selalu dirender saat request (data runtime, tanpa prerender).
export const instant = false;

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.suspended) redirect("/suspended");
  if (session.role !== "ADMIN") redirect("/app");
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar email={session.email} />
      <main className="min-w-0 flex-1 px-4 pb-28 pt-[76px] sm:px-6 lg:px-10 lg:pb-10 lg:pt-10">
        {children}
      </main>
    </div>
  );
}
