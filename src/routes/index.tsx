import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  Download,
  FileText,
  Film,
  MapPin,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  Workflow,
} from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo.png";
import { ChatPanel } from "@/components/ChatPanel";
import { ProcedureList } from "@/components/ProcedureList";
import { InstallBanner } from "@/components/InstallBanner";
import { SafetyDialog } from "@/components/SafetyDialog";




export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "חדר ניתוח איכילוב — אפליקציית עובדים" },
      {
        name: "description",
        content: "צ'אט ורשימת קבצי PDF של חדר הניתוח, זמינים לכל עובדי הצוות.",
      },
      { property: "og:title", content: "חדר ניתוח איכילוב" },
      { property: "og:description", content: "צ'אט ורשימת קבצים לצוות חדר הניתוח." },
    ],
  }),
  component: Index,
});

function Index() {
  const [safetyOpen, setSafetyOpen] = useState(false);

  return (
    <main dir="rtl" className="min-h-screen bg-background pb-16">
      <div className="mx-auto w-full max-w-lg px-4 pt-6">
        <header className="mb-6 flex items-center gap-3">
          <img src={logo} alt="לוגו המחלקה" width={44} height={44} className="size-11" />
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">ברוכים הבאים</h1>
            <p className="text-xs font-medium text-primary">אפליקציה פנימית לצוות</p>
            <p className="text-xs text-muted-foreground">by Avi Kirshberg</p>
          </div>
          <Link
            to="/admin"
            aria-label="אזור ניהול"
            className="rounded-xl p-2 text-muted-foreground/40 transition-colors hover:text-foreground"
          >
            <Settings className="size-4" />
          </Link>

          <button
            aria-label="מידע על בטיחות האפליקציה"
            onClick={() => setSafetyOpen(true)}
            className="rounded-xl p-2 text-muted-foreground/40 transition-colors hover:text-primary"
          >
            <ShieldCheck className="size-4" />
          </button>
        </header>

        <SafetyDialog open={safetyOpen} onClose={() => setSafetyOpen(false)} />

        <InstallBanner />

        <Link
          to="/install"
          className="mb-5 flex items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs font-semibold text-primary active:bg-primary/10"
        >
          <Download className="size-4" />
          איך מתקינים את האפליקציה בטלפון?
        </Link>



        <nav className="mb-5 grid grid-cols-3 gap-3">
          <Link
            to="/kardex"
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-2 py-4 text-center text-sm font-semibold text-foreground shadow-[var(--shadow-card)] transition-colors active:bg-accent"
          >
            <ClipboardList className="size-5 text-primary" />
            קרדקסים
          </Link>
          <Link
            to="/policies"
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-2 py-4 text-center text-sm font-semibold text-foreground shadow-[var(--shadow-card)] transition-colors active:bg-accent"
          >
            <FileText className="size-5 text-primary" />
            רשימת נהלים
          </Link>
          <Link
            to="/flowcharts"
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-2 py-4 text-center text-sm font-semibold text-foreground shadow-[var(--shadow-card)] transition-colors active:bg-accent"
          >
            <Workflow className="size-5 text-primary" />
            תרשימי זרימה
          </Link>
          <Link
            to="/meetings"
            className="col-span-3 flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-2 py-3 text-center text-sm font-semibold text-foreground shadow-[var(--shadow-card)] transition-colors active:bg-accent"
          >
            <Users className="size-5 text-primary" />
            סיכומי ישיבות צוות
          </Link>
          <Link
            to="/attendance"
            className="col-span-3 flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-2 py-3 text-center text-sm font-semibold text-foreground shadow-[var(--shadow-card)] transition-colors active:bg-accent"
          >
            <MapPin className="size-5 text-primary" />
            נוכחות בישיבות צוות
          </Link>
          <Link
            to="/incidents"
            className="col-span-3 flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-2 py-3 text-center text-sm font-semibold text-foreground shadow-[var(--shadow-card)] transition-colors active:bg-accent"
          >
            <AlertTriangle className="size-5 text-primary" />
            סקירת אירוע חריג וכמעט אירוע
          </Link>
          <Link
            to="/onboarding"
            className="col-span-3 flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-2 py-3 text-center text-sm font-semibold text-foreground shadow-[var(--shadow-card)] transition-colors active:bg-accent"
          >
            <UserPlus className="size-5 text-primary" />
            קליטת אחיות חדשות
          </Link>
          <Link
            to="/videos"
            className="col-span-3 flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-2 py-3 text-center text-sm font-semibold text-foreground shadow-[var(--shadow-card)] transition-colors active:bg-accent"
          >
            <Film className="size-5 text-primary" />
            הדרכה והכשרה
          </Link>
          <Link
            to="/conferences"
            className="col-span-3 flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-2 py-3 text-center text-sm font-semibold text-foreground shadow-[var(--shadow-card)] transition-colors active:bg-accent"
          >
            <CalendarDays className="size-5 text-primary" />
            ימי עיון וכנסים
          </Link>
        </nav>

        <ChatPanel />
        <ProcedureList />
      </div>
    </main>
  );
}
