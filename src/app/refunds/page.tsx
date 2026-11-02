import type { Metadata } from "next";
import { LegalPage, LegalSection } from "../LegalPage";

export const metadata: Metadata = {
  title: "Kebijakan Pengembalian · GreenRouter",
  description:
    "Ketentuan pembatalan langganan dan pengembalian dana untuk plan berbayar GreenRouter.",
};

export default function RefundsPage() {
  return (
    <LegalPage title="Kebijakan Pengembalian">
      <LegalSection heading="1. Membatalkan langganan">
        <p>
          Kamu dapat membatalkan plan berbayar kapan saja dari halaman profil
          atau portal pelanggan yang tersedia. Pembatalan menghentikan
          perpanjangan berikutnya; plan berbayarmu tetap aktif sampai akhir
          periode yang sudah dibayar, setelah itu akun kembali ke plan Gratis
          secara otomatis. Tidak ada biaya pembatalan.
        </p>
      </LegalSection>

      <LegalSection heading="2. Pengembalian dana">
        <p>
          Karena kuota plan langsung tersedia penuh di awal periode, dana untuk
          periode yang sedang berjalan pada prinsipnya tidak dapat
          dikembalikan, terutama atas kuota yang sudah terpakai.
        </p>
        <p>Pengecualian yang selalu kami kabulkan:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Penagihan ganda untuk periode yang sama.</li>
          <li>
            Penagihan yang terjadi karena kesalahan teknis di pihak kami.
          </li>
          <li>
            Kamu dikenai biaya untuk plan yang tidak pernah aktif di akunmu.
          </li>
        </ul>
        <p>
          Di luar itu, permintaan pengembalian ditinjau per kasus berdasarkan
          waktu permintaan dan pemakaian kuota pada periode berjalan.
        </p>
      </LegalSection>

      <LegalSection heading="3. Cara mengajukan">
        <p>
          Sampaikan permintaan ke shannmoderz@gmail.com dari alamat email
          akunmu, sertakan tanggal penagihan dan alasannya. Permintaan yang
          dikabulkan diproses melalui Paddle ke metode pembayaran asal; waktu
          penyelesaian mengikuti ketentuan penerbit metode pembayaranmu,
          umumnya beberapa hari kerja.
        </p>
      </LegalSection>

      <LegalSection heading="4. Plan Gratis">
        <p>
          Plan Gratis tidak melibatkan pembayaran apa pun, sehingga tidak ada
          ketentuan pengembalian yang berlaku untuknya.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
