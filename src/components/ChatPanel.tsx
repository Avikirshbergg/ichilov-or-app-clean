import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, Sparkles, FileText } from "lucide-react";
import { sendChatMessage, listProcedures } from "@/lib/chat.functions";

type Source = { name: string; url: string };
type Msg = { role: "user" | "assistant"; content: string; sources?: Source[] };

export function ChatPanel() {
  const send = useServerFn(sendChatMessage);
  const fetchDocs = useServerFn(listProcedures);
  const { data: docs } = useQuery({ queryKey: ["drive-procedures"], queryFn: () => fetchDocs() });
  const suggestions = (docs ?? []).slice(0, 4).map((d) => d.name);

  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "שלום 👋 אני עונה אך ורק מתוך קובצי הנהלים שבתיקיית הנהלים של המחלקה. אם המידע לא מופיע בהם — אומר זאת.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function submit(text: string) {
    const clean = text.trim();
    if (!clean || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: clean }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await send({
        data: { messages: next.filter((m, i) => !(i === 0 && m.role === "assistant")) },
      });
      setMessages([...next, { role: "assistant", content: res.reply, sources: res.sources }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "אירעה תקלה. נסו שוב." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
      <header className="flex items-center gap-3 border-b border-border bg-secondary px-4 py-3">
        <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold text-foreground">נהלי חדר ניתוח איכילוב</h2>
        </div>
      </header>

      <div className="flex h-[52vh] min-h-72 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "max-w-[85%] self-start rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground"
                : "max-w-[90%] self-end rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm leading-relaxed text-foreground"
            }
          >
            <div className="prose prose-sm max-w-none [&_li]:my-0.5 [&_p]:my-1 [&_strong]:font-bold">
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
            {m.sources && m.sources.length > 0 && (
              <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2">
                {m.sources.map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-2 hover:underline"
                  >
                    <FileText className="size-3.5 shrink-0" />
                    <span className="truncate">פתיחת קובץ המקור: {s.name}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="self-end rounded-2xl bg-muted px-4 py-2.5 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 overflow-x-auto border-t border-border px-4 pt-3 pb-1">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => submit(`מה כתוב בנוהל "${s}"?`)}
            className="max-w-56 shrink-0 truncate rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-secondary-foreground transition-colors active:bg-accent"
          >
            {s}
          </button>
        ))}
      </div>


      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="flex items-center gap-2 px-4 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="כתבו שאלה..."
          className="h-11 flex-1 rounded-2xl border border-input bg-background px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          aria-label="שליחה"
        >
          <Send className="size-4 -scale-x-100" />
        </button>
      </form>
    </section>
  );
}
