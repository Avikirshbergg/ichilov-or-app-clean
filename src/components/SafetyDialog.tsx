import { X, ShieldCheck } from "lucide-react";

export function SafetyDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:rounded-3xl"
      >
        <div className="mb-4 flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
            <ShieldCheck className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-foreground">מדוע האפליקציה בטיחותית?</h2>
            <p className="text-xs text-muted-foreground">מידע קצר לצוות על אבטחה ופרטיות.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 text-sm text-foreground">
          <section>
            <p className="font-bold text-primary">1. האם האפליקציה יכולה לסכן את הטלפון?</p>
            <p className="text-muted-foreground">
              לא. זו אפליקציית PWA — אתר אינטרנט שמקבל סמל במסך הבית. היא לא מותקנת כאפליקציה רגילה ואין לה גישה למערכת ההפעלה או לקבצים האישיים.
            </p>
          </section>
          <section>
            <p className="font-bold text-primary">2. מה האפליקציה לא יכולה לעשות?</p>
            <p className="text-muted-foreground">
              אין גישה לאנשי קשר, תמונות, וידאו, קבצים, מצלמה, מיקרופון, SMS או וואטסאפ. לא ניתן להתקין דרכה תוכנות נוספות.
            </p>
          </section>
          <section>
            <p className="font-bold text-primary">3. מיקום — מתי מבקשים ולמה?</p>
            <p className="text-muted-foreground">
              רק בעת לחיצה על "נוכחות בישיבות צוות". המיקום נבדק כדי לוודא שנוכחות מתבצעת בבית החולים (רחוב ויצמן 6, תל אביב). המיקום לא נשמר ולא מועבר.
            </p>
          </section>
          <section>
            <p className="font-bold text-primary">4. האם המידע מאובטח?</p>
            <p className="text-muted-foreground">
              כן. כל התקשורת מוצפנת בפרוטוקול HTTPS. הנהלים והקבצים מאוחסנים במערכת מאובטחת ואינם נגישים לציבור.
            </p>
          </section>
          <section>
            <p className="font-bold text-primary">5. איך מסירים את האפליקציה?</p>
            <p className="text-muted-foreground">
              לחיצה ארוכה על הסמל במסך הבית ובחירת "הסרה". זה מסיר רק את הקיצור ולא פוגע במכשיר.
            </p>
          </section>
          <section>
            <p className="font-bold text-primary">6. מי יכול לנהל את התוכן?</p>
            <p className="text-muted-foreground">
              רק מנהלים מאושרים באמצעות כניסה לאזור ניהול מוגן. הצוות הרגיל יכול לצפות בלבד.
            </p>
          </section>
          <p className="pt-2 text-xs text-muted-foreground">
            לשאלות נוספות — פנו למנהלי חדר הניתוח.
          </p>
        </div>
      </div>
    </div>
  );
}
