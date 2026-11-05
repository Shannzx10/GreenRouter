import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Perender markdown untuk jawaban model di Playground: blok kode,
// tebal, miring, judul, daftar, tabel, dan kutipan, diselaraskan
// dengan bahasa desain dashboard. HTML mentah dari model TIDAK
// dirender (tanpa rehype-raw) demi keamanan.
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed text-zinc-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-zinc-50">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          small: ({ children }) => <small className="text-xs text-zinc-400">{children}</small>,
          h1: ({ children }) => (
            <h1 className="mb-2 mt-4 text-lg font-bold text-zinc-50 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 text-base font-bold text-zinc-50 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-3 text-sm font-bold text-zinc-100 first:mt-0">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-1 mt-3 text-sm font-semibold text-zinc-100 first:mt-0">{children}</h4>
          ),
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1 pl-5 marker:text-lime-300/70">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-lime-300/70">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-lime-300 underline decoration-lime-300/40 underline-offset-2 transition hover:text-lime-200"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-lime-300/40 pl-3.5 italic text-zinc-400">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-white/[0.08]" />,
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-xl border border-white/[0.07] bg-black/50 p-3.5">
              {children}
            </pre>
          ),
          code: ({ children, className }) => {
            const text = String(children ?? "");
            const isBlock = (className ?? "").includes("language-") || text.includes("\n");
            if (isBlock) {
              return (
                <code className="font-mono text-xs leading-relaxed text-zinc-200">{children}</code>
              );
            }
            return (
              <code className="rounded-md bg-white/[0.08] px-1.5 py-0.5 font-mono text-[0.85em] text-lime-200">
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-left font-semibold text-zinc-100">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-white/[0.08] px-2.5 py-1.5">{children}</td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
