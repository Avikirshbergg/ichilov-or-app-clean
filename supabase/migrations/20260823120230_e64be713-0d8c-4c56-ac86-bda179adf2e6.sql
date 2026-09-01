CREATE TABLE public.install_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id text NOT NULL,
  outcome text NOT NULL,
  platform text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.install_events TO service_role;

ALTER TABLE public.install_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages install events"
  ON public.install_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);