import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X, PenLine, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listSignatures, signMeeting } from "@/lib/signatures.functions";

export function MeetingSignDialog({
  fileId,
  fileName,
  onClose,
}: {
  fileId: string;
  fileName: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const list = useServerFn(listSignatures);
  const sign = useServerFn(signMeeting);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);

  const queryKey = ["meeting-signatures", fileId] as const;
  const { data: signatures = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => list({ data: { fileId } }),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await sign({ data: { fileId, fileName, name: name.trim(), role: role.trim() } });
      toast.success("החתימה נקלטה. תודה!");
      setName("");
      setRole("");
      await queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "החתימה נכשלה");
    } finally {
      setBusy(false);
    }
  }

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
            <PenLine className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-foreground">אישור קריאה וחתימה</h2>
            <p className="truncate text-xs text-muted-foreground">{fileName}</p>
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

        <form onSubmit={submit} className="mb-5 space-y-3">
          <p className="rounded-2xl bg-secondary px-4 py-3 text-xs leading-relaxed text-foreground">
            אני מאשר/ת שקראתי את סיכום הישיבה במלואו והבנתי את תוכנו.
          </p>
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
            disabled={busy || name.trim().length < 2}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <PenLine className="size-4" />}
            אני מאשר/ת שקראתי
          </button>
        </form>

        <h3 className="mb-2 text-xs font-bold text-foreground">
          חתמו עד כה ({signatures.length})
        </h3>
        <ul className="overflow-hidden rounded-2xl border border-border">
          {isLoading && <li className="px-4 py-3 text-xs text-muted-foreground">טוען...</li>}
          {!isLoading && signatures.length === 0 && (
            <li className="px-4 py-3 text-xs text-muted-foreground">אף אחד עדיין לא חתם</li>
          )}
          {signatures.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
            >
              <CheckCircle2 className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 text-sm text-foreground">
                {s.name}
                {s.role ? <span className="text-muted-foreground"> — {s.role}</span> : null}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(s.at).toLocaleDateString("he-IL")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
