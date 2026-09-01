import { createServerFn } from "@tanstack/react-start";

export const verifyAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => {
    if (!data || typeof data.code !== "string") throw new Error("קוד חסר");
    return { code: data.code };
  })
  .handler(async ({ data }) => {
    const { checkAdminCode } = await import("./admin.server");
    checkAdminCode(data.code);
    return { ok: true as const };
  });

export const uploadPdf = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; category: string; name: string; base64: string }) => {
    if (!data || typeof data.code !== "string") throw new Error("קוד חסר");
    if (!data.category || typeof data.category !== "string") throw new Error("קטגוריה חסרה");
    if (!data.name || typeof data.name !== "string") throw new Error("שם קובץ חסר");
    if (!data.base64 || typeof data.base64 !== "string") throw new Error("תוכן הקובץ חסר");
    return { code: data.code, category: data.category, name: data.name, base64: data.base64 };
  })
  .handler(async ({ data }) => {
    const { checkAdminCode } = await import("./admin.server");
    checkAdminCode(data.code);
    const { uploadPdfToCategory, isCategory } = await import("./drive.server");
    if (!isCategory(data.category)) throw new Error("קטגוריה לא חוקית");
    return uploadPdfToCategory(data.category, data.name, data.base64);
  });

export const deleteFile = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; fileId: string }) => {
    if (!data || typeof data.code !== "string") throw new Error("קוד חסר");
    if (!data.fileId || typeof data.fileId !== "string") throw new Error("מזהה קובץ חסר");
    return { code: data.code, fileId: data.fileId };
  })
  .handler(async ({ data }) => {
    const { checkAdminCode } = await import("./admin.server");
    checkAdminCode(data.code);
    const { trashFile } = await import("./drive.server");
    try {
      await trashFile(data.fileId);
      return { ok: true as const, message: "הקובץ נמחק" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "מחיקה נכשלה";
      if (message.includes("appNotAuthorizedToFile") || message.includes("[403]")) {
        return {
          ok: false as const,
          message:
            "אין לאפליקציה הרשאת מחיקה לקובץ הזה. יש לחבר מחדש את Google Drive עם הרשאת עריכה מלאה.",
        };
      }
      return { ok: false as const, message: "מחיקת הקובץ נכשלה. נסו שוב." };
    }
  });

export const uploadVideo = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; name: string; base64: string }) => {
    if (!data || typeof data.code !== "string") throw new Error("קוד חסר");
    if (!data.name || typeof data.name !== "string") throw new Error("שם קובץ חסר");
    if (!data.base64 || typeof data.base64 !== "string") throw new Error("תוכן הקובץ חסר");
    return { code: data.code, name: data.name, base64: data.base64 };
  })
  .handler(async ({ data }) => {
    const { checkAdminCode } = await import("./admin.server");
    checkAdminCode(data.code);
    const { uploadVideoToCategory } = await import("./drive.server");
    return uploadVideoToCategory("videos", data.name, data.base64);
  });

export const uploadTrainingFile = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; name: string; base64: string; mimeType: string }) => {
    if (!data || typeof data.code !== "string") throw new Error("קוד חסר");
    if (!data.name || typeof data.name !== "string") throw new Error("שם קובץ חסר");
    if (!data.base64 || typeof data.base64 !== "string") throw new Error("תוכן הקובץ חסר");
    return {
      code: data.code,
      name: data.name,
      base64: data.base64,
      mimeType: typeof data.mimeType === "string" ? data.mimeType : "application/octet-stream",
    };
  })
  .handler(async ({ data }) => {
    const { checkAdminCode } = await import("./admin.server");
    checkAdminCode(data.code);
    const { uploadAnyFileToCategory } = await import("./drive.server");
    return uploadAnyFileToCategory("videos", data.name, data.base64, data.mimeType);
  });

export const renameFile = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; fileId: string; name: string }) => {
    if (!data || typeof data.code !== "string") throw new Error("קוד חסר");
    if (!data.fileId || typeof data.fileId !== "string") throw new Error("מזהה קובץ חסר");
    if (!data.name || typeof data.name !== "string") throw new Error("שם חסר");
    return { code: data.code, fileId: data.fileId, name: data.name };
  })
  .handler(async ({ data }) => {
    const { checkAdminCode } = await import("./admin.server");
    checkAdminCode(data.code);
    const { renameDriveFile } = await import("./drive.server");
    await renameDriveFile(data.fileId, data.name);
    return { ok: true as const };
  });

export const listCategoryFolders = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; category: string }) => {
    if (!data || typeof data.code !== "string") throw new Error("קוד חסר");
    if (!data.category || typeof data.category !== "string") throw new Error("קטגוריה חסרה");
    return { code: data.code, category: data.category };
  })
  .handler(async ({ data }) => {
    const { checkAdminCode } = await import("./admin.server");
    checkAdminCode(data.code);
    const { listSubfolders, isCategory } = await import("./drive.server");
    if (!isCategory(data.category)) throw new Error("קטגוריה לא חוקית");
    return listSubfolders(data.category);
  });

export const createCategoryFolder = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; category: string; name: string }) => {
    if (!data || typeof data.code !== "string") throw new Error("קוד חסר");
    if (!data.category || typeof data.category !== "string") throw new Error("קטגוריה חסרה");
    if (!data.name || typeof data.name !== "string") throw new Error("שם תיקייה חסר");
    return { code: data.code, category: data.category, name: data.name.trim() };
  })
  .handler(async ({ data }) => {
    const { checkAdminCode } = await import("./admin.server");
    checkAdminCode(data.code);
    const { createSubfolder, isCategory } = await import("./drive.server");
    if (!isCategory(data.category)) throw new Error("קטגוריה לא חוקית");
    return createSubfolder(data.category, data.name);
  });

export const listFolderFiles = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; folderId: string }) => {
    if (!data || typeof data.code !== "string") throw new Error("קוד חסר");
    if (!data.folderId || typeof data.folderId !== "string") throw new Error("מזהה תיקייה חסר");
    return { code: data.code, folderId: data.folderId };
  })
  .handler(async ({ data }) => {
    const { checkAdminCode } = await import("./admin.server");
    checkAdminCode(data.code);
    const { listPdfsInFolder } = await import("./drive.server");
    const files = await listPdfsInFolder(data.folderId);
    return files.map((f) => ({
      id: f.id,
      name: f.name.replace(/\.(pdf|docx?)$/i, ""),
      url: f.webViewLink,
      modified: f.modifiedTime,
    }));
  });

export const uploadPdfToFolder = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; folderId: string; name: string; base64: string }) => {
    if (!data || typeof data.code !== "string") throw new Error("קוד חסר");
    if (!data.folderId || typeof data.folderId !== "string") throw new Error("מזהה תיקייה חסר");
    if (!data.name || typeof data.name !== "string") throw new Error("שם קובץ חסר");
    if (!data.base64 || typeof data.base64 !== "string") throw new Error("תוכן הקובץ חסר");
    return { code: data.code, folderId: data.folderId, name: data.name, base64: data.base64 };
  })
  .handler(async ({ data }) => {
    const { checkAdminCode } = await import("./admin.server");
    checkAdminCode(data.code);
    const { uploadPdfToFolderId } = await import("./drive.server");
    return uploadPdfToFolderId(data.folderId, data.name, data.base64);
  });

export const listSubfoldersOfFolder = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; folderId: string }) => {
    if (!data || typeof data.code !== "string") throw new Error("קוד חסר");
    if (!data.folderId || typeof data.folderId !== "string") throw new Error("מזהה תיקייה חסר");
    return { code: data.code, folderId: data.folderId };
  })
  .handler(async ({ data }) => {
    const { checkAdminCode } = await import("./admin.server");
    checkAdminCode(data.code);
    const { listFoldersIn } = await import("./drive.server");
    return listFoldersIn(data.folderId);
  });

export const createSubfolderInFolder = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; folderId: string; name: string }) => {
    if (!data || typeof data.code !== "string") throw new Error("קוד חסר");
    if (!data.folderId || typeof data.folderId !== "string") throw new Error("מזהה תיקייה חסר");
    if (!data.name || typeof data.name !== "string") throw new Error("שם תיקייה חסר");
    return { code: data.code, folderId: data.folderId, name: data.name.trim() };
  })
  .handler(async ({ data }) => {
    const { checkAdminCode } = await import("./admin.server");
    checkAdminCode(data.code);
    const { createFolderIn } = await import("./drive.server");
    return createFolderIn(data.folderId, data.name);
  });
