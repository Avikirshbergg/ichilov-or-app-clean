import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Apple,
  ArrowRight,
  Check,
  Copy,
  Download,
  Share,
  Smartphone,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { logInstallEvent } from "@/lib/analytics.functions";
import {
  clearDeferredPrompt,
  detectInAppBrowser,
  getDeferredPrompt,
  getOrCreateAnonymousId,
  isIos,
  isStandalone,
  subscribeToPrompt,
  type PromptEvent,
} from "@/lib/install-utils";

export const Route = createFileRoute("/install")({
  head: () => ({
    meta: [
      { title: "התקנת האפליקציה — חדר ניתוח איכילוב" },
      {
        name: "description",
        content: "מדריך התקנה של אפליקציית חדר ניתוח איכילוב על אייפון ואנדרואיד, שלב אחר שלב.",
      },
      { property: "og:title", content: "התקנת האפליקציה — חדר ניתוח איכילוב" },
      {
        property: "og:description",
        content: "מדריך התקנה לאייפון ולאנדרואיד של האפליקציה הפנימית לצוות.",
      },
    ],
  }),
  component: InstallPage,
});

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {n}
      </span>
      <span className="flex-1 text-sm leading-relaxed text-foreground">{children}</span>
    </li>
  );
}

function InstallPage() {
  const [deferred, setDeferred] = useState<PromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [inApp, setInApp] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const anonymousIdRef = useRef("");

  useEffect(() => {
    anonymousIdRef.current = getOrCreateAnonymousId();
    setIos(isIos());
    setInApp(detectInAppBrowser());
    setInstalled(isStandalone());
    setUrl(window.location.origin);
    setDeferred(getDeferredPrompt());
    const unsubscribe = subscribeToPrompt(setDeferred);
    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      unsubscribe();
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice?.outcome) {
        void logInstallEvent({
          data: {
            anonymous_id: anonymousIdRef.current,
            outcome: choice.outcome,
            platform: choice.platform || null,
            user_agent: window.navigator.userAgent,
          },
        });
      }
    } catch {
      // ignore
    } finally {
      clearDeferredPrompt();
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("הקישור הועתק — הדביקו אותו בכרום או בספארי");
    } catch {
      toast.error("לא הצלחנו להעתיק, העתיקו ידנית מסרגל הכתובות");
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-background pb-16">
      <div className="mx-auto w-full max-w-lg px-4 pt-6">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground"
        >
          <ArrowRight className="size-4" />
          חזרה לדף הבית
        </Link>

        <h1 className="text-xl font-bold text-foreground">התקנת האפליקציה בטלפון</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          האפליקציה מותקנת ישירות מהדפדפן — אין צורך בחנות אפליקציות, בהרשמה או בסיסמה.
        </p>

        {installed ? (
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm font-semibold text-primary">
            <Check className="size-5" />
            האפליקציה כבר מותקנת במכשיר הזה.
          </div>
        ) : null}

        {inApp ? (
          <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">
                  פתחתם את הקישור מתוך {inApp}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  בדפדפן מוטמע אי אפשר להתקין. העתיקו את הקישור ופתחו אותו בכרום (אנדרואיד) או
                  בספארי (אייפון), ואז חזרו לעמוד הזה.
                </p>
                <button
                  onClick={copyLink}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground active:opacity-90"
                >
                  <Copy className="size-4" />
                  העתקת הקישור
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {deferred && !installed ? (
          <button
            onClick={install}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground active:opacity-90"
          >
            <Download className="size-5" />
            התקן עכשיו
          </button>
        ) : null}

        <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Apple className="size-5 text-primary" />
            אייפון / אייפד (ספארי)
          </h2>
          <ol className="mt-3 space-y-3">
            <Step n={1}>פתחו את האפליקציה בדפדפן <b>ספארי</b> (לא בכרום ולא מתוך וואטסאפ).</Step>
            <Step n={2}>
              לחצו על כפתור <b>שיתוף</b>
              <Share className="mx-1 inline size-4 align-text-bottom" />
              בתחתית המסך.
            </Step>
            <Step n={3}>גללו ברשימה ובחרו <b>«הוסף למסך הבית»</b>.</Step>
            <Step n={4}>לחצו <b>«הוסף»</b> בפינה — הסמל יופיע במסך הבית.</Step>
          </ol>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Smartphone className="size-5 text-primary" />
            אנדרואיד (כרום)
          </h2>
          <ol className="mt-3 space-y-3">
            <Step n={1}>פתחו את האפליקציה בדפדפן <b>כרום</b>.</Step>
            <Step n={2}>לחצו על <b>שלוש הנקודות</b> בפינה הימנית העליונה.</Step>
            <Step n={3}>
              בחרו <b>«התקן אפליקציה»</b> או <b>«הוספה למסך הבית»</b>.
            </Step>
            <Step n={4}>אשרו — הסמל יופיע במסך הבית.</Step>
          </ol>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-muted/40 p-4">
          <h2 className="text-sm font-bold text-foreground">לא רואים את אפשרות ההתקנה?</h2>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-xs leading-relaxed text-muted-foreground">
            <li>אם דחיתם פעם אחת את ההצעה — הדפדפן לא יציע שוב. השתמשו בתפריט הדפדפן לפי ההוראות למעלה, זה תמיד עובד.</li>
            <li>אל תפתחו את הקישור מתוך וואטסאפ, מייל או פייסבוק — העתיקו אותו לדפדפן.</li>
            <li>באייפון ההתקנה אפשרית רק דרך <b>ספארי</b>.</li>
            <li>ודאו שהדפדפן מעודכן ושאינכם בגלישה פרטית.</li>
            <li>עדיין תקוע? העתיקו את הקישור ופתחו מחדש בחלון דפדפן רגיל.</li>
          </ul>
          {!inApp ? (
            <button
              onClick={copyLink}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground active:bg-accent"
            >
              <Copy className="size-4" />
              העתקת קישור האפליקציה
            </button>
          ) : null}
        </section>
      </div>
    </main>
  );
}
