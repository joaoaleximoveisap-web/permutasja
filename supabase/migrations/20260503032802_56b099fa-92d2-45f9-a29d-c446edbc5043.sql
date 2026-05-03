-- Update properties table to support the new JSON-First architecture
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Ensure we have a unique constraint for upsert based on a stable external ID or hash
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'properties_external_id_key') THEN
        ALTER TABLE public.properties ADD CONSTRAINT properties_external_id_key UNIQUE (external_id);
    END IF;
END $$;

-- Enhance import_logs for better status tracking
ALTER TABLE public.import_logs 
ADD COLUMN IF NOT EXISTS page_number INTEGER,
ADD COLUMN IF NOT EXISTS items_count INTEGER DEFAULT 0;
