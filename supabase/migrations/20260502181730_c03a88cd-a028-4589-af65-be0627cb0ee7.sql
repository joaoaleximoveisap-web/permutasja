-- Create Enum for session and job statuses
DO $$ BEGIN
    CREATE TYPE public.import_session_status AS ENUM ('scanning', 'processing', 'done', 'cancelled', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.import_job_status AS ENUM ('pending', 'processing', 'done', 'failed', 'skipped');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table 1: import_sessions
CREATE TABLE IF NOT EXISTS public.import_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    source_url TEXT NOT NULL,
    total_found INTEGER DEFAULT 0,
    total_done INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    status public.import_session_status DEFAULT 'scanning',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    finished_at TIMESTAMP WITH TIME ZONE,
    error_log TEXT
);

-- Table 2: import_jobs
CREATE TABLE IF NOT EXISTS public.import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.import_sessions(id) ON DELETE CASCADE,
    property_url TEXT NOT NULL,
    status public.import_job_status DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    error_log TEXT,
    raw_data JSONB,
    is_duplicate BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Table 3: import_preview_selections
CREATE TABLE IF NOT EXISTS public.import_preview_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.import_sessions(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.import_jobs(id) ON DELETE CASCADE,
    selected BOOLEAN DEFAULT true,
    edited_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_preview_selections ENABLE ROW LEVEL SECURITY;

-- Policies for import_sessions
CREATE POLICY "Users can manage their own sessions"
ON public.import_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policies for import_jobs (linked to session)
CREATE POLICY "Users can manage jobs from their sessions"
ON public.import_jobs
FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.import_sessions
    WHERE import_sessions.id = import_jobs.session_id
    AND import_sessions.user_id = auth.uid()
));

-- Policies for import_preview_selections (linked to session)
CREATE POLICY "Users can manage selections from their sessions"
ON public.import_preview_selections
FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.import_sessions
    WHERE import_sessions.id = import_preview_selections.session_id
    AND import_sessions.user_id = auth.uid()
));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_import_jobs_session_status ON public.import_jobs(session_id, status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_url ON public.import_jobs(property_url);
CREATE INDEX IF NOT EXISTS idx_import_sessions_user_status ON public.import_sessions(user_id, status);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.import_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.import_jobs;
