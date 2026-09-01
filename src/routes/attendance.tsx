import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, MapPin, CheckCircle2, Loader2, UserCheck, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { listAttendance, signAttendance } from "@/lib/attendance.functions";
import { getDeviceId } from "@/lib/device-id";

function todayIsrael() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
}

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "נוכחות בישיבות צוות — חדר ניתוח איכילוב" },
      {
        name: "description",
        content:
          "חתימת נוכחות בישיבות צוות חדר הניתוח, מאומתת לפי מיקום פיזי בבית החולים ברחוב ויצמן 6 תל אביב.",
      },
      { property: "og:title", content: "נוכחות בישיבות צוות — חדר ניתוח איכילוב" },
      { property: "og:description", content: "חתימת נוכחות מבוססת מיקום לישיבות הצוות." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const queryClient = useQueryClient();
  const list = useServerFn(listAttendance);
  const sign = useServerFn(signAttendance);

  const [meetingDate, setMeetingDate] = useState(todayIsrael());
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  const queryKey = ["meeting-attendance", meetingDate] as const;
  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => list({ data: { meetingDate } }),
  });

  function getPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        reject(new Error("המכשיר אינו תומך באיתור מיקום"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, (err) => {
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "כדי לחתום נוכחות יש לאשר גישה למיקום"
              : "לא הצלחנו לאתר את המיקום. נסו שוב",
          ),
        );
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setLocating(true);
    try {
      const pos = await getPosition();
      setLocating(false);
      await sign({
        data: {
          meetingDate,
          name: name.trim(),
          role: role.trim(),
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          deviceId: getDeviceId(),
        },
      });
      toast.success("הנוכחות נרשמה. תודה!");
      setName("");
      setRole("");
      await queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "רישום הנוכחות נכשל", { duration: 7000 });
    } finally {
      setLocating(false);
      setBusy(false);
    }
  }

  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(meetingDate) && !isNaN(Date.parse(meetingDate));

  return (
    <main dir="rtl" className="min-h-screen bg-background pb-12">
      <div className="mx-auto w-full max-w-lg px-4 pt-6">
        <header className="mb-6 flex items-center gap-3">
          <img src={logo} alt="לוגו המחלקה" width={44} height={44} className="size-11" />
          <div>
            <h1 className="text-lg font-bold text-foreground">נוכחות בישיבות צוות</h1>
            <p className="text-xs text-muted-foreground">חתימה מאומתת לפי מיקום בבית החולים</p>
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
          onSubmit={submit}
          className="mb-5 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
        >
          <p className="mb-3 flex items-start gap-2 rounded-2xl bg-secondary px-4 py-3 text-xs leading-relaxed text-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            החתימה אפשרית רק ממיקום פיזי בבית החולים — ויצמן 6, תל אביב. בעת החתימה תתבקשו לאשר
            גישה למיקום.
          </p>
          <div className="space-y-3">
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background py-3 pr-9 pl-4 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="שם מלא"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
            />
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="תפקיד (לא חובה)"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={busy || !isValidDate || name.trim().length < 2}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />}
              {locating ? "מאתר מיקום..." : busy ? "רושם נוכחות..." : "חתימת נוכחות"}
            </button>
          </div>
        </form>

        <h2 className="mb-2 text-sm font-bold text-foreground">
          רישומי נוכחות לתאריך {new Date(meetingDate + "T00:00:00").toLocaleDateString("he-IL")} ({rows.length})
        </h2>
        <ul className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
          {isLoading && <li className="px-4 py-4 text-sm text-muted-foreground">טוען...</li>}
          {!isLoading && rows.length === 0 && (
            <li className="px-4 py-4 text-sm text-muted-foreground">אין עדיין רישומי נוכחות לתאריך זה</li>
          )}
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
            >
              <CheckCircle2 className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">
                  {r.name}
                  {r.role ? <span className="text-muted-foreground"> — {r.role}</span> : null}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {new Date(r.date + "T00:00:00").toLocaleDateString("he-IL")} · {new Date(r.at).toLocaleString("he-IL")}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{r.distance} מ׳</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
