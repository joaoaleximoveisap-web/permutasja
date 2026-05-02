CREATE OR REPLACE FUNCTION public.increment_session_done(session_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.import_sessions
  SET total_done = total_done + 1
  WHERE id = session_uuid;
END;
$$;