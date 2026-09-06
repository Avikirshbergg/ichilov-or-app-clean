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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function driveErrorDetails(error: unknown): { raw: string; stage: string } {
  const parts: string[] = [];
  const urls: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;

  for (let depth = 0; current && depth < 6 && !seen.has(current); depth += 1) {
    seen.add(current);
    const record = asRecord(current);
    if (!record) {
      parts.push(String(current));
      break;
    }

    for (const key of ["name", "message", "code", "status", "statusText"]) {
      const value = record[key];
      if (typeof value === "string" || typeof value === "number") parts.push(String(value));
    }

    const config = asRecord(record["config"]);
    if (config?.["url"] !== undefined) urls.push(String(config["url"]));

    const response = asRecord(record["response"]);
    if (response) {
      if (typeof response["status"] === "number") parts.push(String(response["status"]));
      const responseConfig = asRecord(response["config"]);
      if (responseConfig?.["url"] !== undefined) urls.push(String(responseConfig["url"]));
      const request = asRecord(response["request"]);
      if (request?.["responseURL"] !== undefined) urls.push(String(request["responseURL"]));
      const data = asRecord(response["data"]);
      if (data) {
        for (const key of ["error", "error_description", "message", "status"]) {
          const value = data[key];
          if (typeof value === "string" || typeof value === "number") parts.push(String(value));
        }
      }
    }

    current = record["cause"];
  }

  const joinedUrls = urls.join(" ").toLowerCase();
  const stage = joinedUrls.includes("sts.googleapis.com")
    ? "sts"
    : joinedUrls.includes("iamcredentials.googleapis.com")
      ? "iam"
      : joinedUrls.includes("googleapis.com/drive")
        ? "drive"
        : "unknown";
  return { raw: parts.join(" ").toLowerCase(), stage };
}

function driveDiagnostic(error: unknown): string {
  const { raw, stage } = driveErrorDetails(error);
  console.error("[chat] Google Drive access failed", {
    stage,
    details: raw.slice(0, 500),
  });
  if (process.env["VERCEL_ENV"] !== "preview") return "";

  if (raw.includes("drive_oidc_missing")) return " קוד בדיקה: DRIVE_OIDC_MISSING";
  if (raw.includes("drive_oidc_exchange")) return " קוד בדיקה: DRIVE_OIDC_EXCHANGE";
  if (raw.includes("drive_oidc_issuer_global")) return " קוד בדיקה: DRIVE_OIDC_ISSUER_GLOBAL";
  if (raw.includes("drive_oidc_issuer_other")) return " קוד בדיקה: DRIVE_OIDC_ISSUER_OTHER";
  if (raw.includes("drive_oidc_subject_mismatch")) return " קוד בדיקה: DRIVE_OIDC_SUBJECT_MISMATCH";
  if (raw.includes("drive_oidc_audience_mismatch")) return " קוד בדיקה: DRIVE_OIDC_AUDIENCE_MISMATCH";
  if (raw.includes("drive_oidc_invalid")) return " קוד בדיקה: DRIVE_OIDC_INVALID";
  if (raw.includes("drive_oidc_unknown")) return " קוד בדיקה: DRIVE_OIDC_UNKNOWN";
  if (raw.includes("invalid jwt signature") || raw.includes("signature verification")) {
    return " קוד בדיקה: DRIVE_STS_SIGNATURE";
  }
  if (raw.includes("attribute condition")) return " קוד בדיקה: DRIVE_STS_ATTRIBUTE";
  if (raw.includes("subject_token") || raw.includes("subject token")) {
    return " קוד בדיקה: DRIVE_STS_SUBJECT_TOKEN";
  }
  if (raw.includes("issuer")) return " קוד בדיקה: DRIVE_STS_ISSUER";
  if (raw.includes("invalid_grant")) return " קוד בדיקה: DRIVE_STS_GRANT";
  if (raw.includes("401") && stage === "sts") return " קוד בדיקה: DRIVE_STS_401";
  if (raw.includes("401") && stage === "iam") return " קוד בדיקה: DRIVE_IAM_401";
  if (raw.includes("401") && stage === "drive") return " קוד בדיקה: DRIVE_API_401";
  if (raw.includes("401")) return " קוד בדיקה: DRIVE_401_UNKNOWN";
  if (raw.includes("audience") || raw.includes("invalid_target")) return " קוד בדיקה: DRIVE_AUDIENCE";
  if (raw.includes("permission") || raw.includes("forbidden") || raw.includes("403")) {
    return " קוד בדיקה: DRIVE_PERMISSION";
  }
  if (raw.includes("subject") || raw.includes("principal") || raw.includes("impersonat")) {
    return " קוד בדיקה: DRIVE_IDENTITY";
  }
  if (raw.includes("oidc") || raw.includes("token") || raw.includes("credential") || raw.includes("401")) {
    return " קוד בדיקה: DRIVE_AUTH";
  }
  return " קוד בדיקה: DRIVE_CONNECTION";
}

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

    let files;
    try {
      files = onlyPdfs(await listAllPdfs());
    } catch (error) {
      return {
        reply: `נכשלה הגישה לתיקיית הנהלים.${driveDiagnostic(error)}`,
        sources: [] as Array<{ name: string; url: string }>,
      };
    }
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
