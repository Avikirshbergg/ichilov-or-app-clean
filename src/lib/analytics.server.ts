import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type Surface = "chat" | "kardex" | "flowcharts";

export type InstallEvent = {
  id: string;
  anonymous_id: string;
  outcome: string;
  platform: string | null;
  user_agent: string | null;
  created_at: string;
};

export async function logQuestion(params: {
  question: string;
  answered: boolean;
  sourceNames?: string[];
  surface: Surface;
}) {
  const question = params.question.trim().slice(0, 1000);
  if (!question) return;
  try {
    await supabaseAdmin.from("question_logs").insert({
      question,
      answered: params.answered,
      source_names: params.sourceNames ?? [],
      surface: params.surface,
    });
  } catch {
    // logging must never break the user flow
  }
}

export type LogRow = {
  id: string;
  question: string;
  answered: boolean;
  source_names: string[];
  surface: string;
  created_at: string;
};

export async function fetchLogs(days: number): Promise<LogRow[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("question_logs")
    .select("id, question, answered, source_names, surface, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  return (data ?? []) as LogRow[];
}

export async function logInstallEvent(params: {
  anonymous_id: string;
  outcome: string;
  platform?: string | null;
  user_agent?: string | null;
}) {
  const { anonymous_id, outcome, platform = null, user_agent = null } = params;
  if (!anonymous_id || !outcome) return;
  try {
    await (supabaseAdmin.from("install_events" as any) as any).insert({
      anonymous_id,
      outcome,
      platform,
      user_agent,
    });
  } catch {
    // logging must never break the user flow
  }
}

export async function fetchInstallEvents(days: number): Promise<InstallEvent[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await (supabaseAdmin.from("install_events" as any) as any)
    .select("id, anonymous_id, outcome, platform, user_agent, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  return (data ?? []) as InstallEvent[];
}
