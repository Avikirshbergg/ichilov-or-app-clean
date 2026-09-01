import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, ChevronLeft, FileText, Folder, Loader2, Search } from "lucide-react";
import { listCategoryFiles } from "@/lib/chat.functions";

type Props = {
  category: string;
  title: string;
  searchPlaceholder?: string;
};

export function CategoryBrowser({ category, title, searchPlaceholder }: Props) {
  const fetchFiles = useServerFn(listCategoryFiles);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ["category-files", category],
    queryFn: () => fetchFiles({ data: { category } }),
  });

  const groups = useMemo(() => {
    const q = query.trim();
    const list = (data ?? []).filter(
      (f) => !q || f.name.includes(q) || (f.folder ?? "").includes(q),
    );
    const map = new Map<string, typeof list>();
    for (const f of list) {
      const key = f.folder ?? "כללי";
      const arr = map.get(key) ?? [];
      arr.push(f);
      map.set(key, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "he"));
  }, [data, query]);

  const searching = query.trim().length > 0;
  const total = (data ?? []).length;

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">
          {isLoading ? "טוען..." : `${total} קבצים`}
        </span>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder ?? "חיפוש תיקייה או קובץ..."}
          className="h-11 w-full rounded-2xl border border-input bg-card pr-10 pl-4 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
        {isLoading && (
          <div className="flex justify-center px-4 py-8 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}
        {isError && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            לא ניתן לטעון את הקבצים כרגע.
          </div>
        )}
        {!isLoading && !isError && groups.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">לא נמצאו קבצים</div>
        )}
        {groups.map(([folder, files]) => {
          const expanded = searching || open[folder];
          return (
            <div key={folder} className="border-b border-border last:border-0">
              <button
                type="button"
                onClick={() => setOpen((s) => ({ ...s, [folder]: !s[folder] }))}
                className="flex w-full items-center gap-3 px-4 py-3 text-right transition-colors active:bg-accent"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Folder className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {folder}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {files.length} קבצים
                  </span>
                </span>
                {expanded ? (
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
                )}
              </button>
              {expanded && (
                <ul className="bg-background/40">
                  {files.map((f) => (
                    <li key={f.id} className="border-t border-border">
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 py-2.5 pr-10 pl-4 transition-colors active:bg-accent"
                      >
                        <FileText className="size-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-foreground">{f.name}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            עודכן {new Date(f.modified).toLocaleDateString("he-IL")}
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
