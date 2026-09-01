import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type VideoItem = {
  id: string;
  name: string;
  url: string;
  modified?: string;
  type: "drive" | "link" | "doc";
  youtubeId?: string | null;
  mimeType?: string;
};

export const listVideos = createServerFn({ method: "GET" }).handler(async () => {
  const { listCategoryAllFiles, getVideosMetadataFile } = await import("./drive.server");
  const [files, metadata] = await Promise.all([
    listCategoryAllFiles("videos"),
    getVideosMetadataFile(),
  ]);

  const usable = files.filter((f) => f.name !== "videos.json");

  const driveItems: VideoItem[] = usable.map((f) => {
    const isVideo = f.mimeType.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(f.name);
    return {
      id: f.id,
      name: isVideo ? f.name.replace(/\.(mp4|mov|webm)$/i, "") : f.name,
      url: f.webViewLink,
      modified: f.modifiedTime,
      type: isVideo ? ("drive" as const) : ("doc" as const),
      mimeType: f.mimeType,
    };
  });

  const linkItems: VideoItem[] = metadata.links.map((l) => ({
    id: l.id,
    name: l.title,
    url: l.url,
    type: "link" as const,
    youtubeId: l.youtubeId,
  }));

  return [...linkItems, ...driveItems];
});

const videoUrlSchema = z.object({
  title: z.string().min(2).max(200),
  url: z.string().url().min(10),
});

function parseYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
      return u.searchParams.get("v") || u.pathname.split("/").pop() || null;
    }
    return null;
  } catch {
    return null;
  }
}

export const addVideoUrl = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => videoUrlSchema.parse(data))
  .handler(async ({ data }) => {
    const { getVideosMetadataFile, saveVideosMetadata } = await import("./drive.server");
    const existing = await getVideosMetadataFile();
    const newLink = {
      id: crypto.randomUUID(),
      title: data.title,
      url: data.url,
      youtubeId: parseYouTubeId(data.url),
    };
    await saveVideosMetadata([...existing.links, newLink]);
    return { ok: true as const };
  });

export const removeVideoUrl = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    if (!data || typeof data.id !== "string") throw new Error("מזהה חסר");
    return { id: data.id };
  })
  .handler(async ({ data }) => {
    const { getVideosMetadataFile, saveVideosMetadata } = await import("./drive.server");
    const existing = await getVideosMetadataFile();
    await saveVideosMetadata(existing.links.filter((l) => l.id !== data.id));
    return { ok: true as const };
  });
