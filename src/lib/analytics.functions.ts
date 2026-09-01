import { createServerFn } from "@tanstack/react-start";

export const getQuestionReport = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; days?: number }) => {
    if (!data || typeof data.code !== "string") throw new Error("קוד חסר");
    const days = typeof data.days === "number" && data.days > 0 ? Math.min(data.days, 365) : 30;
    return { code: data.code, days };
  })
  .handler(async ({ data }) => {
    const { checkAdminCode } = await import("./admin.server");
    checkAdminCode(data.code);
    const { fetchLogs } = await import("./analytics.server");
    const { buildReport } = await import("./report.server");
    const rows = await fetchLogs(data.days);
    return buildReport(rows);
  });

export const getGapInsights = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; days?: number }) => {
    if (!data || typeof data.code !== "string") throw new Error("קוד חסר");
    const days = typeof data.days === "number" && data.days > 0 ? Math.min(data.days, 365) : 30;
    return { code: data.code, days };
  })
  .handler(async ({ data }) => {
    const { checkAdminCode } = await import("./admin.server");
    checkAdminCode(data.code);
    const { fetchLogs } = await import("./analytics.server");
    const { summarizeGaps, gatewayMessage } = await import("./ai.server");
    const rows = await fetchLogs(data.days);
    if (rows.length === 0) return { insight: "אין עדיין שאלות מתועדות בטווח הזמן שנבחר." };
    const unanswered = rows.filter((r) => !r.answered).map((r) => r.question);
    const answered = rows.filter((r) => r.answered).map((r) => r.question);
    try {
      const insight = await summarizeGaps(unanswered.slice(0, 200), answered.slice(0, 200));
      return { insight };
    } catch (err) {
      return { insight: gatewayMessage(err) };
    }
  });

export const logInstallEvent = createServerFn({ method: "POST" })
  .inputValidator((data: { anonymous_id: string; outcome: string; platform?: string | null; user_agent?: string | null }) => {
    if (!data || typeof data.anonymous_id !== "string" || typeof data.outcome !== "string") {
      throw new Error("נתוני התקנה חסרים");
    }
    return {
      anonymous_id: data.anonymous_id,
      outcome: data.outcome,
      platform: data.platform ?? null,
      user_agent: data.user_agent ?? null,
    };
  })
  .handler(async ({ data }) => {
    const { logInstallEvent: write } = await import("./analytics.server");
    await write(data);
    return { ok: true };
  });

export const getInstallReport = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; days?: number }) => {
    if (!data || typeof data.code !== "string") throw new Error("קוד חסר");
    const days = typeof data.days === "number" && data.days > 0 ? Math.min(data.days, 365) : 30;
    return { code: data.code, days };
  })
  .handler(async ({ data }) => {
    const { checkAdminCode } = await import("./admin.server");
    checkAdminCode(data.code);
    const { fetchInstallEvents } = await import("./analytics.server");
    const { buildInstallReport } = await import("./report.server");
    const events = await fetchInstallEvents(data.days);
    return buildInstallReport(events);
  });
