import { useState, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Upload,
  Trash2,
  Lock,
  FileText,
  Loader2,
  Film,
  Play,
  ExternalLink,
  BarChart3,
  Folder,
  FolderPlus,
  ChevronLeft,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { listCategoryFiles } from "@/lib/chat.functions";
import {
  verifyAdmin,
  uploadPdf,
  uploadVideo,
  uploadTrainingFile,
  deleteFile,
  listCategoryFolders,
  createCategoryFolder,
  listFolderFiles,
  uploadPdfToFolder,
  listSubfoldersOfFolder,
  createSubfolderInFolder,
  renameFile,
} from "@/lib/admin.functions";
import { listVideos, addVideoUrl, removeVideoUrl } from "@/lib/videos.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "ניהול נהלים — חדר ניתוח איכילוב" },
      { name: "description", content: "אזור ניהול פרטי להעלאה ומחיקה של קובצי נהלים בחדר הניתוח." },
      { property: "og:title", content: "ניהול נהלים — חדר ניתוח איכילוב" },
      { property: "og:description", content: "אזור ניהול פרטי לניהול קובצי הנהלים." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(false);

  const verify = useServerFn(verifyAdmin);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    try {
      await verify({ data: { code } });
      setUnlocked(true);
    } catch {
      toast.error("קוד שגוי");
    } finally {
      setChecking(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-background pb-12">
      <div className="mx-auto w-full max-w-lg px-4 pt-6">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-accent"
        >
          <ArrowRight className="size-4" />
          חזרה לדף הבית
        </Link>

        <Link
          to="/reports"
          className="mb-5 mr-2 inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-accent"
        >
          <BarChart3 className="size-4 text-primary" />
          דוח שאלות הצוות
        </Link>

        <h1 className="mb-1 text-lg font-bold text-foreground">ניהול קבצים</h1>
        <p className="mb-6 text-xs text-muted-foreground">אזור פרטי — נדרש קוד מנהל</p>

        {!unlocked ? (
          <form
            onSubmit={submit}
            className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
          >
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Lock className="size-4 text-primary" />
              קוד מנהל
            </label>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mb-3 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              placeholder="הזן קוד"
            />
            <button
              type="submit"
              disabled={checking || !code}
              className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {checking ? "בודק..." : "כניסה"}
            </button>
          </form>
        ) : (
          <AdminPanel code={code} />
        )}
      </div>
    </main>
  );
}

const CATEGORY_TABS = [
  { id: "policies", label: "ניהול נהלים" },
  { id: "kardex", label: "ניהול קרדקסים" },
  { id: "meetings", label: "ניהול סיכומי ישיבות" },
  { id: "flowcharts", label: "ניהול תרשימי זרימה" },
  { id: "incidents", label: "ניהול אירוע חריג וכמעט אירוע" },
  { id: "onboarding", label: "ניהול קליטת אחיות חדשות" },
  { id: "conferences", label: "ניהול ימי עיון וכנסים" },
  { id: "videos", label: "ניהול הדרכה והכשרה" },
] as const;

type CategoryId = (typeof CATEGORY_TABS)[number]["id"];

function AdminPanel({ code }: { code: string }) {
  const [category, setCategory] = useState<CategoryId>("policies");
  const active = CATEGORY_TABS.find((t) => t.id === category)!;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCategory(tab.id)}
            className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition-colors ${
              tab.id === category
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-accent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <CategoryManager key={category} code={code} category={category} label={active.label} />
    </div>
  );
}

function CategoryManager({
  code,
  category,
  label,
}: {
  code: string;
  category: CategoryId;
  label: string;
}) {
  if (category === "videos") {
    return <VideoManager code={code} />;
  }
  if (category === "kardex" || category === "onboarding" || category === "conferences") {
    return <FolderedManager code={code} category={category} label={label} />;
  }
  return <FileManager code={code} category={category} label={label} />;
}

function FileManager({
  code,
  category,
  label,
}: {
  code: string;
  category: Exclude<CategoryId, "videos">;
  label: string;
}) {
  const queryClient = useQueryClient();
  const upload = useServerFn(uploadPdf);
  const remove = useServerFn(deleteFile);
  const list = useServerFn(listCategoryFiles);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const queryKey = ["drive-category", category] as const;

  const { data: files = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => list({ data: { category } }),
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey });
    await queryClient.invalidateQueries({ queryKey: ["drive-procedures"] });
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(fileList)) {
        if (!/\.(pdf|docx?)$/i.test(file.name)) {
          toast.error(`${file.name}: ניתן להעלות רק קובצי PDF או Word`);
          continue;
        }
        const buffer = new Uint8Array(await file.arrayBuffer());
        let binary = "";
        const chunk = 0x8000;
        for (let i = 0; i < buffer.length; i += chunk) {
          binary += String.fromCharCode(...buffer.subarray(i, i + chunk));
        }
        await upload({ data: { code, category, name: file.name, base64: btoa(binary) } });
        toast.success(`הועלה: ${file.name}`);
      }
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "העלאה נכשלה");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`למחוק את "${name}"?`)) return;
    setBusy(true);
    try {
      const result = await remove({ data: { code, fileId: id } });
      if (!result.ok) {
        toast.error(result.message, { duration: 7000 });
        return;
      }
      toast.success(result.message);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "מחיקה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 text-sm font-bold text-foreground">{label}</h2>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          העלאת קבצים (PDF)
        </button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          הקבצים נשמרים בתיקייה נפרדת בדרייב עבור קטגוריה זו
        </p>
      </div>

      <ul className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
        {isLoading && <li className="px-4 py-4 text-sm text-muted-foreground">טוען קבצים...</li>}
        {!isLoading && files.length === 0 && (
          <li className="px-4 py-4 text-sm text-muted-foreground">אין עדיין קבצים בקטגוריה זו</li>
        )}
        {files.map((file) => (
          <li
            key={file.id}
            className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <FileText className="size-4" />
            </span>
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 text-sm font-medium text-foreground"
            >
              {file.name}
            </a>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleDelete(file.id, file.name)}
              aria-label={`מחיקת ${file.name}`}
              className="shrink-0 rounded-xl p-2 text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VideoManager({ code }: { code: string }) {
  const queryClient = useQueryClient();
  const upload = useServerFn(uploadVideo);
  const remove = useServerFn(deleteFile);
  const addLink = useServerFn(addVideoUrl);
  const removeLink = useServerFn(removeVideoUrl);
  const list = useServerFn(listVideos);
  const uploadDoc = useServerFn(uploadTrainingFile);
  const inputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const queryKey = ["drive-videos"] as const;

  const { data: videos = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => list(),
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey });
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(fileList)) {
        if (!file.type.startsWith("video/") && !/\.(mp4|mov|webm)$/i.test(file.name)) {
          toast.error(`${file.name}: ניתן להעלות רק קובצי וידאו (MP4/MOV/WEBM)`);
          continue;
        }
        const buffer = new Uint8Array(await file.arrayBuffer());
        let binary = "";
        const chunk = 0x8000;
        for (let i = 0; i < buffer.length; i += chunk) {
          binary += String.fromCharCode(...buffer.subarray(i, i + chunk));
        }
        await upload({ data: { code, name: file.name, base64: btoa(binary) } });
        toast.success(`הועלה: ${file.name}`);
      }
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "העלאה נכשלה");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDocs(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(fileList)) {
        const buffer = new Uint8Array(await file.arrayBuffer());
        let binary = "";
        const chunk = 0x8000;
        for (let i = 0; i < buffer.length; i += chunk) {
          binary += String.fromCharCode(...buffer.subarray(i, i + chunk));
        }
        await uploadDoc({
          data: {
            code,
            name: file.name,
            base64: btoa(binary),
            mimeType: file.type || "application/octet-stream",
          },
        });
        toast.success(`הועלה: ${file.name}`);
      }
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "העלאה נכשלה");
    } finally {
      setBusy(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  }

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkTitle.trim() || !linkUrl.trim()) return;
    setBusy(true);
    try {
      await addLink({ data: { title: linkTitle.trim(), url: linkUrl.trim() } });
      toast.success("הקישור נוסף");
      setLinkTitle("");
      setLinkUrl("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "הוספת קישור נכשלה");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`למחוק את "${name}"?`)) return;
    setBusy(true);
    try {
      const video = videos.find((v) => v.id === id);
      if (video?.type === "link") {
        await removeLink({ data: { id } });
      } else {
        const result = await remove({ data: { code, fileId: id } });
        if (!result.ok) {
          toast.error(result.message, { duration: 7000 });
          return;
        }
      }
      toast.success("נמחק");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "מחיקה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 text-sm font-bold text-foreground">העלאת קובץ וידאו</h2>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          העלאת סרטון (MP4/MOV/WEBM)
        </button>
        <input
          ref={docInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleDocs(e.target.files)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => docInputRef.current?.click()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-semibold text-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
          העלאת קובץ (PDF / מצגת / תמונה / כל קובץ)
        </button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          הקבצים נשמרים בתיקיית "הדרכה והכשרה" בדרייב
        </p>
      </div>

      <form
        onSubmit={handleAddLink}
        className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
      >
        <h2 className="mb-3 text-sm font-bold text-foreground">או קישור ליוטיוב</h2>
        <div className="space-y-3">
          <input
            type="text"
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            placeholder="כותרת הסרטון"
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
          />
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy || !linkTitle.trim() || !linkUrl.trim()}
            className="w-full rounded-2xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground disabled:opacity-50"
          >
            {busy ? "שומר..." : "הוסף קישור"}
          </button>
        </div>
      </form>

      <ul className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
        {isLoading && <li className="px-4 py-4 text-sm text-muted-foreground">טוען סרטונים...</li>}
        {!isLoading && videos.length === 0 && (
          <li className="px-4 py-4 text-sm text-muted-foreground">אין עדיין סרטונים בקטגוריה זו</li>
        )}
        {videos.map((video) => (
          <li
            key={video.id}
            className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              {video.type === "link" && video.youtubeId ? (
                <Play className="size-4" />
              ) : video.type === "doc" ? (
                <FileText className="size-4" />
              ) : (
                <Film className="size-4" />
              )}
            </span>
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 text-sm font-medium text-foreground"
            >
              {video.name}
            </a>
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-xl p-2 text-muted-foreground transition-colors hover:bg-accent"
              aria-label="פתיחה בדרייב"
            >
              <ExternalLink className="size-4" />
            </a>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleDelete(video.id, video.name)}
              aria-label={`מחיקת ${video.name}`}
              className="shrink-0 rounded-xl p-2 text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FolderedManager({
  code,
  category,
  label,
}: {
  code: string;
  category: "kardex" | "onboarding" | "conferences";
  label: string;
}) {
  const queryClient = useQueryClient();
  const listFolders = useServerFn(listCategoryFolders);
  const createFolder = useServerFn(createCategoryFolder);
  const rename = useServerFn(renameFile);
  const [path, setPath] = useState<Array<{ id: string; name: string }>>([]);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const queryKey = ["drive-folders", category] as const;
  const { data: folders = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => listFolders({ data: { code, category } }),
  });

  async function addFolder(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await createFolder({ data: { code, category, name } });
      setNewName("");
      toast.success(`נוצרה תיקייה: ${name}`);
      await queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "יצירת תיקייה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  async function renameFolder(folderId: string, currentName: string) {
    const next = prompt("שם חדש לתיקייה:", currentName)?.trim();
    if (!next || next === currentName) return;
    setBusy(true);
    try {
      await rename({ data: { code, fileId: folderId, name: next } });
      toast.success("שם התיקייה עודכן");
      await queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שינוי השם נכשל");
    } finally {
      setBusy(false);
    }
  }

  if (path.length > 0) {
    const current = path[path.length - 1]!;
    return (
      <FolderFileManager
        code={code}
        folder={current}
        path={path}
        onBack={() => setPath((p) => p.slice(0, -1))}
        onOpenSub={(sub) => setPath((p) => [...p, sub])}
        category={category}
      />
    );
  }


  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 text-sm font-bold text-foreground">{label} — תיקיות לפי תחום</h2>
        <form onSubmit={addFolder} className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="שם תחום חדש (לדוגמה: אא״ג, עמוד שדרה)"
            className="min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy || !newName.trim()}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <FolderPlus className="size-4" />}
            צור
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          כל תחום נשמר כתיקייה נפרדת בדרייב, והקבצים שבתוכה משמשים את הקרדקס
        </p>
      </div>

      <ul className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
        {isLoading && <li className="px-4 py-4 text-sm text-muted-foreground">טוען תיקיות...</li>}
        {!isLoading && folders.length === 0 && (
          <li className="px-4 py-4 text-sm text-muted-foreground">אין עדיין תיקיות. צרו תיקייה ראשונה.</li>
        )}
        {folders.map((f) => (
          <li key={f.id} className="flex items-center border-b border-border last:border-0">
            <button
              type="button"
              onClick={() => setPath([{ id: f.id, name: f.name }])}
              className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-right transition-colors hover:bg-accent"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                <Folder className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {f.name}
              </span>
              <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => renameFolder(f.id, f.name)}
              aria-label={`שינוי שם ${f.name}`}
              className="mx-2 shrink-0 rounded-xl p-2 text-primary transition-colors hover:bg-accent disabled:opacity-50"
            >
              <Pencil className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

type FolderRef = { id: string; name: string };

function FolderFileManager({
  code,
  folder,
  path,
  onBack,
  onOpenSub,
  category,
}: {
  code: string;
  folder: FolderRef;
  path: FolderRef[];
  onBack: () => void;
  onOpenSub: (sub: FolderRef) => void;
  category: "kardex" | "onboarding" | "conferences";
}) {
  const queryClient = useQueryClient();
  const list = useServerFn(listFolderFiles);
  const upload = useServerFn(uploadPdfToFolder);
  const remove = useServerFn(deleteFile);
  const listSubs = useServerFn(listSubfoldersOfFolder);
  const createSub = useServerFn(createSubfolderInFolder);
  const rename = useServerFn(renameFile);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [newSub, setNewSub] = useState("");

  const queryKey = ["drive-folder-files", folder.id] as const;
  const subKey = ["drive-subfolders", folder.id] as const;
  const { data: files = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => list({ data: { code, folderId: folder.id } }),
  });
  const { data: subfolders = [] } = useQuery({
    queryKey: subKey,
    queryFn: () => listSubs({ data: { code, folderId: folder.id } }),
  });

  async function addSubfolder(e: React.FormEvent) {
    e.preventDefault();
    const name = newSub.trim();
    if (!name) return;
    setBusy(true);
    try {
      await createSub({ data: { code, folderId: folder.id, name } });
      setNewSub("");
      toast.success(`נוצרה תת-תיקייה: ${name}`);
      await queryClient.invalidateQueries({ queryKey: subKey });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "יצירת תיקייה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  async function renameSubfolder(folderId: string, currentName: string) {
    const next = prompt("שם חדש לתיקייה:", currentName)?.trim();
    if (!next || next === currentName) return;
    setBusy(true);
    try {
      await rename({ data: { code, fileId: folderId, name: next } });
      toast.success("שם התיקייה עודכן");
      await queryClient.invalidateQueries({ queryKey: subKey });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שינוי השם נכשל");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey });
    await queryClient.invalidateQueries({ queryKey: ["drive-category", category] });
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(fileList)) {
        if (!/\.(pdf|docx?)$/i.test(file.name)) {
          toast.error(`${file.name}: ניתן להעלות רק קובצי PDF או Word`);
          continue;
        }
        const buffer = new Uint8Array(await file.arrayBuffer());
        let binary = "";
        const chunk = 0x8000;
        for (let i = 0; i < buffer.length; i += chunk) {
          binary += String.fromCharCode(...buffer.subarray(i, i + chunk));
        }
        await upload({ data: { code, folderId: folder.id, name: file.name, base64: btoa(binary) } });
        toast.success(`הועלה: ${file.name}`);
      }
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "העלאה נכשלה");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`למחוק את "${name}"?`)) return;
    setBusy(true);
    try {
      const result = await remove({ data: { code, fileId: id } });
      if (!result.ok) {
        toast.error(result.message, { duration: 7000 });
        return;
      }
      toast.success(result.message);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "מחיקה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-accent"
      >
        <ArrowRight className="size-4" />
        חזרה לתיקיות
      </button>

      <p className="px-1 text-xs text-muted-foreground">{path.map((p) => p.name).join(" / ")}</p>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Folder className="size-4 text-primary" />
          תתי-תיקיות ב״{folder.name}״
        </h2>
        <form onSubmit={addSubfolder} className="flex gap-2">
          <input
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
            placeholder="שם תת-תיקייה חדשה (לדוגמה: מערכת דה וינצ׳י)"
            className="min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy || !newSub.trim()}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <FolderPlus className="size-4" />}
            צור
          </button>
        </form>
        {subfolders.length > 0 && (
          <ul className="mt-3 overflow-hidden rounded-2xl border border-border">
            {subfolders.map((s) => (
              <li key={s.id} className="flex items-center border-b border-border last:border-0">
                <button
                  type="button"
                  onClick={() => onOpenSub({ id: s.id, name: s.name })}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-right transition-colors hover:bg-accent"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Folder className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {s.name}
                  </span>
                  <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => renameSubfolder(s.id, s.name)}
                  aria-label={`שינוי שם ${s.name}`}
                  className="mx-2 shrink-0 rounded-xl p-2 text-primary transition-colors hover:bg-accent disabled:opacity-50"
                >
                  <Pencil className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <FileText className="size-4 text-primary" />
          קבצים ב״{folder.name}״
        </h2>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          העלאת קבצים לתיקייה זו (PDF)
        </button>
      </div>

      <ul className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
        {isLoading && <li className="px-4 py-4 text-sm text-muted-foreground">טוען קבצים...</li>}
        {!isLoading && files.length === 0 && (
          <li className="px-4 py-4 text-sm text-muted-foreground">אין עדיין קבצים בתיקייה זו</li>
        )}
        {files.map((file) => (
          <li
            key={file.id}
            className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <FileText className="size-4" />
            </span>
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 text-sm font-medium text-foreground"
            >
              {file.name}
            </a>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleDelete(file.id, file.name)}
              aria-label={`מחיקת ${file.name}`}
              className="shrink-0 rounded-xl p-2 text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
