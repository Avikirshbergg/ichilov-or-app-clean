ALTER TABLE public.meeting_attendance ADD COLUMN IF NOT EXISTS device_id text;
CREATE UNIQUE INDEX IF NOT EXISTS meeting_attendance_device_per_meeting
  ON public.meeting_attendance (meeting_date, device_id)
  WHERE device_id IS NOT NULL;