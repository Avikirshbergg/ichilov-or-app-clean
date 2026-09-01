GRANT ALL ON public.meeting_attendance TO service_role;
GRANT ALL ON public.meeting_signatures TO service_role;
GRANT ALL ON public.question_logs TO service_role;

CREATE POLICY "Service role manages meeting attendance"
  ON public.meeting_attendance
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role manages meeting signatures"
  ON public.meeting_signatures
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role manages question logs"
  ON public.question_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);