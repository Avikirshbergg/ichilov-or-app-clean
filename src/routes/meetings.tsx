import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users, ChevronLeft, ArrowRight, PenLine } from "lucide-react";
import logo from "@/assets/logo.png";
import { listCategoryFiles } from "@/lib/chat.functions";
import { MeetingSignDialog } from "@/components/MeetingSignDialog";

const queryKey = ["drive-category", "meetings"] as const;

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "סיכומי ישיבות צוות — חדר ניתוח איכילוב" },
      {
        name: "description",
        content: "סיכומי ישיבות הצוות של חדר הניתוח, כולל תאריך עדכון וקישור לקובץ המקור בדרייב.",
      },
      { property: "og:title", content: "סיכומי ישיבות צוות — חדר ניתוח איכילוב" },
      { property: "og:description", content: "כל סיכומי ישיבות הצוות במקום אחד." },
    ],
  }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const fetchFiles = useServerFn(listCategoryFiles);
  const [signing, setSigning] = useState<{ id: string; name: string } | null>(null);
  const { data: meetings } = useSuspenseQuery({
    queryKey,
    queryFn: () => fetchFiles({ data: { category: "meetings" } }),
  });

  return (
    <main dir="rtl" className="min-h-screen bg-background pb-12">
      <div className="mx-auto w-full max-w-lg px-4 pt-6">
        <header className="mb-6 flex items-center gap-3">
          <img src={logo} alt="לוגו המחלקה" width={44} height={44} className="size-11" />
          <div>
            <h1 className="text-lg font-bold text-foreground">סיכומי ישיבות צוות</h1>
            <p className="text-xs text-muted-foreground">מתוך תיקיית הדרייב של המחלקה</p>
          </div>
        </header>

        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-accent"
        >
          <ArrowRight className="size-4" />
          חזרה לדף הבית
        </Link>

        {meetings.length === 0 ? (
          <p className="rounded-3xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            לא נמצאו סיכומי ישיבות. אפשר להעלות קבצים באזור הניהול, בלשונית "ניהול סיכומי ישיבות".
          </p>
        ) : (
          <ul className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
            {meetings.map((file) => (
              <li key={file.id} className="border-b border-border last:border-0">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 pt-4 transition-colors active:bg-accent"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Users className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{file.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      עודכן: {new Date(file.modified).toLocaleDateString("he-IL")}
                    </span>
                  </span>
                  <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
                </a>
                <div className="px-4 pb-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setSigning({ id: file.id, name: file.name })}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-secondary px-4 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-accent"
                  >
                    <PenLine className="size-4" />
                    קראתי — לחתימה
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {signing && (
        <MeetingSignDialog
          fileId={signing.id}
          fileName={signing.name}
          onClose={() => setSigning(null)}
        />
      )}
    </main>
  );
}
