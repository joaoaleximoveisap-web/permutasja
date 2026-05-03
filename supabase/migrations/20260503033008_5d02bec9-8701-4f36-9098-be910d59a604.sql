-- Tabela para armazenar as configurações de design da interface
CREATE TABLE IF NOT EXISTS public.ui_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id TEXT UNIQUE NOT NULL,
  settings JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS e permitir acesso público para edição rápida
ALTER TABLE public.ui_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to UI config" ON public.ui_config FOR ALL USING (true);
