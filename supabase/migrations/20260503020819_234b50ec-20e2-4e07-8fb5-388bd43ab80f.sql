-- Ensure the properties table exists with correct RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Allow public access for development and extraction
DROP POLICY IF EXISTS "Public insert access for properties" ON public.properties;
DROP POLICY IF EXISTS "Allow public insert" ON public.properties;
CREATE POLICY "Allow public insert" ON public.properties FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public update access for properties" ON public.properties;
CREATE POLICY "Allow public update" ON public.properties FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Public read access for properties" ON public.properties;
CREATE POLICY "Allow public select" ON public.properties FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public delete access for properties" ON public.properties;
CREATE POLICY "Allow public delete" ON public.properties FOR DELETE TO public USING (true);

-- Ensure import_sessions is also flexible
ALTER TABLE public.import_sessions ALTER COLUMN user_id DROP NOT NULL;
