-- Create properties table
CREATE TABLE public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL NOT NULL,
    area DECIMAL,
    bedrooms INTEGER,
    bathrooms INTEGER,
    parking INTEGER,
    city TEXT,
    neighborhood TEXT,
    type TEXT,
    images TEXT[] DEFAULT '{}',
    source_url TEXT UNIQUE,
    permuta_enabled BOOLEAN DEFAULT FALSE,
    permuta_details TEXT,
    tags TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'published',
    original_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create policies (Public for development as requested)
CREATE POLICY "Public read access for properties" ON public.properties FOR SELECT USING (true);
CREATE POLICY "Public insert access for properties" ON public.properties FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for properties" ON public.properties FOR UPDATE USING (true);
CREATE POLICY "Public delete access for properties" ON public.properties FOR DELETE USING (true);
