import {
  type EventEntity,
  EventName,
  type Subscription,
} from "@paddle/paddle-node-sdk";
import { prisma } from "@/lib/db";
import { planById, planByPriceId } from "@/lib/plans";

// Paddle mengirim dengan jaminan at-least-once dan TANPA urutan yang
// pasti. Pertahanan di sini: setiap penulisan keadaan langganan ke User
// dijaga paddleLastEventAt, event yang occurredAt-nya tidak lebih baru
// dari yang terakhir diterapkan akan diabaikan, jadi pengiriman ulang
// dan event lama yang tiba belakangan tidak mengubah apa pun.
//
// Pemetaan user: customData.userId yang ditanam saat checkout adalah
// jembatan utama; cadangan berurutan id langganan lalu id pelanggan.
// Semantik status mengikuti rujukan Paddle: active, trialing, dan
// past_due berarti plan berbayar berlaku (past_due adalah masa tenggang
// penagihan ulang); paused dan canceled berarti langganan benar-benar
// berhenti sehingga akun kembali ke plan Gratis. Pembatalan yang baru
// dijadwalkan TIDAK menurunkan plan, karena statusnya tetap active
// sampai tanggal efektifnya dan event penutupnya tiba kemudian.
const PAID_STATUSES = new Set(["active", "trialing", "past_due"]);

async function resolveUser(sub: Subscription) {
  const raw = sub.customData?.userId;
  const userId = typeof raw === "string" ? raw : null;
  if (userId) {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (u) return u;
  }
  const bySub = await prisma.user.findFirst({
    where: { paddleSubscriptionId: sub.id },
  });
  if (bySub) return bySub;
  return prisma.user.findFirst({ where: { paddleCustomerId: sub.customerId } });
}

async function handleSubscription(event: EventEntity) {
  const sub = event.data as Subscription;
  const user = await resolveUser(sub);
  if (!user) {
    console.warn(
      "[paddle] event langganan tanpa user yang cocok:",
      event.eventType,
      sub.id,
    );
    return;
  }

  const occurredAt = new Date(event.occurredAt);
  if (user.paddleLastEventAt && occurredAt <= user.paddleLastEventAt) {
    return; // Event lama atau duplikat: keadaan yang tersimpan lebih baru.
  }

  let plan = planById("gratis");
  if (PAID_STATUSES.has(sub.status)) {
    const mapped = planByPriceId(sub.items[0]?.price?.id);
    if (mapped) {
      plan = mapped;
    } else if (user.paddleSubscriptionId === sub.id && user.plan !== "gratis") {
      // Price tidak dikenal (mis. price lama): pertahankan plan yang ada
      // selama langganannya sendiri masih berlaku.
      plan = planById(user.plan);
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: plan.id,
      tokenLimit: plan.tokenLimit,
      requestLimitHourly: plan.requestLimitHourly,
      paddleCustomerId: sub.customerId,
      paddleSubscriptionId: sub.id,
      paddleSubStatus: sub.status,
      paddleLastEventAt: occurredAt,
      paddleCancelAt:
        sub.scheduledChange?.action === "cancel"
          ? new Date(sub.scheduledChange.effectiveAt)
          : null,
    },
  });
  console.log(
    "[paddle] langganan diterapkan:",
    sub.id,
    "status",
    sub.status,
    "-> user",
    user.email,
    "plan",
    plan.id,
  );
}

async function handleCustomer(event: EventEntity) {
  const data = event.data as { id: string; email?: string };
  if (!data.email) return;
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (user && user.paddleCustomerId !== data.id) {
    await prisma.user.update({
      where: { id: user.id },
      data: { paddleCustomerId: data.id },
    });
  }
}

export async function processPaddleEvent(event: EventEntity) {
  switch (event.eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionCanceled:
    case EventName.SubscriptionPastDue:
    case EventName.SubscriptionPaused:
    case EventName.SubscriptionResumed:
      return handleSubscription(event);
    case EventName.TransactionCompleted:
    case EventName.TransactionPaymentFailed:
      // Keadaan plan digerakkan event langganan; transaksi hanya dicatat.
      console.log("[paddle] event transaksi diterima:", event.eventType, event.eventId);
      return;
    case EventName.CustomerCreated:
    case EventName.CustomerUpdated:
      return handleCustomer(event);
    default:
      return;
  }
}
