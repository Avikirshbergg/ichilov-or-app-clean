import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
});

export const listProcedures = createServerFn({ method: "GET" }).handler(async () => {
  const { listAllPdfs } = await import("./drive.server");
  const files = await listAllPdfs();
  return files.map((f) => ({
    id: f.id,
    name: f.name.replace(/\.(pdf|docx?)$/i, ""),
    url: f.webViewLink,
    modified: f.modifiedTime,
  }));
});

export const sendChatMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { listAllPdfs, downloadFileBase64, onlyPdfs } = await import("./drive.server");
    const { pickRelevantDocs, gatewayMessage, answerFromDocs } = await import("./ai.server");

    const { logQuestion } = await import("./analytics.server");
    const lastUser = [...data.messages].reverse().find((m) => m.role === "user")?.content ?? "";

    const files = onlyPdfs(await listAllPdfs());
    if (files.length === 0) {
      await logQuestion({ question: lastUser, answered: false, surface: "chat" });
      return { reply: "לא נמצאו נהלים בתיקייה. נא לפנות למנהלי חדר הניתוח לקבלת תשובה.", sources: [] as Array<{ name: string; url: string }> };
    }

    let picked: number[] = [];
    try {
      picked = await pickRelevantDocs(lastUser, files.map((f) => f.name));
    } catch (err) {
      return { reply: gatewayMessage(err), sources: [] as Array<{ name: string; url: string }> };
    }

    if (picked.length === 0) {
      await logQuestion({ question: lastUser, answered: false, surface: "chat" });
      return {
        reply: "לא נמצא נוהל רלוונטי בתיקיית הנהלים. נא לפנות למנהלי חדר הניתוח לקבלת תשובה.",
        sources: [] as Array<{ name: string; url: string }>,
      };
    }

    const attachments: Array<{ name: string; url: string; data: string }> = [];
    for (const index of picked.slice(0, 2)) {
      const file = files[index];
      if (!file) continue;
      attachments.push({
        name: file.name,
        url: file.webViewLink,
        data: await downloadFileBase64(file.id),
      });
    }

    if (attachments.length === 0) {
      await logQuestion({ question: lastUser, answered: false, surface: "chat" });
      return { reply: "לא הצלחתי לפתוח את קובץ הנוהל. נסו שוב.", sources: [] as Array<{ name: string; url: string }> };
    }

    const reply = await answerFromDocs(data.messages, attachments);
    const sourceNames = attachments.map((a) => a.name.replace(/\.(pdf|docx?)$/i, ""));
    await logQuestion({
      question: lastUser,
      answered: !reply.includes("נא לפנות למנהלי חדר הניתוח"),
      sourceNames,
      surface: "chat",
    });
    return { reply, sources: attachments.map((a) => ({ name: a.name.replace(/\.(pdf|docx?)$/i, ""), url: a.url })) };
  });

export const listCategoryFiles = createServerFn({ method: "POST" })
  .inputValidator((data: { category: string }) => {
    if (!data || typeof data.category !== "string") throw new Error("קטגוריה חסרה");
    return { category: data.category };
  })
  .handler(async ({ data }) => {
    const { listCategoryPdfsDeep, isCategory } = await import("./drive.server");
    if (!isCategory(data.category)) throw new Error("קטגוריה לא חוקית");
    const files = await listCategoryPdfsDeep(data.category);
    return files.map((f) => ({
      id: f.id,
      name: f.name.replace(/\.(pdf|docx?)$/i, ""),
      url: f.webViewLink,
      modified: f.modifiedTime,
      folder: f.folder,
    }));
  });
