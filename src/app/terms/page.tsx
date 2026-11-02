import type { Metadata } from "next";
import { LegalPage, LegalSection } from "../LegalPage";

export const metadata: Metadata = {
  title: "Syarat Layanan · GreenRouter",
  description:
    "Syarat dan ketentuan penggunaan layanan GreenRouter, satu key untuk semua model AI.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Syarat Layanan">
      <LegalSection heading="1. Tentang layanan">
        <p>
          GreenRouter adalah layanan yang menyediakan akses ke berbagai model AI
          melalui satu API key dan satu API terpadu. Dengan mendaftar dan
          menggunakan GreenRouter, kamu menyetujui syarat layanan ini.
        </p>
      </LegalSection>

      <LegalSection heading="2. Akun dan API key">
        <p>
          Kamu bertanggung jawab atas akunmu dan atas setiap API key yang dibuat
          dari akunmu, termasuk seluruh aktivitas yang terjadi melalui key
          tersebut. Jaga kerahasiaan key kamu; apabila key diduga bocor, segera
          buat key baru dan hapus key lama dari dashboard.
        </p>
        <p>
          Pendaftaran hanya dapat dilakukan melalui penyedia masuk yang tersedia
          di halaman pendaftaran. Satu orang hanya boleh memiliki akun sesuai
          kebutuhan wajar penggunaan layanan.
        </p>
      </LegalSection>

      <LegalSection heading="3. Kuota dan batas pemakaian">
        <p>
          Setiap plan memiliki batas token per siklus 7 hari dan batas jumlah
          request per jam, sebagaimana ditampilkan di halaman profil akunmu.
          Siklus berjalan berjangkar pada tanggal akun dibuat dan diperbarui
          otomatis. Pemakaian dihitung dari catatan penggunaan di sistem kami
          dan bersifat final. Upaya mengakali perhitungan kuota, termasuk
          membuat banyak akun untuk menghindari batas, dilarang.
        </p>
      </LegalSection>

      <LegalSection heading="4. Plan berbayar dan pembayaran">
        <p>
          Plan berbayar ditagih di muka per bulan dan diperpanjang otomatis
          sampai dibatalkan. Pembayaran diproses oleh Paddle, mitra pembayaran
          kami yang bertindak sebagai merchant of record; dengan berlangganan,
          kamu juga menyetujui ketentuan pembelian dari Paddle. Apabila
          pembayaran perpanjangan gagal, plan akun kembali ke plan Gratis
          setelah masa tenggang yang berlaku.
        </p>
        <p>
          Ketentuan pengembalian dana diatur terpisah di Kebijakan
          Pengembalian.
        </p>
      </LegalSection>

      <LegalSection heading="5. Penggunaan yang dilarang">
        <p>
          Kamu tidak boleh menggunakan layanan untuk melanggar hukum, melanggar
          hak pihak lain, menyebarkan konten yang melanggar hukum, mengganggu
          atau merusak layanan, atau mencoba mengakses sistem di luar hak
          aksesmu. Pelanggaran dapat berakibat penangguhan atau penghapusan
          akun sesuai kebijakan kami, termasuk pemblokiran pendaftaran ulang.
        </p>
      </LegalSection>

      <LegalSection heading="6. Ketersediaan layanan">
        <p>
          Kami berupaya menjaga layanan tetap tersedia dan cepat, namun layanan
          disediakan sebagaimana adanya tanpa jaminan ketersediaan tanpa henti.
          Katalog model dapat berubah sewaktu-waktu mengikuti ketersediaan
          model yang kami sediakan.
        </p>
      </LegalSection>

      <LegalSection heading="7. Perubahan syarat">
        <p>
          Syarat ini dapat diperbarui dari waktu ke waktu. Versi terbaru selalu
          tersedia di halaman ini, dan penggunaan layanan setelah perubahan
          berlaku berarti kamu menyetujui versi tersebut.
        </p>
      </LegalSection>

      <LegalSection heading="8. Hukum yang berlaku dan kontak">
        <p>
          Syarat ini diatur oleh hukum Republik Indonesia. Pertanyaan mengenai
          syarat layanan dapat disampaikan ke shannmoderz@gmail.com.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
