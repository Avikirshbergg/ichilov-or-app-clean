import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ChevronLeft, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { listCategoryFiles } from "@/lib/chat.functions";

const queryKey = ["drive-category", "incidents"] as const;

export const Route = createFileRoute("/incidents")({
  head: () => ({
    meta: [
      { title: "סקירת אירוע חריג וכמעט אירוע — חדר ניתוח איכילוב" },
      {
        name: "description",
        content: "סקירות אירוע חריג וכמעט אירוע בחדר הניתוח, כולל תאריך עדכון וקישור לקובץ המקור בדרייב.",
      },
      { property: "og:title", content: "סקירת אירוע חריג וכמעט אירוע — חדר ניתוח איכילוב" },
      { property: "og:description", content: "כל סקירות האירוע החריג וכמעט אירוע במקום אחד." },
    ],
  }),
  component: IncidentsPage,
});

function IncidentsPage() {
  const fetchFiles = useServerFn(listCategoryFiles);
  const { data: incidents } = useSuspenseQuery({
    queryKey,
    queryFn: () => fetchFiles({ data: { category: "incidents" } }),
  });

  return (
    <main dir="rtl" className="min-h-screen bg-background pb-12">
      <div className="mx-auto w-full max-w-lg px-4 pt-6">
        <header className="mb-6 flex items-center gap-3">
          <img src={logo} alt="לוגו המחלקה" width={44} height={44} className="size-11" />
          <div>
            <h1 className="text-lg font-bold text-foreground">סקירת אירוע חריג וכמעט אירוע</h1>
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

        {incidents.length === 0 ? (
          <p className="rounded-3xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            לא נמצאו סקירות אירוע חריג וכמעט אירוע. אפשר להעלות קבצים באזור הניהול, בלשונית "ניהול אירוע חריג וכמעט אירוע".
          </p>
        ) : (
          <ul className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
            {incidents.map((file) => (
              <li key={file.id} className="border-b border-border last:border-0">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-4 transition-colors active:bg-accent"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <AlertTriangle className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{file.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      עודכן: {new Date(file.modified).toLocaleDateString("he-IL")}
                    </span>
                  </span>
                  <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
