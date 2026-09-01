import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type SignatureRow = {
  id: string;
  signer_name: string;
  role: string | null;
  created_at: string;
};

export async function fetchSignatures(fileId: string): Promise<SignatureRow[]> {
  const { data, error } = await supabaseAdmin
    .from("meeting_signatures")
    .select("id, signer_name, role, created_at")
    .eq("file_id", fileId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SignatureRow[];
}

export async function insertSignature(params: {
  fileId: string;
  fileName: string;
  signerName: string;
  role?: string;
}) {
  const signer = params.signerName.trim().slice(0, 120);
  if (signer.length < 2) throw new Error("יש להזין שם מלא");

  const { data: existing } = await supabaseAdmin
    .from("meeting_signatures")
    .select("id")
    .eq("file_id", params.fileId)
    .ilike("signer_name", signer)
    .maybeSingle();
  if (existing) throw new Error("כבר קיימת חתימה בשם הזה עבור סיכום זה");

  const { error } = await supabaseAdmin.from("meeting_signatures").insert({
    file_id: params.fileId,
    file_name: params.fileName.slice(0, 300),
    signer_name: signer,
    role: params.role?.trim().slice(0, 120) || null,
  });
  if (error) throw new Error(error.message);
  return { ok: true as const };
}
