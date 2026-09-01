import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, ChevronLeft, ArrowRight, Search, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import logo from "@/assets/logo.png";
import { listCategoryFiles } from "@/lib/chat.functions";
import { verifyAdmin, deleteFile } from "@/lib/admin.functions";

const queryKey = ["drive-category", "policies"] as const;

export const Route = createFileRoute("/policies")({
  head: () => ({
    meta: [
      { title: "רשימת נהלים — חדר ניתוח איכילוב" },
      {
        name: "description",
        content:
          "רשימת כל קבצי ה-PDF של נהלי חדר הניתוח איכילוב, כולל תאריך עדכון וקישור ל-Google Drive.",
      },
      { property: "og:title", content: "רשימת נהלים — חדר ניתוח איכילוב" },
      { property: "og:description", content: "כל קבצי הנהלים של חדר הניתוח במקום אחד." },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey,
      queryFn: () => listCategoryFiles({ data: { category: "policies" } }),
    });
  },
  component: PoliciesPage,
});

function PoliciesPage() {
  const fetchFiles = useServerFn(listCategoryFiles);
  const queryClient = useQueryClient();
  const verify = useServerFn(verifyAdmin);
  const remove = useServerFn(deleteFile);
  const { data: files } = useSuspenseQuery({
    queryKey,
    queryFn: () => fetchFiles({ data: { category: "policies" } }),
  });
  const [query, setQuery] = useState("");
  const [showUnlock, setShowUnlock] = useState(false);
  const [code, setCode] = useState("");
  const [adminCode, setAdminCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim();
    return q ? files.filter((f) => f.name.includes(q)) : files;
  }, [files, query]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await verify({ data: { code } });
      setAdminCode(code);
      setShowUnlock(false);
      setCode("");
      toast.success("מצב עריכה פעיל");
    } catch {
      toast.error("קוד שגוי");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!adminCode) return;
    if (!confirm(`למחוק את "${name}"?`)) return;
    setBusy(true);
    try {
      const result = await remove({ data: { code: adminCode, fileId: id } });
      if (!result.ok) {
        toast.error(result.message, { duration: 7000 });
        return;
      }
      toast.success(result.message);
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: ["drive-procedures"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "מחיקה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-background pb-12">
      <div className="mx-auto w-full max-w-lg px-4 pt-6">
        <header className="mb-6 flex items-center gap-3">
          <img src={logo} alt="לוגו המחלקה" width={44} height={44} className="size-11" />
          <div>
            <h1 className="text-lg font-bold text-foreground">רשימת נהלים</h1>
            <p className="text-xs text-muted-foreground">כל קבצי ה-PDF של חדר הניתוח</p>
          </div>
        </header>

        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-accent"
        >
          <ArrowRight className="size-4" />
          חזרה לדף הבית
        </Link>

        <div className="relative mb-4">
          <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש נוהל..."
            className="h-11 w-full rounded-2xl border border-input bg-card pr-10 pl-4 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
          />
        </div>

        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{filtered.length} קבצים</span>
          {adminCode ? (
            <button
              type="button"
              onClick={() => setAdminCode(null)}
              className="text-xs font-medium text-primary"
            >
              סיום מצב מחיקה
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowUnlock((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"
            >
              <Lock className="size-3" />
              מחיקת נהלים (מנהל)
            </button>
          )}
        </div>

        {showUnlock && !adminCode && (
          <form
            onSubmit={unlock}
            className="mb-4 flex gap-2 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]"
          >
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="קוד מנהל"
              className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-ring"
            />
            <button
              type="submit"
              disabled={busy || !code}
              className="rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              כניסה
            </button>
          </form>
        )}

        <ul className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
          {filtered.map((file) => (
            <li key={file.id} className="flex items-center border-b border-border last:border-0">
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 transition-colors active:bg-accent"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <FileText className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{file.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    עודכן: {new Date(file.modified).toLocaleDateString("he-IL")}
                  </span>
                </span>
                {!adminCode && <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />}
              </a>
              {adminCode && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDelete(file.id, file.name)}
                  aria-label={`מחיקת ${file.name}`}
                  className="ml-3 shrink-0 rounded-xl p-2 text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">לא נמצאו נהלים</li>
          )}
        </ul>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          הקבצים נטענים מתיקיית הדרייב של המחלקה. לחיצה על נוהל תפתח אותו ב-Google Drive.
        </p>
      </div>
    </main>
  );
}
