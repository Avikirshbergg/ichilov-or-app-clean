import { createServerFn } from "@tanstack/react-start";

export const listSignatures = createServerFn({ method: "POST" })
  .inputValidator((data: { fileId: string }) => {
    if (!data || typeof data.fileId !== "string") throw new Error("מזהה קובץ חסר");
    return { fileId: data.fileId };
  })
  .handler(async ({ data }) => {
    const { fetchSignatures } = await import("./signatures.server");
    const rows = await fetchSignatures(data.fileId);
    return rows.map((r) => ({
      id: r.id,
      name: r.signer_name,
      role: r.role,
      at: r.created_at,
    }));
  });

export const signMeeting = createServerFn({ method: "POST" })
  .inputValidator((data: { fileId: string; fileName: string; name: string; role?: string }) => {
    if (!data || typeof data.fileId !== "string") throw new Error("מזהה קובץ חסר");
    if (typeof data.fileName !== "string") throw new Error("שם קובץ חסר");
    if (typeof data.name !== "string" || data.name.trim().length < 2)
      throw new Error("יש להזין שם מלא");
    return {
      fileId: data.fileId,
      fileName: data.fileName,
      name: data.name,
      role: typeof data.role === "string" ? data.role : "",
    };
  })
  .handler(async ({ data }) => {
    const { insertSignature } = await import("./signatures.server");
    return insertSignature({
      fileId: data.fileId,
      fileName: data.fileName,
      signerName: data.name,
      role: data.role,
    });
  });
