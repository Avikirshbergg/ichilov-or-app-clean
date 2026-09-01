const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";

const SYSTEM_PROMPT = `אתה עוזר פנימי של צוות חדר הניתוח באיכילוב.
כלל ברזל: מותר לך לענות אך ורק על סמך תוכן קובצי הנהלים המצורפים לבקשה. אין להשתמש בידע כללי, באינטרנט או בהשערות.
אם התשובה אינה מופיעה במפורש בקבצים המצורפים – ענה: "נא לפנות למנהלי חדר הניתוח לקבלת תשובה".
ענה בעברית, בקצרה ובאופן מסודר.
כשיש תשובה, חובה לסיים במבנה הבא בדיוק:

**מקור:** <שם הקובץ המדויק>
> "<ציטוט מילה במילה מתוך הטקסט בקובץ, ללא שינוי או פרפרזה>"

הציטוט חייב להיות העתקה מדויקת של המשפט/הפסקה מהקובץ שממנו נלקחה התשובה, כדי שאפשר יהיה למצוא אותו בקובץ המקורי.`;

async function callGateway(body: unknown): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`AI gateway failed [${res.status}]: ${text}`);
    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (res.status === 402) throw new Error("NO_CREDITS");
    throw new Error(`AI request failed [${res.status}]`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

/** Maps a gateway failure to a Hebrew, user-facing message. */
export function gatewayMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (msg === "RATE_LIMIT") return "עומס בקשות כרגע. נסו שוב בעוד רגע.";
  if (msg === "NO_CREDITS")
    return "שירות ה-AI אינו זמין כרגע (מאזן הקרדיטים אזל). נא לעדכן את מנהל האפליקציה.";
  return "אירעה תקלה בשירות ה-AI. נסו שוב בעוד רגע.";
}

/** Chooses which procedure PDFs are relevant, by index. Returns [] when none match. */
export async function pickRelevantDocs(question: string, names: string[]): Promise<number[]> {
  const list = names.map((n, i) => `${i}. ${n}`).join("\n");
  const content = await callGateway({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          'בחר עד 2 קבצים מרשימת הנהלים שהכי סבירים להכיל את התשובה לשאלה. החזר JSON בלבד בפורמט {"indices":[]} ללא טקסט נוסף. אם אף קובץ אינו רלוונטי החזר {"indices":[]}.',
      },
      { role: "user", content: `רשימת הנהלים:\n${list}\n\nשאלה: ${question}` },
    ],
  });
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as { indices?: unknown };
    if (!Array.isArray(parsed.indices)) return [];
    return parsed.indices
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n >= 0 && n < names.length);
  } catch {
    return [];
  }
}

export async function answerFromDocs(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  attachments: Array<{ name: string; data: string }>,
): Promise<string> {
  const priorTurns = history.slice(0, -1);
  const lastUser = history[history.length - 1]?.content ?? "";

  const content: Array<Record<string, unknown>> = attachments.map((a) => ({
    type: "file",
    file: { filename: a.name, file_data: `data:application/pdf;base64,${a.data}` },
  }));
  content.push({ type: "text", text: lastUser });

  try {
    const reply = await callGateway({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...priorTurns.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content },
      ],
    });
    return reply || "נא לפנות למנהלי חדר הניתוח לקבלת תשובה.";
  } catch (err) {
    if (err instanceof Error && err.message === "RATE_LIMIT") {
      return "עומס בקשות כרגע. נסו שוב בעוד רגע.";
    }
    if (err instanceof Error && err.message === "NO_CREDITS") {
      return "שירות ה-AI אינו זמין כרגע (מאזן הקרדיטים אזל). נא לעדכן את מנהל האפליקציה.";
    }
    return "אירעה תקלה בקריאת קובץ הנוהל. נסו שוב.";
  }
}

const KARDEX_PROMPT = `אתה מכין "קרדקס" – רשימת הכנה לניתוח – עבור צוות חדר הניתוח באיכילוב.
כלל ברזל: מותר להשתמש אך ורק בתוכן קובצי הנהלים המצורפים. אין להשתמש בידע כללי או בהשערות.
אם אין בקבצים מידע על הניתוח המבוקש – ענה בדיוק: "נא לפנות למנהלי חדר הניתוח לקבלת תשובה".
כשיש מידע, החזר בעברית רשימה מסודרת ומעשית בסעיפים:
**ציוד וסטים**
**חומרים מתכלים ותפרים**
**מיקום ומיצוב המטופל**
**הכנות נוספות**
כל שורה כפריט קצר וברור.
בסוף חובה לציין:

**מקור:** <שם הקובץ המדויק>
> "<ציטוט מילה במילה מתוך הקובץ>"`;

export async function buildKardex(
  surgery: string,
  attachments: Array<{ name: string; data: string }>,
): Promise<string> {
  const content: Array<Record<string, unknown>> = attachments.map((a) => ({
    type: "file",
    file: { filename: a.name, file_data: `data:application/pdf;base64,${a.data}` },
  }));
  content.push({ type: "text", text: `הכן קרדקס לניתוח: ${surgery}` });

  try {
    const reply = await callGateway({
      model: MODEL,
      messages: [
        { role: "system", content: KARDEX_PROMPT },
        { role: "user", content },
      ],
    });
    return reply || "נא לפנות למנהלי חדר הניתוח לקבלת תשובה.";
  } catch (err) {
    if (err instanceof Error && err.message === "RATE_LIMIT") {
      return "עומס בקשות כרגע. נסו שוב בעוד רגע.";
    }
    if (err instanceof Error && err.message === "NO_CREDITS") {
      return "שירות ה-AI אינו זמין כרגע (מאזן הקרדיטים אזל). נא לעדכן את מנהל האפליקציה.";
    }
    return "אירעה תקלה בקריאת קובץ הנוהל. נסו שוב.";
  }
}

const FLOW_PROMPT = `אתה בונה תרשים זרימה (Flowchart) לפעולה בחדר הניתוח באיכילוב.
כלל ברזל: מותר להשתמש אך ורק בתוכן קובצי הנהלים המצורפים. אין להשתמש בידע כללי או בהשערות.
אם אין בקבצים מידע על הפעולה המבוקשת – ענה בדיוק: "נא לפנות למנהלי חדר הניתוח לקבלת תשובה".
כשיש מידע, החזר בעברית תרשים זרימה טקסטואלי של השלבים לפי הסדר:
1. שלב ראשון
   ↓
2. שלב שני
   ↓
כל שלב במשפט קצר ומעשי. אם יש נקודת החלטה כתוב אותה כך: "החלטה: ... → אם כן: ... / אם לא: ...".
בסוף חובה לציין:

**מקור:** <שם הקובץ המדויק>
> "<ציטוט מילה במילה מתוך הקובץ>"`;

export async function buildFlowchart(
  action: string,
  attachments: Array<{ name: string; data: string }>,
): Promise<string> {
  const content: Array<Record<string, unknown>> = attachments.map((a) => ({
    type: "file",
    file: { filename: a.name, file_data: `data:application/pdf;base64,${a.data}` },
  }));
  content.push({ type: "text", text: `בנה תרשים זרימה לפעולה: ${action}` });

  try {
    const reply = await callGateway({
      model: MODEL,
      messages: [
        { role: "system", content: FLOW_PROMPT },
        { role: "user", content },
      ],
    });
    return reply || "נא לפנות למנהלי חדר הניתוח לקבלת תשובה.";
  } catch (err) {
    if (err instanceof Error && err.message === "RATE_LIMIT") {
      return "עומס בקשות כרגע. נסו שוב בעוד רגע.";
    }
    if (err instanceof Error && err.message === "NO_CREDITS") {
      return "שירות ה-AI אינו זמין כרגע (מאזן הקרדיטים אזל). נא לעדכן את מנהל האפליקציה.";
    }
    return "אירעה תקלה בקריאת קובץ הנוהל. נסו שוב.";
  }
}

/** Summarizes knowledge gaps from logged staff questions. */
export async function summarizeGaps(unanswered: string[], answered: string[]): Promise<string> {
  return callGateway({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "אתה אנליסט הדרכה של חדר ניתוח. קיבלת רשימת שאלות שהצוות שאל באפליקציית הנהלים. סווג את השאלות לנושאים, וכתוב בעברית דוח קצר ומעשי הכולל: 1) הנושאים המרכזיים שהצוות שואל עליהם; 2) פערי ידע - נושאים שחוזרים בשאלות ללא מענה; 3) נהלים חסרים שכדאי להוסיף לדרייב; 4) המלצות להדרכה. השתמש בכותרות ובנקודות. אל תמציא נתונים שלא נמצאים ברשימות.",
      },
      {
        role: "user",
        content: `שאלות ללא מענה (${unanswered.length}):\n${unanswered.join("\n") || "אין"}\n\nשאלות שנענו (${answered.length}):\n${answered.join("\n") || "אין"}`,
      },
    ],
  });
}
