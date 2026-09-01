import { supabaseAdmin } from "@/integrations/supabase/client.server";

// בית החולים איכילוב (המרכז הרפואי סוראסקי) — ויצמן 6, תל אביב
export const HOSPITAL_LAT = 32.0808;
export const HOSPITAL_LON = 34.7906;
export const ALLOWED_RADIUS_METERS = 350;
export const MAX_ACCURACY_METERS = 200;

export function distanceMeters(lat: number, lon: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat - HOSPITAL_LAT);
  const dLon = toRad(lon - HOSPITAL_LON);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(HOSPITAL_LAT)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export type AttendanceRow = {
  id: string;
  meeting_date: string;
  signer_name: string;
  role: string | null;
  distance_meters: number;
  created_at: string;
};

export async function fetchAttendance(meetingDate: string): Promise<AttendanceRow[]> {
  const { data, error } = await supabaseAdmin
    .from("meeting_attendance")
    .select("id, meeting_date, signer_name, role, distance_meters, created_at")
    .eq("meeting_date", meetingDate)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AttendanceRow[];
}

export async function fetchRecentAttendance(limit = 200): Promise<AttendanceRow[]> {
  const { data, error } = await supabaseAdmin
    .from("meeting_attendance")
    .select("id, meeting_date, signer_name, role, distance_meters, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as AttendanceRow[];
}

function isValidISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}

export async function insertAttendance(params: {
  meetingDate: string;
  signerName: string;
  role?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  deviceId: string;
}) {
  const date = params.meetingDate.trim();
  if (!isValidISODate(date)) throw new Error("יש לבחור תאריך ישיבה תקין");
  const signer = params.signerName.trim().slice(0, 120);
  if (signer.length < 2) throw new Error("יש להזין שם מלא");

  if (
    !Number.isFinite(params.latitude) ||
    !Number.isFinite(params.longitude) ||
    Math.abs(params.latitude) > 90 ||
    Math.abs(params.longitude) > 180
  ) {
    throw new Error("לא התקבל מיקום תקין מהמכשיר");
  }

  if (params.accuracy != null && params.accuracy > MAX_ACCURACY_METERS) {
    throw new Error("דיוק המיקום נמוך מדי. יש לצאת לאזור עם קליטה טובה ולנסות שוב");
  }

  const distance = distanceMeters(params.latitude, params.longitude);
  if (distance > ALLOWED_RADIUS_METERS) {
    throw new Error(
      `החתימה אפשרית רק מתוך בית החולים (ויצמן 6, תל אביב). המרחק שנמדד: כ־${distance} מטר`,
    );
  }

  const device = (params.deviceId || "").trim().slice(0, 64);
  if (device.length < 8) throw new Error("לא זוהה המכשיר. יש לפתוח את האפליקציה מחדש ולנסות שוב");

  const { data: existing } = await supabaseAdmin
    .from("meeting_attendance")
    .select("id")
    .eq("meeting_date", date)
    .ilike("signer_name", signer)
    .maybeSingle();
  if (existing) throw new Error("כבר נרשמה נוכחות בשם הזה לישיבה בתאריך הזה");

  // מכשיר אחד = חתימה אחת בישיבה
  const { data: deviceSigned } = await supabaseAdmin
    .from("meeting_attendance")
    .select("id, signer_name")
    .eq("meeting_date", date)
    .eq("device_id", device)
    .maybeSingle();
  if (deviceSigned)
    throw new Error(
      `מהמכשיר הזה כבר נרשמה נוכחות לישיבה זו (${deviceSigned.signer_name}). כל אחד חותם מהמכשיר האישי שלו`,
    );

  // המכשיר נעול לשם שנרשם ממנו בעבר
  const { data: prior } = await supabaseAdmin
    .from("meeting_attendance")
    .select("signer_name")
    .eq("device_id", device)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (prior && prior.signer_name.trim().toLowerCase() !== signer.toLowerCase())
    throw new Error(
      `המכשיר הזה רשום על שם ${prior.signer_name}. לא ניתן לחתום ממנו בשם אחר`,
    );

  const { error } = await supabaseAdmin.from("meeting_attendance").insert({
    device_id: device,
    meeting_title: date,
    meeting_date: date,
    signer_name: signer,
    role: params.role?.trim().slice(0, 120) || null,
    latitude: params.latitude,
    longitude: params.longitude,
    accuracy_meters: params.accuracy ?? null,
    distance_meters: distance,
  });
  if (error) throw new Error(error.message);
  return { ok: true as const, distance };
}
