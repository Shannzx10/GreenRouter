import {
  Environment,
  LogLevel,
  Paddle,
  type PaddleOptions,
} from "@paddle/paddle-node-sdk";

// Satu-satunya tempat instance SDK Paddle dibuat. Dipakai route webhook
// (verifikasi tanda tangan tidak memanggil API) dan kelak pekerjaan
// server lain yang butuh API Paddle (portal pelanggan, sinkronisasi
// langganan). API key TIDAK pernah boleh terekspos ke browser.
export function getPaddleInstance() {
  const options: PaddleOptions = {
    environment:
      (process.env.NEXT_PUBLIC_PADDLE_ENV as Environment) ??
      Environment.sandbox,
    logLevel: LogLevel.error,
  };
  if (!process.env.PADDLE_API_KEY) {
    throw new Error("PADDLE_API_KEY is not set");
  }
  return new Paddle(process.env.PADDLE_API_KEY, options);
}
