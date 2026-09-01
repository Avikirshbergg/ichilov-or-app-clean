import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Play, ExternalLink, Film, FileText } from "lucide-react";
import logo from "@/assets/logo.png";
import { listVideos } from "@/lib/videos.functions";

const queryKey = ["drive-videos"] as const;

export const Route = createFileRoute("/videos")({
  head: () => ({
    meta: [
      { title: "הדרכה והכשרה — חדר ניתוח איכילוב" },
      {
        name: "description",
        content: "תכני הדרכה והכשרה לצוות חדר הניתוח: קבלת מטופל לניתוח, דגשים קריטיים ונושאים נוספים.",
      },
      { property: "og:title", content: "הדרכה והכשרה — חדר ניתוח איכילוב" },
      { property: "og:description", content: "כל תכני ההדרכה וההכשרה לצוות במקום אחד." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey,
      queryFn: () => listVideos(),
    });
  },
  component: VideosPage,
});

function VideosPage() {
  const fetchVideos = useServerFn(listVideos);
  const { data: videos } = useSuspenseQuery({
    queryKey,
    queryFn: () => fetchVideos(),
  });

  const playable = videos.filter((v) => v.type !== "doc");
  const docs = videos.filter((v) => v.type === "doc");
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = playable.find((v) => v.id === activeId) || playable[0];

  return (
    <main dir="rtl" className="min-h-screen bg-background pb-12">
      <div className="mx-auto w-full max-w-lg px-4 pt-6">
        <header className="mb-6 flex items-center gap-3">
          <img src={logo} alt="לוגו המחלקה" width={44} height={44} className="size-11" />
          <div>
            <h1 className="text-lg font-bold text-foreground">הדרכה והכשרה</h1>
            <p className="text-xs text-muted-foreground">תכני הדרכה והכשרה לצוות חדר הניתוח</p>
          </div>
        </header>

        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-accent"
        >
          <ArrowRight className="size-4" />
          חזרה לדף הבית
        </Link>

        {videos.length === 0 ? (
          <p className="rounded-3xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            עדיין אין תכני הדרכה. אפשר להוסיף אותם באזור הניהול, בלשונית "ניהול הדרכה והכשרה".
          </p>
        ) : (
          <div className="space-y-5">
            {active && (
              <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
                <div className="aspect-video w-full bg-black">
                  {active.type === "link" && active.youtubeId ? (
                    <iframe
                      className="h-full w-full"
                      src={`https://www.youtube.com/embed/${active.youtubeId}`}
                      title={active.name}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      key={active.url}
                      className="h-full w-full"
                      controls
                      src={active.url}
                      preload="metadata"
                      poster=""
                    />
                  )}
                </div>
                <div className="p-4">
                  <h2 className="text-sm font-bold text-foreground">{active.name}</h2>
                  {active.type === "link" && (
                    <a
                      href={active.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-primary"
                    >
                      פתיחה בכרטיסייה חדשה <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {playable.length > 0 && (
            <ul className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
              {playable.map((video) => (
                <li key={video.id} className="border-b border-border last:border-0">
                  <button
                    type="button"
                    onClick={() => setActiveId(video.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 transition-colors ${
                      activeId === video.id ? "bg-accent" : "active:bg-accent"
                    }`}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                      {video.type === "link" && video.youtubeId ? (
                        <Play className="size-5" />
                      ) : (
                        <Film className="size-5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 text-right">
                      <span className="block text-sm font-medium text-foreground">{video.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {video.type === "link" ? "קישור ליוטיוב" : "קובץ וידאו מהדרייב"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            )}

            {docs.length > 0 && (
              <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
                <h2 className="border-b border-border px-4 py-3 text-sm font-bold text-foreground">
                  קבצים מצורפים
                </h2>
                <ul>
                  {docs.map((doc) => (
                    <li key={doc.id} className="border-b border-border last:border-0">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center gap-3 px-4 py-3 transition-colors active:bg-accent"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                          <FileText className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1 text-right">
                          <span className="block text-sm font-medium text-foreground">{doc.name}</span>
                          <span className="block text-xs text-muted-foreground">פתיחת הקובץ</span>
                        </span>
                        <ExternalLink className="size-4 text-muted-foreground" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
