import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, UserPlus } from "lucide-react";
import logo from "@/assets/logo.png";
import { CategoryBrowser } from "@/components/CategoryBrowser";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "קליטת אחיות חדשות — חדר ניתוח איכילוב" },
      {
        name: "description",
        content:
          "חומרי קליטה לאחיות חדשות בחדר הניתוח: תיקיות לפי נושא, קבצים להורדה וקישור ישיר לקובץ המקור.",
      },
      { property: "og:title", content: "קליטת אחיות חדשות — חדר ניתוח איכילוב" },
      { property: "og:description", content: "כל חומרי הקליטה לאחיות חדשות במקום אחד." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-background pb-12">
      <div className="mx-auto w-full max-w-lg px-4 pt-6">
        <header className="mb-6 flex items-center gap-3">
          <img src={logo} alt="לוגו המחלקה" width={44} height={44} className="size-11" />
          <div>
            <h1 className="text-lg font-bold text-foreground">קליטת אחיות חדשות</h1>
            <p className="text-xs text-muted-foreground">חומרי קליטה והתמצאות לצוות חדש</p>
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
          <UserPlus className="size-4 shrink-0 text-primary" />
          כל חומרי הקליטה מסודרים בתיקיות לפי נושא. לחצו על תיקייה כדי לפתוח את הקבצים שבתוכה.
        </div>

        <CategoryBrowser
          category="onboarding"
          title="תיקיות הקליטה"
          searchPlaceholder="חיפוש תיקייה או קובץ קליטה..."
        />
      </div>
    </main>
  );
}
