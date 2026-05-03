-- Ensure RLS is enabled
ALTER TABLE public.import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow insert for all" ON public.import_sessions;
DROP POLICY IF EXISTS "Allow select for owners and guests" ON public.import_sessions;
DROP POLICY IF EXISTS "Allow select for all" ON public.import_jobs;
DROP POLICY IF EXISTS "Allow all for service role" ON public.import_sessions;
DROP POLICY IF EXISTS "Allow all for service role" ON public.import_jobs;

-- Policies for import_sessions
CREATE POLICY "Allow insert for all" 
ON public.import_sessions 
FOR INSERT 
TO public, authenticated
WITH CHECK (true);

CREATE POLICY "Allow select for owners and guests" 
ON public.import_sessions 
FOR SELECT 
TO public, authenticated
USING (
  auth.uid() = user_id OR 
  user_id = '00000000-0000-0000-0000-000000000000' OR
  (auth.uid() IS NULL AND user_id = '00000000-0000-0000-0000-000000000000')
);

CREATE POLICY "Allow update for owners and guests" 
ON public.import_sessions 
FOR UPDATE 
TO public, authenticated
USING (
  auth.uid() = user_id OR 
  user_id = '00000000-0000-0000-0000-000000000000'
);

-- Policies for import_jobs
CREATE POLICY "Allow select for all" 
ON public.import_jobs 
FOR SELECT 
TO public, authenticated
USING (true);

-- Note: Edge functions use service_role which bypasses RLS, 
-- but we define these for completeness and local testing if needed.
