import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "./LoginForm";

// Halaman ini membaca sesi (cookie) saat request, jangan di-prerender.
export const instant = false;

// Sudah login tidak perlu melihat halaman ini lagi: lempar ke areanya.
export default async function UserLoginPage() {
  await connection();
  const s = await getSession();
  if (s) redirect(s.role === "ADMIN" ? "/admin" : "/app");
  return <LoginForm />;
}
