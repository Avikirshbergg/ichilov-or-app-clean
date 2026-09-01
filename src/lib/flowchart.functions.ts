import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  action: z.string().min(2).max(200),
});

export const buildFlowchartFor = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { listCategoryPdfsDeep, downloadFileBase64, onlyPdfs } = await import("./drive.server");
    const { logQuestion } = await import("./analytics.server");
    const { pickRelevantDocs, gatewayMessage, buildFlowchart } = await import("./ai.server");

    const empty = {
      reply: "נא לפנות למנהלי חדר הניתוח לקבלת תשובה.",
      sources: [] as Array<{ name: string; url: string }>,
    };

    const files = onlyPdfs(await listCategoryPdfsDeep("flowcharts"));
    if (files.length === 0) { await logQuestion({ question: data.action, answered: false, surface: "flowcharts" }); return empty; }

    let picked: number[] = [];
    try {
      picked = await pickRelevantDocs(
      `תרשים זרימה ושלבי ביצוע לפעולה: ${data.action}`,
        files.map((f) => f.name),
      );
    } catch (err) {
      return { reply: gatewayMessage(err), sources: [] as Array<{ name: string; url: string }> };
    }
    if (picked.length === 0) { await logQuestion({ question: data.action, answered: false, surface: "flowcharts" }); return empty; }

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
    if (attachments.length === 0) { await logQuestion({ question: data.action, answered: false, surface: "flowcharts" }); return empty; }

    const reply = await buildFlowchart(data.action, attachments);
    await logQuestion({ question: data.action, answered: !reply.includes("נא לפנות למנהלי חדר הניתוח"), sourceNames: attachments.map((a) => a.name.replace(/\.(pdf|docx?)$/i, "")), surface: "flowcharts" });
    return {
      reply,
      sources: attachments.map((a) => ({ name: a.name.replace(/\.(pdf|docx?)$/i, ""), url: a.url })),
    };
  });
