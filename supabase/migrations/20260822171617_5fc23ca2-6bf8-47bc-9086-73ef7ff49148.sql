CREATE TABLE public.meeting_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_title text NOT NULL,
  meeting_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jerusalem')::date,
  signer_name text NOT NULL,
  role text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy_meters double precision,
  distance_meters double precision NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX meeting_attendance_date_idx ON public.meeting_attendance (meeting_date DESC);
GRANT ALL ON public.meeting_attendance TO service_role;
ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;