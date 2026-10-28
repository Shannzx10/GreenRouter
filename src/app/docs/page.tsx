import { redirect } from "next/navigation";

// Dokumentasi kini tinggal di area user (/app/docs) dan wajib login.
// Alamat lama ini dipertahankan agar tautan lama tetap sampai.
export default function DocsRedirect() {
  redirect("/app/docs");
}
