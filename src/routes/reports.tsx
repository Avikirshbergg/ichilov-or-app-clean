import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Lock,
  BarChart3,
  AlertTriangle,
  Sparkles,
  Loader2,
  FileText,
  Download,
  Smartphone,
  CheckCircle2,
  XCircle,
  Monitor,
} from "lucide-react";
import { toast } from "sonner";
import { getQuestionReport, getGapInsights, getInstallReport } from "@/lib/analytics.functions";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "דוחות וסטטיסטיקה — חדר ניתוח איכילוב" },
      { name: "description", content: "דוח שאלות והתקנות אפליקציה — אזור מנהלים בלבד." },
      { property: "og:title", content: "דוחות וסטטיסטיקה — חדר ניתוח איכילוב" },
      { property: "og:description", content: "דוח שאלות והתקנות אפליקציה — אזור מנהלים בלבד." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

type Report = Awaited<ReturnType<typeof getQuestionReport>>;
type InstallReport = Awaited<ReturnType<typeof getInstallReport>>;

const SURFACE_LABELS: Record<string, string> = {
  chat: "צ'אט נהלים",
  kardex: "קרדקסים",
  flowcharts: "תרשימי זרימה",
};

const OUTCOME_LABELS: Record<string, string> = {
  accepted: "התקבלה",
  dismissed: "נדחתה",
  appinstalled: "הותקנה",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function ReportsPage() {
  const [code, setCode] = useState("");
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<"questions" | "installs">("questions");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [installReport, setInstallReport] = useState<InstallReport | null>(null);
  const [installLoading, setInstallLoading] = useState(false);

  const fetchReport = useServerFn(getQuestionReport);
  const fetchInsight = useServerFn(getGapInsights);
  const fetchInstallReport = useServerFn(getInstallReport);

  async function load(nextDays = days, nextCode = code) {
    setLoading(true);
    try {
      const data = await fetchReport({ data: { code: nextCode, days: nextDays } });
      setReport(data);
      setInsight(null);
    } catch {
      toast.error("קוד שגוי או שגיאה בטעינת הדוח");
    } finally {
      setLoading(false);
    }
  }

  async function loadInstalls(nextDays = days, nextCode = code) {
    setInstallLoading(true);
    try {
      const data = await fetchInstallReport({ data: { code: nextCode, days: nextDays } });
      setInstallReport(data);
    } catch {
      toast.error("קוד שגוי או שגיאה בטעינת דוח ההתקנות");
    } finally {
      setInstallLoading(false);
    }
  }

  async function loadInsight() {
    setInsightLoading(true);
    try {
      const res = await fetchInsight({ data: { code, days } });
      setInsight(res.insight);
    } catch {
      toast.error("שגיאה בהפקת הניתוח");
    } finally {
      setInsightLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "installs" && !installLoading && !installReport && report) {
      void loadInstalls();
    }
  }, [tab, report]);

  function exportQuestionsCsv() {
    if (!report) return;
    const rows = [["תאריך", "שאלה", "נענה", "מקור", "מסך"]].concat(
      report.recent.map((r) => [
        fmtDate(r.created_at),
        r.question.replace(/"/g, "'"),
        r.answered ? "כן" : "לא",
        r.sources.join(" | "),
        SURFACE_LABELS[r.surface] ?? r.surface,
      ]),
    );
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "שאלות-צוות.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportInstallsCsv() {
    if (!installReport) return;
    const rows = [["תאריך", "תוצאה", "פלטפורמה", "מזהה אנונימי"]].concat(
      installReport.recent.map((r) => [
        fmtDate(r.created_at),
        OUTCOME_LABELS[r.outcome] ?? r.outcome,
        r.platform ?? "לא ידוע",
        r.anonymous_id,
      ]),
    );
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "התקנות-אפליקציה.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main dir="rtl" className="min-h-screen bg-background pb-12">
      <div className="mx-auto w-full max-w-lg px-4 pt-6">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-accent"
        >
          <ArrowRight className="size-4" />
          חזרה לדף הבית
        </Link>

        <h1 className="mb-1 flex items-center gap-2 text-lg font-bold text-foreground">
          <BarChart3 className="size-5 text-primary" />
          דוחות וסטטיסטיקה
        </h1>
        <p className="mb-6 text-xs text-muted-foreground">אזור פרטי — נדרש קוד מנהל</p>

        {!report ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void load();
            }}
            className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
          >
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Lock className="size-4 text-primary" />
              קוד מנהל
            </label>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mb-3 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              placeholder="הזן קוד"
            />
            <button
              type="submit"
              disabled={loading || !code}
              className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {loading ? "טוען..." : "הצג דוח"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              {[7, 30, 90, 365].map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDays(d);
                    if (tab === "questions") {
                      void load(d);
                    } else {
                      void loadInstalls(d);
                    }
                  }}
                  className={`flex-1 rounded-2xl border px-2 py-2 text-xs font-medium transition-colors ${
                    days === d ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
                  }`}
                >
                  {d === 365 ? "שנה" : `${d} ימים`}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setTab("questions")}
                className={`flex-1 rounded-2xl border px-2 py-2 text-xs font-medium transition-colors ${
                  tab === "questions" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
                }`}
              >
                דוח שאלות
              </button>
              <button
                onClick={() => setTab("installs")}
                className={`flex-1 rounded-2xl border px-2 py-2 text-xs font-medium transition-colors ${
                  tab === "installs" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
                }`}
              >
                דוח התקנות
              </button>
            </div>

            {tab === "questions" ? (
              <QuestionsDashboard
                report={report}
                loading={loading}
                insight={insight}
                insightLoading={insightLoading}
                onInsight={loadInsight}
                onExport={exportQuestionsCsv}
              />
            ) : (
              <InstallsDashboard
                report={installReport}
                loading={installLoading}
                onExport={exportInstallsCsv}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function QuestionsDashboard({
  report,
  loading,
  insight,
  insightLoading,
  onInsight,
  onExport,
}: {
  report: Report;
  loading: boolean;
  insight: string | null;
  insightLoading: boolean;
  onInsight: () => void;
  onExport: () => void;
}) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        <Loader2 className="mx-auto mb-2 size-5 animate-spin text-primary" />
        טוען דוח שאלות...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="שאלות" value={String(report.total)} />
        <Stat label="נענו" value={`${report.answerRate}%`} />
        <Stat label="ללא מענה" value={String(report.unanswered)} tone="warn" />
      </div>

      {report.total === 0 && (
        <p className="rounded-3xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
          עדיין אין שאלות מתועדות בטווח הזמן הזה. הדוח יתמלא ככל שהצוות ישתמש בצ'אט.
        </p>
      )}

      {report.gapTopics.length > 0 && (
        <Card title="מה הצוות לא יודע — נושאים ללא מענה" icon={<AlertTriangle className="size-4 text-destructive" />}>
          <div className="flex flex-wrap gap-2">
            {report.gapTopics.map((t) => (
              <span key={t.topic} className="rounded-full bg-destructive/10 px-3 py-1 text-xs text-destructive">
                {t.topic} · {t.count}
              </span>
            ))}
          </div>
        </Card>
      )}

      {report.hotTopics.length > 0 && (
        <Card title="נושאים מבוקשים" icon={<Sparkles className="size-4 text-primary" />}>
          <div className="flex flex-wrap gap-2">
            {report.hotTopics.map((t) => (
              <span key={t.topic} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                {t.topic} · {t.count}
              </span>
            ))}
          </div>
        </Card>
      )}

      {report.topQuestions.length > 0 && (
        <Card title="שאלות נפוצות" icon={<FileText className="size-4 text-primary" />}>
          <ul className="space-y-2">
            {report.topQuestions.map((q) => (
              <li key={q.question} className="flex items-start justify-between gap-3 text-sm text-foreground">
                <span className="flex-1">{q.question}</span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">×{q.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {report.recentUnanswered.length > 0 && (
        <Card title="שאלות שלא נמצאה להן תשובה בנהלים" icon={<AlertTriangle className="size-4 text-destructive" />}>
          <ul className="space-y-2">
            {report.recentUnanswered.map((q) => (
              <li key={q.id} className="text-sm text-foreground">
                {q.question}
                <span className="mr-2 text-xs text-muted-foreground">
                  {fmtDate(q.created_at)} · {SURFACE_LABELS[q.surface] ?? q.surface}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {report.topSources.length > 0 && (
        <Card title="הנהלים הכי נשאלים" icon={<FileText className="size-4 text-primary" />}>
          <ul className="space-y-2">
            {report.topSources.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-3 text-sm text-foreground">
                <span className="flex-1">{s.key}</span>
                <span className="shrink-0 text-xs text-muted-foreground">×{s.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {report.bySurface.length > 0 && (
        <Card title="לפי מסך" icon={<BarChart3 className="size-4 text-primary" />}>
          <ul className="space-y-2">
            {report.bySurface.map((s) => (
              <li key={s.key} className="flex items-center justify-between text-sm text-foreground">
                <span>{SURFACE_LABELS[s.key] ?? s.key}</span>
                <span className="text-xs text-muted-foreground">{s.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="ניתוח פערי ידע (AI)" icon={<Sparkles className="size-4 text-primary" />}>
        {insight ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{insight}</p>
        ) : (
          <button
            onClick={() => void onInsight()}
            disabled={insightLoading || report.total === 0}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {insightLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            הפק ניתוח והמלצות הדרכה
          </button>
        )}
      </Card>

      <button
        onClick={onExport}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground"
      >
        <Download className="size-4" />
        ייצוא לאקסל (CSV)
      </button>
    </div>
  );
}

function InstallsDashboard({
  report,
  loading,
  onExport,
}: {
  report: InstallReport | null;
  loading: boolean;
  onExport: () => void;
}) {
  if (loading || !report) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        <Loader2 className="mx-auto mb-2 size-5 animate-spin text-primary" />
        טוען דוח התקנות...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="אירועי התקנה" value={String(report.total)} />
        <Stat label="התקנות שהושלמו" value={String(report.acceptedCount)} />
        <Stat label="משתמשים ייחודיים" value={String(report.uniqueAccepted)} />
      </div>

      {report.total === 0 ? (
        <p className="rounded-3xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
          עדיין אין התקנות מתועדות בטווח הזמן הזה. הדוח יתמלא כאשר משתמשים ילחצו על "התקן עכשיו" בבאנר ההתקנה.
        </p>
      ) : (
        <>
          <Card title="שיעור המרה" icon={<CheckCircle2 className="size-4 text-primary" />}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">אחוז שקיבל את ההתקנה מתוך כל האירועים</span>
              <span className="text-lg font-bold text-primary">{report.acceptedRate}%</span>
            </div>
          </Card>

          {report.byOutcome.length > 0 && (
            <Card title="תוצאות התקנה" icon={<Smartphone className="size-4 text-primary" />}>
              <ul className="space-y-2">
                {report.byOutcome.map((o) => (
                  <li key={o.key} className="flex items-center justify-between text-sm text-foreground">
                    <span className="flex items-center gap-2">
                      {o.key === "accepted" ? (
                        <CheckCircle2 className="size-4 text-primary" />
                      ) : (
                        <XCircle className="size-4 text-muted-foreground" />
                      )}
                      {OUTCOME_LABELS[o.key] ?? o.key}
                    </span>
                    <span className="text-xs text-muted-foreground">{o.count}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {report.byPlatform.length > 0 && (
            <Card title="פלטפורמות" icon={<Monitor className="size-4 text-primary" />}>
              <ul className="space-y-2">
                {report.byPlatform.map((p) => (
                  <li key={p.key} className="flex items-center justify-between text-sm text-foreground">
                    <span>{p.key}</span>
                    <span className="text-xs text-muted-foreground">{p.count}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {report.byDay.length > 0 && (
            <Card title="התקנות לפי יום" icon={<BarChart3 className="size-4 text-primary" />}>
              <ul className="space-y-2">
                {report.byDay.map((d) => (
                  <li key={d.day} className="flex items-center justify-between text-sm text-foreground">
                    <span>{fmtDate(d.day)}</span>
                    <span className="text-xs text-muted-foreground">{d.count}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {report.recent.length > 0 && (
            <Card title="אירועים אחרונים" icon={<FileText className="size-4 text-primary" />}>
              <ul className="space-y-2">
                {report.recent.slice(0, 20).map((r) => (
                  <li key={r.id} className="text-sm text-foreground">
                    <span className="font-medium">{OUTCOME_LABELS[r.outcome] ?? r.outcome}</span>
                    <span className="mr-2 text-xs text-muted-foreground">
                      {fmtDate(r.created_at)} · {r.platform ?? "לא ידוע"} · {r.anonymous_id}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      <button
        onClick={onExport}
        disabled={report.total === 0}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground disabled:opacity-50"
      >
        <Download className="size-4" />
        ייצוא לאקסל (CSV)
      </button>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 text-center shadow-[var(--shadow-card)]">
      <div className={`text-xl font-bold ${tone === "warn" ? "text-destructive" : "text-primary"}`}>{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
