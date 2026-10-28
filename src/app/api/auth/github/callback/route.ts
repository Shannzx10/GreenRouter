import { finishOAuth } from "@/lib/oauth";

export async function GET(req: Request) {
  return finishOAuth("github", req);
}
