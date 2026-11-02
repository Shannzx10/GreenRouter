import { NextRequest } from "next/server";
import { getPaddleInstance } from "@/lib/paddle";
import { processPaddleEvent } from "@/server/paddle-events";

// Webhook Paddle. Kontrak pengiriman Paddle: hanya respons 2xx dalam
// 5 detik yang dianggap terkirim; selain itu event dikirim ulang dengan
// jadwal backoff. Karena itu handler ini ramping: verifikasi tanda
// tangan, serahkan ke processPaddleEvent, lalu akui. Satu catch untuk
// semua kegagalan (tanda tangan salah, secret yang baru diganti,
// payload rusak) membalas non-2xx yang sama, karena unmarshal() tidak
// membedakan sebabnya dan non-2xx apa pun aman: event akan dicoba lagi.
export async function POST(request: NextRequest) {
  const signature = request.headers.get("paddle-signature") ?? "";
  // Wajib body mentah: verifikasi tanda tangan menghitung HMAC atas
  // byte persis seperti yang dikirim Paddle. Jangan request.json().
  const rawBody = await request.text();
  const secret = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET ?? "";

  if (!signature || !rawBody) {
    return Response.json(
      { error: "Missing signature or body" },
      { status: 400 },
    );
  }

  try {
    const paddle = getPaddleInstance();
    const eventData = await paddle.webhooks.unmarshal(
      rawBody,
      secret,
      signature,
    );

    if (eventData) {
      await processPaddleEvent(eventData);
    }

    return Response.json({ received: true });
  } catch (e) {
    console.error("[paddle] webhook error:", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
