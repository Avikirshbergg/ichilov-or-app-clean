import { JWT } from "google-auth-library";

export const DRIVE_FOLDER_ID =
  process.env["GOOGLE_DRIVE_FOLDER_ID"] || "1JsP821wxHi5argotqQLlqtB2ua8btgnJ";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

let driveClient: JWT | undefined;

function getDriveClient(): JWT {
  if (driveClient) return driveClient;

  const email = process.env["GOOGLE_SERVICE_ACCOUNT_EMAIL"];
  const privateKey = process.env["GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"]?.replace(/\\n/g, "\n");
  const subject = process.env["GOOGLE_DRIVE_IMPERSONATED_USER"];

  if (!email || !privateKey) {
    throw new Error("Google Drive service account is not configured");
  }

  driveClient = new JWT({
    email,
    key: privateKey,
    scopes: [DRIVE_SCOPE],
    ...(subject ? { subject } : {}),
  });
  return driveClient;
}

async function driveFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const accessToken = await getDriveClient().getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  const url = new URL(input);
  url.searchParams.set("supportsAllDrives", "true");
  if (!init.method && url.pathname.endsWith("/drive/v3/files")) {
    url.searchParams.set("includeItemsFromAllDrives", "true");
  }
  return fetch(url, { ...init, headers });
}

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
  size?: string;
};

/** Document types the team may upload and browse (PDF + Word). */
const DOC_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.google-apps.document",
]);

export function isDocFile(f: DriveFile): boolean {
  return DOC_MIMES.has(f.mimeType) || /\.docx?$/i.test(f.name);
}

/** Only files the AI can actually read (Gemini supports PDF). */
export function onlyPdfs<T extends DriveFile>(files: T[]): T[] {
  return files.filter((f) => f.mimeType === "application/pdf");
}

function mimeForName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "doc") return "application/msword";
  return "application/pdf";
}

export async function listFolderPdfs(): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: `'${DRIVE_FOLDER_ID}' in parents and trashed=false`,
    fields: "files(id,name,mimeType,modifiedTime,webViewLink,size)",
    pageSize: "200",
    orderBy: "name",
  });
  const res = await driveFetch(`${DRIVE_API}/files?${params}`);
  if (!res.ok) {
    const body = await res.text();
    console.error(`Drive list failed [${res.status}]: ${body}`);
    throw new Error(`Drive list failed [${res.status}]: ${body}`);
  }
  const json = (await res.json()) as { files?: DriveFile[] };
  return (json.files ?? []).filter(isDocFile);
}

export async function downloadFileBase64(fileId: string): Promise<string> {
  const res = await driveFetch(`${DRIVE_API}/files/${fileId}?alt=media`);
  if (!res.ok) {
    const body = await res.text();
    console.error(`Drive download failed [${res.status}]: ${body}`);
    throw new Error(`Drive download failed [${res.status}]: ${body}`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function uploadFileToFolderId(
  folderId: string,
  name: string,
  base64: string,
  mimeType: string,
): Promise<DriveFile> {
  const boundary = `drive-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({
    name,
    parents: [folderId],
    mimeType,
  });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const enc = new TextEncoder();
  const head = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
  );
  const tail = enc.encode(`\r\n--${boundary}--\r\n`);
  const body = new Uint8Array(head.length + bytes.length + tail.length);
  body.set(head, 0);
  body.set(bytes, head.length);
  body.set(tail, head.length + bytes.length);

  const res = await driveFetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,webViewLink,size`,
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  if (!res.ok) {
    const text = await res.text();
    console.error(`Drive upload failed [${res.status}]: ${text}`);
    throw new Error(`העלאה נכשלה [${res.status}]: ${text}`);
  }
  return (await res.json()) as DriveFile;
}

export async function uploadPdfToFolderId(
  folderId: string,
  name: string,
  base64: string,
): Promise<DriveFile> {
  const finalName = /\.(pdf|docx?)$/i.test(name) ? name : `${name}.pdf`;
  return uploadFileToFolderId(folderId, finalName, base64, mimeForName(finalName));
}

export async function trashFile(fileId: string): Promise<void> {
  const res = await driveFetch(`${DRIVE_API}/files/${fileId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Drive trash failed [${res.status}]: ${text}`);
    throw new Error(`מחיקה נכשלה [${res.status}]: ${text}`);
  }
}

export async function renameDriveFile(fileId: string, name: string): Promise<void> {
  const res = await driveFetch(`${DRIVE_API}/files/${fileId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Drive rename failed [${res.status}]: ${text}`);
    throw new Error(`שינוי שם נכשל [${res.status}]: ${text}`);
  }
}

export const CATEGORIES = {
  policies: "נהלים",
  kardex: "קרדקסים",
  meetings: "סיכומי ישיבות",
  flowcharts: "תרשימי זרימה",
  incidents: "אירוע חריג וכמעט אירוע",
  onboarding: "קליטת אחיות חדשות",
  videos: "סרטוני הדרכה",
  conferences: "ימי עיון וכנסים",
} as const;

export type Category = keyof typeof CATEGORIES;

export function isCategory(value: string): value is Category {
  return value in CATEGORIES;
}

async function findFolderId(name: string): Promise<string | null> {
  const params = new URLSearchParams({
    q: `'${DRIVE_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`,
    fields: "files(id,name)",
    pageSize: "10",
  });
  const res = await driveFetch(`${DRIVE_API}/files?${params}`);
  if (!res.ok) {
    const body = await res.text();
    console.error(`Drive folder lookup failed [${res.status}]: ${body}`);
    throw new Error(`Drive folder lookup failed [${res.status}]: ${body}`);
  }
  const json = (await res.json()) as { files?: Array<{ id: string }> };
  return json.files?.[0]?.id ?? null;
}

export async function ensureCategoryFolder(category: Category): Promise<string> {
  const name = CATEGORIES[category];
  const existing = await findFolderId(name);
  if (existing) return existing;
  const res = await driveFetch(`${DRIVE_API}/files?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [DRIVE_FOLDER_ID],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Drive folder create failed [${res.status}]: ${body}`);
    throw new Error(`יצירת תיקייה נכשלה [${res.status}]: ${body}`);
  }
  return ((await res.json()) as { id: string }).id;
}

export async function listAllFilesIn(folderId: string): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id,name,mimeType,modifiedTime,webViewLink,size)",
    pageSize: "200",
    orderBy: "name",
  });
  const res = await driveFetch(`${DRIVE_API}/files?${params}`);
  if (!res.ok) {
    const body = await res.text();
    console.error(`Drive list failed [${res.status}]: ${body}`);
    throw new Error(`Drive list failed [${res.status}]: ${body}`);
  }
  const json = (await res.json()) as { files?: DriveFile[] };
  return (json.files ?? []).filter((f) => f.mimeType !== "application/vnd.google-apps.folder");
}

/** All non-folder files in a category folder (any type). */
export async function listCategoryAllFiles(category: Category): Promise<DriveFile[]> {
  const folderId = await findFolderId(CATEGORIES[category]);
  return folderId ? listAllFilesIn(folderId) : [];
}

/** Upload any file type into a category folder. */
export async function uploadAnyFileToCategory(
  category: Category,
  name: string,
  base64: string,
  mimeType: string,
): Promise<DriveFile> {
  const folderId = await ensureCategoryFolder(category);
  return uploadFileToFolderId(folderId, name, base64, mimeType || "application/octet-stream");
}

async function listPdfsIn(folderId: string): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id,name,mimeType,modifiedTime,webViewLink,size)",
    pageSize: "200",
    orderBy: "name",
  });
  const res = await driveFetch(`${DRIVE_API}/files?${params}`);
  if (!res.ok) {
    const body = await res.text();
    console.error(`Drive list failed [${res.status}]: ${body}`);
    throw new Error(`Drive list failed [${res.status}]: ${body}`);
  }
  const json = (await res.json()) as { files?: DriveFile[] };
  return (json.files ?? []).filter(isDocFile);
}

/** Files in a category folder. "policies" also includes loose files in the root folder. */
export async function listCategoryPdfs(category: Category): Promise<DriveFile[]> {
  const folderId = await findFolderId(CATEGORIES[category]);
  const inFolder = folderId ? await listPdfsIn(folderId) : [];
  if (category !== "policies") return inFolder;
  const root = await listPdfsIn(DRIVE_FOLDER_ID);
  const seen = new Set(inFolder.map((f) => f.id));
  return [...inFolder, ...root.filter((f) => !seen.has(f.id))];
}

/** Every PDF in the department folder, including all category subfolders. */
export async function listAllPdfs(): Promise<DriveFile[]> {
  const lists = await Promise.all([
    listPdfsIn(DRIVE_FOLDER_ID),
    ...(Object.keys(CATEGORIES) as Category[]).map(async (c) => {
      const id = await findFolderId(CATEGORIES[c]);
      return id ? listPdfsIn(id) : [];
    }),
  ]);
  const seen = new Set<string>();
  const out: DriveFile[] = [];
  for (const list of lists) {
    for (const f of list) {
      if (seen.has(f.id)) continue;
      seen.add(f.id);
      out.push(f);
    }
  }
  return out;
}

export async function uploadPdfToCategory(
  category: Category,
  name: string,
  base64: string,
): Promise<DriveFile> {
  const folderId = await ensureCategoryFolder(category);
  return uploadPdfToFolderId(folderId, name, base64);
}


export type VideoLink = { id: string; title: string; url: string; youtubeId: string | null };

export async function getVideosMetadataFile(): Promise<{ id: string | null; links: VideoLink[] }> {
  const folderId = await ensureCategoryFolder("videos");
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and name='videos.json' and trashed=false`,
    fields: "files(id,modifiedTime)",
    pageSize: "10",
  });
  const res = await driveFetch(`${DRIVE_API}/files?${params}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`metadata lookup failed [${res.status}]: ${body}`);
  }
  const json = (await res.json()) as { files?: Array<{ id: string; modifiedTime: string }> };
  const file = json.files?.[0];
  if (!file) return { id: null, links: [] };
  const content = await driveFetch(`${DRIVE_API}/files/${file.id}?alt=media`);
  if (!content.ok) {
    const body = await content.text();
    throw new Error(`metadata read failed [${content.status}]: ${body}`);
  }
  try {
    const data = (await content.json()) as { links?: VideoLink[] };
    return { id: file.id, links: Array.isArray(data.links) ? data.links : [] };
  } catch {
    return { id: file.id, links: [] };
  }
}

export async function saveVideosMetadata(links: VideoLink[]): Promise<{ id: string }> {
  const folderId = await ensureCategoryFolder("videos");
  const existing = await getVideosMetadataFile();
  const body = JSON.stringify({ links }, null, 2);
  const bytes = new TextEncoder().encode(body);
  if (existing.id) {
    const res = await driveFetch(`${DRIVE_UPLOAD_API}/files/${existing.id}?uploadType=media`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: bytes,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`save metadata failed [${res.status}]: ${text}`);
    }
    return { id: existing.id };
  }
  const boundary = `drive-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name: "videos.json", parents: [folderId], mimeType: "application/json" });
  const head = new TextEncoder().encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n`,
  );
  const tail = new TextEncoder().encode(`\r\n--${boundary}--\r\n`);
  const payload = new Uint8Array(head.length + bytes.length + tail.length);
  payload.set(head, 0);
  payload.set(bytes, head.length);
  payload.set(tail, head.length + bytes.length);
  const res = await driveFetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body: payload,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`create metadata failed [${res.status}]: ${text}`);
  }
  return (await res.json()) as { id: string };
}


export async function uploadVideoToCategory(
  category: Category,
  name: string,
  base64: string,
): Promise<DriveFile> {
  const folderId = await ensureCategoryFolder(category);
  const ext = name.split(".").pop()?.toLowerCase() || "mp4";
  const mimeType = ext === "mov" ? "video/quicktime" : ext === "webm" ? "video/webm" : "video/mp4";
  const finalName = ["mp4", "mov", "webm"].includes(ext) ? name : `${name}.mp4`;
  return uploadFileToFolderId(folderId, finalName, base64, mimeType);
}

/* ---------- Subfolders inside a category (e.g. קרדקסים לפי תחום) ---------- */

export type DriveFolder = { id: string; name: string };

export async function listSubfolders(category: Category): Promise<DriveFolder[]> {
  const parentId = await ensureCategoryFolder(category);
  const params = new URLSearchParams({
    q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id,name)",
    pageSize: "200",
    orderBy: "name",
  });
  const res = await driveFetch(`${DRIVE_API}/files?${params}`);
  if (!res.ok) {
    const body = await res.text();
    console.error(`Drive subfolder list failed [${res.status}]: ${body}`);
    throw new Error(`טעינת התיקיות נכשלה [${res.status}]: ${body}`);
  }
  const json = (await res.json()) as { files?: DriveFolder[] };
  return json.files ?? [];
}

export async function createSubfolder(category: Category, name: string): Promise<DriveFolder> {
  const parentId = await ensureCategoryFolder(category);
  const existing = (await listSubfolders(category)).find((f) => f.name === name);
  if (existing) return existing;
  const res = await driveFetch(`${DRIVE_API}/files?fields=id,name`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Drive subfolder create failed [${res.status}]: ${body}`);
    throw new Error(`יצירת תיקייה נכשלה [${res.status}]: ${body}`);
  }
  return (await res.json()) as DriveFolder;
}

export async function listPdfsInFolder(folderId: string): Promise<DriveFile[]> {
  return listPdfsIn(folderId);
}

/** Sub-folders directly inside any folder id (supports unlimited nesting). */
export async function listFoldersIn(parentId: string): Promise<DriveFolder[]> {
  const params = new URLSearchParams({
    q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id,name)",
    pageSize: "200",
    orderBy: "name",
  });
  const res = await driveFetch(`${DRIVE_API}/files?${params}`);
  if (!res.ok) {
    const body = await res.text();
    console.error(`Drive subfolder list failed [${res.status}]: ${body}`);
    throw new Error(`טעינת התיקיות נכשלה [${res.status}]: ${body}`);
  }
  const json = (await res.json()) as { files?: DriveFolder[] };
  return json.files ?? [];
}

/** Create (or reuse) a folder inside any folder id. */
export async function createFolderIn(parentId: string, name: string): Promise<DriveFolder> {
  const existing = (await listFoldersIn(parentId)).find((f) => f.name === name);
  if (existing) return existing;
  const res = await driveFetch(`${DRIVE_API}/files?fields=id,name`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Drive subfolder create failed [${res.status}]: ${body}`);
    throw new Error(`יצירת תיקייה נכשלה [${res.status}]: ${body}`);
  }
  return (await res.json()) as DriveFolder;
}

async function collectPdfsRecursive(
  folderId: string,
  path: string,
  depth: number,
): Promise<Array<DriveFile & { folder: string | null }>> {
  const here = (await listPdfsIn(folderId)).map((f) => ({ ...f, folder: path || null }));
  if (depth <= 0) return here;
  const subs = await listFoldersIn(folderId);
  const nested = await Promise.all(
    subs.map((sub) =>
      collectPdfsRecursive(sub.id, path ? `${path} / ${sub.name}` : sub.name, depth - 1),
    ),
  );
  return [...here, ...nested.flat()];
}

/** All PDFs of a category including every nested subfolder, labelled with their folder path. */
export async function listCategoryPdfsDeep(
  category: Category,
): Promise<Array<DriveFile & { folder: string | null }>> {
  const rootId = await ensureCategoryFolder(category);
  const all = await collectPdfsRecursive(rootId, "", 4);
  const seen = new Set<string>();
  const out: Array<DriveFile & { folder: string | null }> = [];
  for (const f of all) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    out.push(f);
  }
  return out;
}
