import { Bot } from "lucide-react";

// Ikon merek provider berdasarkan keluarga model. Logo DeepSeek dan Z.ai
// di-host sendiri di public/assets/providers; MiniMax digambar sebagai SVG.
export function modelFamily(
  modelId: string,
): "deepseek" | "zai" | "minimax" | "kimi" | "qwen" | "mimo" | "minicpm" | "atria" | "mercury" | "hunyuan" | "generic" {
  const id = modelId.toLowerCase();
  if (id.startsWith("deepseek")) return "deepseek";
  if (id.startsWith("glm")) return "zai";
  if (id.startsWith("minimax")) return "minimax";
  if (id.startsWith("kimi")) return "kimi";
  if (id.startsWith("qwen")) return "qwen";
  if (id.startsWith("mimo")) return "mimo";
  if (id.startsWith("minicpm")) return "minicpm";
  if (id.startsWith("atria")) return "atria";
  if (id.startsWith("mercury")) return "mercury";
  if (id.startsWith("hy")) return "hunyuan";
  return "generic";
}

export function familyLabel(modelId: string): string {
  switch (modelFamily(modelId)) {
    case "deepseek":
      return "DeepSeek";
    case "zai":
      return "Z.ai";
    case "minimax":
      return "MiniMax";
    case "kimi":
      return "Kimi";
    case "qwen":
      return "Qwen";
    case "mimo":
      return "MiMo";
    case "minicpm":
      return "MiniCPM";
    case "atria":
      return "Atria";
    case "mercury":
      return "Mercury";
    case "hunyuan":
      return "Tencent";
    default:
      return "Model";
  }
}

export default function ProviderIcon({
  modelId,
  className = "h-11 w-11",
}: {
  modelId: string;
  className?: string;
}) {
  const family = modelFamily(modelId);
  if (family === "minimax") {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-[12px] bg-white ring-1 ring-white/15 ${className}`}
      >
        <svg viewBox="0 0 24 24" className="h-[55%] w-[55%]" fill="#F23F42" aria-hidden>
          <path d="M11.43 3.92a.86.86 0 1 0-1.718 0v14.236a1.999 1.999 0 0 1-3.997 0V9.022a.86.86 0 1 0-1.718 0v3.87a1.999 1.999 0 0 1-3.997 0V11.49a.57.57 0 0 1 1.139 0v1.404a.86.86 0 0 0 1.719 0V9.022a1.999 1.999 0 0 1 3.997 0v9.134a.86.86 0 0 0 1.719 0V3.92a1.998 1.998 0 1 1 3.996 0v11.788a.57.57 0 1 1-1.139 0zm10.572 3.105a2 2 0 0 0-1.999 1.997v7.63a.86.86 0 0 1-1.718 0V3.923a1.999 1.999 0 0 0-3.997 0v16.16a.86.86 0 0 1-1.719 0V18.08a.57.57 0 1 0-1.138 0v2a1.998 1.998 0 0 0 3.996 0V3.92a.86.86 0 0 1 1.719 0v12.73a1.999 1.999 0 0 0 3.996 0V9.023a.86.86 0 1 1 1.72 0v6.686a.57.57 0 0 0 1.138 0V9.022a2 2 0 0 0-1.998-1.997" />
        </svg>
      </span>
    );
  }
  if (family === "generic") {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-[12px] bg-white/[0.05] text-lime-300 ring-1 ring-white/10 ${className}`}
      >
        <Bot className="h-[55%] w-[55%]" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/assets/providers/${family}.png`}
      alt=""
      width={44}
      height={44}
      loading="lazy"
      className={`shrink-0 rounded-[12px] ring-1 ring-white/15 ${className}`}
    />
  );
}
