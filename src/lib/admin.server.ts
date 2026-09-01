export function checkAdminCode(code: string): void {
  const expected = process.env["ADMIN_CODE"];
  if (!expected) throw new Error("קוד המנהל אינו מוגדר במערכת");
  if (code !== expected) throw new Error("קוד שגוי");
}
