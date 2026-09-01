import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, ExternalLink, Loader2, Search, Workflow } from "lucide-react";
import logo from "@/assets/logo.png";
import { buildFlowchartFor } from "@/lib/flowchart.functions";
import { CategoryBrowser } from "@/components/CategoryBrowser";

export const Route = createFileRoute("/flowcharts")({
  head: () => ({
    meta: [
      { title: "תרשימי זרימה לפעולות — חדר ניתוח איכילוב" },
      {
        name: "description",
        content: "הקלידו שם פעולה בחדר הניתוח וקבלו תרשים זרימה של השלבים לפי נהלי המחלקה.",
      },
      { property: "og:title", content: "תרשימי זרימה לפעולות — חדר ניתוח איכילוב" },
      { property: "og:description", content: "שלבי ביצוע מסודרים לפעולות בחדר הניתוח." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FlowchartsPage,
});

type Result = { reply: string; sources: Array<{ name: string; url: string }> };

function FlowchartsPage() {
  const runFlow = useServerFn(buildFlowchartFor);
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = action.trim();
    if (value.length < 2 || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await runFlow({ data: { action: value } });
      setResult(res as Result);
    } catch {
      setResult({ reply: "אירעה תקלה. נסו שוב.", sources: [] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-background pb-12">
      <div className="mx-auto w-full max-w-lg px-4 pt-6">
        <header className="mb-6 flex items-center gap-3">
          <img src={logo} alt="לוגו המחלקה" width={44} height={44} className="size-11" />
          <div>
            <h1 className="text-lg font-bold text-foreground">תרשימי זרימה</h1>
            <p className="text-xs text-muted-foreground">שלבי ביצוע לפעולות בחדר הניתוח</p>
          </div>
        </header>

        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-accent"
        >
          <ArrowRight className="size-4" />
          חזרה לדף הבית
        </Link>

        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
        >
          <label htmlFor="action" className="mb-2 block text-sm font-medium text-foreground">
            שם הפעולה
          </label>
          <div className="flex gap-2">
            <input
              id="action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="לדוגמה: קליטת מטופל לחדר ניתוח"
              className="min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            <button
              type="submit"
              disabled={loading || action.trim().length < 2}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              הצג
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            התרשים נבנה אך ורק מתוך קובצי הנהלים שבתיקיית הדרייב של המחלקה.
          </p>
        </form>

        {loading && (
          <div className="mt-5 flex items-center justify-center gap-2 rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            <Loader2 className="size-4 animate-spin" />
            בונה את תרשים הזרימה...
          </div>
        )}

        {result && !loading && (
          <section className="mt-5 rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
              <Workflow className="size-4 text-primary" />
              תרשים זרימה: {action.trim()}
            </h2>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {result.reply}
            </div>
            {result.sources.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">קובצי מקור:</p>
                <ul className="space-y-1">
                  {result.sources.map((s) => (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-2 hover:underline"
                      >
                        <ExternalLink className="size-3.5" />
                        {s.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
        <CategoryBrowser category="flowcharts" title="תיקיות תרשימי הזרימה" />
      </div>
    </main>
  );
}
