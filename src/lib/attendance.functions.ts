import { createServerFn } from "@tanstack/react-start";

function isValidISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}

export const listAttendance = createServerFn({ method: "POST" })
  .inputValidator((data: { meetingDate?: string }) => ({
    meetingDate: typeof data?.meetingDate === "string" && isValidISODate(data.meetingDate) ? data.meetingDate : "",
  }))
  .handler(async ({ data }) => {
    const { fetchAttendance, fetchRecentAttendance } = await import("./attendance.server");
    const rows = data.meetingDate
      ? await fetchAttendance(data.meetingDate)
      : await fetchRecentAttendance();
    return rows.map((r) => ({
      id: r.id,
      date: r.meeting_date,
      name: r.signer_name,
      role: r.role,
      distance: Math.round(r.distance_meters),
      at: r.created_at,
    }));
  });

export const signAttendance = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      meetingDate: string;
      name: string;
      role?: string;
      latitude: number;
      longitude: number;
      accuracy?: number;
      deviceId: string;
    }) => {
      if (!data || !isValidISODate(data.meetingDate)) throw new Error("תאריך הישיבה חסר או לא תקין");
      if (typeof data.name !== "string" || data.name.trim().length < 2)
        throw new Error("יש להזין שם מלא");
      if (typeof data.latitude !== "number" || typeof data.longitude !== "number")
        throw new Error("לא התקבל מיקום מהמכשיר");
      if (typeof data.deviceId !== "string" || data.deviceId.trim().length < 8)
        throw new Error("לא זוהה המכשיר. יש לפתוח את האפליקציה מחדש ולנסות שוב");
      return {
        meetingDate: data.meetingDate,
        name: data.name,
        role: typeof data.role === "string" ? data.role : "",
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: typeof data.accuracy === "number" ? data.accuracy : undefined,
        deviceId: data.deviceId,
      };
    },
  )
  .handler(async ({ data }) => {
    const { insertAttendance } = await import("./attendance.server");
    return insertAttendance({
      meetingDate: data.meetingDate,
      signerName: data.name,
      role: data.role,
      latitude: data.latitude,
      longitude: data.longitude,
      deviceId: data.deviceId,
      ...(data.accuracy != null ? { accuracy: data.accuracy } : {}),
    });
  });
