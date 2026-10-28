import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import RegisterForm from "./RegisterForm";

// Halaman ini membaca sesi (cookie) saat request, jangan di-prerender.
export const instant = false;

// Sudah login tidak perlu mendaftar lagi: lempar ke areanya.
export default async function RegisterPage() {
  await connection();
  const s = await getSession();
  if (s) redirect(s.role === "ADMIN" ? "/admin" : "/app");
  return <RegisterForm />;
}
