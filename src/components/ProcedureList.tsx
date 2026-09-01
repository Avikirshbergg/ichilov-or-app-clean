import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Search, ChevronLeft, Loader2 } from "lucide-react";
import { listProcedures } from "@/lib/chat.functions";

export function ProcedureList() {
  const fetchDocs = useServerFn(listProcedures);
  const [query, setQuery] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["drive-procedures"],
    queryFn: () => fetchDocs(),
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    const q = query.trim();
    return q ? list.filter((p) => p.name.includes(q)) : list;
  }, [data, query]);

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-bold text-foreground">נהלים להורדה</h2>
        <span className="text-xs text-muted-foreground">
          {isLoading ? "טוען..." : `${filtered.length} קבצים`}
        </span>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש נוהל..."
          className="h-11 w-full rounded-2xl border border-input bg-card pr-10 pl-4 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
        />
      </div>

      <ul className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
        {isLoading && (
          <li className="flex justify-center px-4 py-8 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </li>
        )}
        {isError && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            לא ניתן לטעון את רשימת הנהלים כרגע.
          </li>
        )}
        {filtered.map((p) => (
          <li key={p.id} className="border-b border-border last:border-0">
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-accent"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                <FileText className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{p.name}</span>
                <span className="block text-[11px] text-muted-foreground">
                  עודכן {new Date(p.modified).toLocaleDateString("he-IL")}
                </span>
              </span>
              <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
            </a>
          </li>
        ))}
        {!isLoading && !isError && filtered.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">לא נמצאו נהלים</li>
        )}
      </ul>
    </section>
  );
}
