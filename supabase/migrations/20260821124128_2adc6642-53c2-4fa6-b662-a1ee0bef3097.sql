CREATE TABLE public.question_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answered BOOLEAN NOT NULL DEFAULT false,
  source_names TEXT[] NOT NULL DEFAULT '{}',
  surface TEXT NOT NULL DEFAULT 'chat',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT ALL ON public.question_logs TO service_role;
ALTER TABLE public.question_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX question_logs_created_at_idx ON public.question_logs (created_at DESC);