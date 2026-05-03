-- Ensure properties table has necessary columns including a jsonb metadata field
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE,
    title TEXT NOT NULL,
    price DECIMAL,
    location JSONB,
    features JSONB,
    media TEXT[],
    url TEXT,
    source TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Allow public read, authenticated write (adjust as needed)
CREATE POLICY "Allow public read access to properties" ON public.properties FOR SELECT USING (true);
CREATE POLICY "Allow service role to manage properties" ON public.properties FOR ALL USING (auth.role() = 'service_role');

-- Create import_logs table for real-time feedback
CREATE TABLE IF NOT EXISTS public.import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on import_logs
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to import_logs" ON public.import_logs FOR SELECT USING (true);
