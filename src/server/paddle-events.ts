import { type EventEntity, EventName } from "@paddle/paddle-node-sdk";

// Paddle mengirim dengan jaminan at-least-once dan TANPA urutan yang
// pasti: event.eventId yang sama tiba di setiap pengiriman ulang, dan
// event lama bisa tiba sesudah event yang lebih baru. Karena itu setiap
// handler di sini kelak WAJIB idempoten: UPSERT berdasarkan id resource
// Paddle dan hanya diterapkan bila event.occurredAt lebih baru dari
// nilai yang tersimpan.
//
// Status sekarang: fondasi. Handler masih kosong karena pemetaan
// langganan ke plan dan limit user baru bisa ditulis setelah struktur
// tier plan diputuskan dan katalog Paddle dibuat. Event yang belum
// ditangani dicatat lalu diabaikan (bukan error), supaya pengiriman
// tetap diakui 200 dan tidak memicu pengiriman ulang sia-sia.
export async function processPaddleEvent(event: EventEntity) {
  switch (event.eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionCanceled:
    case EventName.SubscriptionPastDue:
      // TODO(sinkronisasi langganan): cerminkan status langganan ke
      // user pemiliknya lalu terapkan limit sesuai plan-nya.
      console.log("[paddle] event langganan diterima:", event.eventType, event.eventId);
      return;
    case EventName.TransactionCompleted:
    case EventName.TransactionPaymentFailed:
      // TODO(sinkronisasi langganan): catat transaksi; pembayaran yang
      // gagal pada perpanjangan memengaruhi status langganan lewat
      // event subscription.past_due, bukan dari sini.
      console.log("[paddle] event transaksi diterima:", event.eventType, event.eventId);
      return;
    case EventName.CustomerCreated:
    case EventName.CustomerUpdated:
      console.log("[paddle] event pelanggan diterima:", event.eventType, event.eventId);
      return;
    default:
      // Event yang tidak kita langgani penanganannya: abaikan.
      return;
  }
}
