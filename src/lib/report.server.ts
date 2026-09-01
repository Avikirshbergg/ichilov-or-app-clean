import type { LogRow, InstallEvent } from "./analytics.server";

function normalize(q: string) {
  return q
    .replace(/[?!.,"'`׳״()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const STOP = new Set([
  "מה","איך","האם","של","עם","על","את","אני","יש","לא","כן","זה","או","גם","כל","אם","מי","למה","איפה","מתי","צריך","צריכה","אפשר","בבקשה","תודה","הוא","היא","הם","הזה","בין","אחרי","לפני","כדי","עבור","בתוך","ניתוח","חדר",
]);

function topWords(questions: string[], limit: number) {
  const counts = new Map<string, number>();
  for (const q of questions) {
    const seen = new Set<string>();
    for (const w of normalize(q).split(" ")) {
      const word = w.replace(/^ה/, "");
      if (word.length < 3 || STOP.has(w) || STOP.has(word)) continue;
      if (seen.has(word)) continue;
      seen.add(word);
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([topic, count]) => ({ topic, count }));
}

function countBy<T extends string>(items: T[]) {
  const map = new Map<T, number>();
  for (const i of items) map.set(i, (map.get(i) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count }));
}

export function buildReport(rows: LogRow[]) {
  const total = rows.length;
  const answered = rows.filter((r) => r.answered).length;
  const unansweredRows = rows.filter((r) => !r.answered);

  const repeatMap = new Map<string, { question: string; count: number; answered: number }>();
  for (const r of rows) {
    const key = normalize(r.question);
    const cur = repeatMap.get(key) ?? { question: r.question, count: 0, answered: 0 };
    cur.count += 1;
    if (r.answered) cur.answered += 1;
    repeatMap.set(key, cur);
  }

  const byDayMap = new Map<string, number>();
  for (const r of rows) {
    const day = r.created_at.slice(0, 10);
    byDayMap.set(day, (byDayMap.get(day) ?? 0) + 1);
  }

  const sources = rows.flatMap((r) => r.source_names ?? []);

  return {
    total,
    answered,
    unanswered: total - answered,
    answerRate: total === 0 ? 0 : Math.round((answered / total) * 100),
    topQuestions: [...repeatMap.values()].sort((a, b) => b.count - a.count).slice(0, 15),
    gapTopics: topWords(unansweredRows.map((r) => r.question), 12),
    hotTopics: topWords(rows.map((r) => r.question), 12),
    bySurface: countBy(rows.map((r) => r.surface)),
    topSources: countBy(sources).slice(0, 10),
    byDay: [...byDayMap.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([day, count]) => ({ day, count })),
    recentUnanswered: unansweredRows.slice(0, 40).map((r) => ({
      id: r.id,
      question: r.question,
      surface: r.surface,
      created_at: r.created_at,
    })),
    recent: rows.slice(0, 60).map((r) => ({
      id: r.id,
      question: r.question,
      answered: r.answered,
      surface: r.surface,
      sources: r.source_names ?? [],
      created_at: r.created_at,
    })),
  };
}

export function buildInstallReport(events: InstallEvent[]) {
  const total = events.length;
  const accepted = events.filter((e) => e.outcome === "accepted");
  const acceptedCount = accepted.length;
  const uniqueTotal = new Set(events.map((e) => e.anonymous_id)).size;
  const uniqueAccepted = new Set(accepted.map((e) => e.anonymous_id)).size;

  const byDayMap = new Map<string, number>();
  for (const e of events) {
    const day = e.created_at.slice(0, 10);
    byDayMap.set(day, (byDayMap.get(day) ?? 0) + 1);
  }

  return {
    total,
    acceptedCount,
    uniqueTotal,
    uniqueAccepted,
    acceptedRate: total === 0 ? 0 : Math.round((acceptedCount / total) * 100),
    byOutcome: countBy(events.map((e) => e.outcome)),
    byPlatform: countBy(events.map((e) => e.platform || "לא ידוע")),
    byDay: [...byDayMap.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([day, count]) => ({ day, count })),
    recent: events.slice(0, 100).map((e) => ({
      id: e.id,
      outcome: e.outcome,
      platform: e.platform,
      anonymous_id: e.anonymous_id.slice(0, 8) + "…",
      created_at: e.created_at,
    })),
  };
}
