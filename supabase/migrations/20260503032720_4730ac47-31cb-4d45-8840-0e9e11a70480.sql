-- Ensure properties table has JSONB columns for flexible data structure
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS location_json JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS features_json JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create a table for extraction logs to provide real-time feedback
CREATE TABLE IF NOT EXISTS public.import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL,
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view import logs" ON public.import_logs FOR SELECT USING (true);
