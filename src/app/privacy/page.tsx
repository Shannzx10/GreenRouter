import type { Metadata } from "next";
import { LegalPage, LegalSection } from "../LegalPage";

export const metadata: Metadata = {
  title: "Kebijakan Privasi · GreenRouter",
  description:
    "Bagaimana GreenRouter mengumpulkan, menggunakan, dan melindungi data penggunanya.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Kebijakan Privasi">
      <LegalSection heading="1. Data yang kami kumpulkan">
        <p>
          <strong className="text-zinc-200">Data akun.</strong> Nama dan alamat
          email dari penyedia masuk yang kamu pakai (Google atau GitHub),
          beserta foto profil yang mereka sediakan.
        </p>
        <p>
          <strong className="text-zinc-200">Data pemakaian.</strong> Catatan
          setiap request API yang kamu buat: model yang dipakai, jumlah token,
          status hasil, dan waktunya. Catatan ini diperlukan untuk menghitung
          kuota dan menampilkan riwayat pemakaian di dashboard kamu.
        </p>
        <p>
          <strong className="text-zinc-200">Data pembayaran.</strong>{" "}
          Pembayaran diproses sepenuhnya oleh Paddle sebagai merchant of
          record. Kami tidak menerima, memproses, atau menyimpan data kartu
          pembayaranmu; kami hanya menyimpan status langganan dan plan yang
          aktif untuk akunmu.
        </p>
      </LegalSection>

      <LegalSection heading="2. Bagaimana data digunakan">
        <p>
          Data digunakan untuk mengoperasikan layanan: otentikasi akun,
          penegakan kuota dan batas pemakaian, penagihan langganan, pencegahan
          penyalahgunaan, dan dukungan pengguna. Kami tidak menjual data
          pribadi pengguna kepada pihak mana pun.
        </p>
      </LegalSection>

      <LegalSection heading="3. Berbagi data">
        <p>
          Data dibagikan hanya seperlunya kepada penyedia yang menjalankan
          bagian dari layanan, terutama Paddle untuk pemrosesan pembayaran dan
          penagihan pajak, serta penyedia masuk (Google dan GitHub) untuk
          otentikasi. Di luar itu, data hanya dibagikan bila diwajibkan oleh
          hukum.
        </p>
      </LegalSection>

      <LegalSection heading="4. Isi request API">
        <p>
          Isi prompt dan respons model yang melewati API diteruskan ke model
          yang kamu pilih untuk diproses dan tidak disimpan sebagai riwayat
          percakapan oleh GreenRouter. Yang kami catat hanyalah metadata
          pemakaiannya sebagaimana disebut di atas.
        </p>
      </LegalSection>

      <LegalSection heading="5. Cookie">
        <p>
          Kami memakai cookie yang mutlak diperlukan untuk sesi masuk dan
          keamanan akun. Tidak ada cookie iklan atau pelacakan pihak ketiga di
          situs ini.
        </p>
      </LegalSection>

      <LegalSection heading="6. Penyimpanan dan keamanan">
        <p>
          Data disimpan selama akunmu aktif. Kata sandi disimpan dalam bentuk
          hash satu arah dan API key pengguna disimpan sebagai hash, sedangkan
          kredensial layanan disimpan terenkripsi. Catatan pemakaian yang
          terhubung ke akun yang dihapus tetap disimpan dalam bentuk agregat
          kuota tanpa kunci API yang aktif.
        </p>
      </LegalSection>

      <LegalSection heading="7. Hak kamu">
        <p>
          Kamu dapat meminta salinan, perbaikan, atau penghapusan data
          pribadimu dengan menghubungi shannmoderz@gmail.com. Penghapusan akun
          menghapus data akun dan seluruh API key, dan dapat berakibat
          berakhirnya langganan yang sedang berjalan.
        </p>
      </LegalSection>

      <LegalSection heading="8. Perubahan kebijakan">
        <p>
          Kebijakan ini dapat diperbarui dari waktu ke waktu; versi terbaru
          selalu tersedia di halaman ini.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
