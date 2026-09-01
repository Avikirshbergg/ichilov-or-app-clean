import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays } from "lucide-react";
import logo from "@/assets/logo.png";
import { CategoryBrowser } from "@/components/CategoryBrowser";

export const Route = createFileRoute("/conferences")({
  head: () => ({
    meta: [
      { title: "ימי עיון וכנסים — חדר ניתוח איכילוב" },
      {
        name: "description",
        content:
          "חומרים מימי עיון וכנסים של חדר הניתוח: תיקיות לפי נושא או אירוע, קבצים להורדה וקישור לקובץ המקור בדרייב.",
      },
      { property: "og:title", content: "ימי עיון וכנסים — חדר ניתוח איכילוב" },
      { property: "og:description", content: "כל חומרי הכנסים וימי העיון במקום אחד." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConferencesPage,
});

function ConferencesPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-background pb-12">
      <div className="mx-auto w-full max-w-lg px-4 pt-6">
        <header className="mb-6 flex items-center gap-3">
          <img src={logo} alt="לוגו המחלקה" width={44} height={44} className="size-11" />
          <div>
            <h1 className="text-lg font-bold text-foreground">ימי עיון וכנסים</h1>
            <p className="text-xs text-muted-foreground">חומרי עיון וכנסים מסודרים לפי נושא</p>
          </div>
        </header>

        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-accent"
        >
          <ArrowRight className="size-4" />
          חזרה לדף הבית
        </Link>

        <div className="flex items-center gap-2 rounded-3xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-[var(--shadow-card)]">
          <CalendarDays className="size-4 shrink-0 text-primary" />
          כל חומרי הכנסים וימי העיון מסודרים בתיקיות לפי נושא. לחצו על תיקייה כדי לפתוח את הקבצים שבתוכה.
        </div>

        <CategoryBrowser
          category="conferences"
          title="תיקיות וכנסים"
          searchPlaceholder="חיפוש תיקייה או קובץ כנס..."
        />
      </div>
    </main>
  );
}
