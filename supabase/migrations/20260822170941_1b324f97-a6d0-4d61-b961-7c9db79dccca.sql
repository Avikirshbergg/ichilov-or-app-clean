CREATE TABLE public.meeting_signatures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id text NOT NULL,
  file_name text NOT NULL,
  signer_name text NOT NULL,
  role text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX meeting_signatures_file_id_idx ON public.meeting_signatures (file_id);
GRANT ALL ON public.meeting_signatures TO service_role;
ALTER TABLE public.meeting_signatures ENABLE ROW LEVEL SECURITY;