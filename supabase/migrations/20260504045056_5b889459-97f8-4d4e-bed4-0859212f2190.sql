-- Create leads table for demands
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    external_id TEXT UNIQUE,
    data_original TEXT NOT NULL,
    corretor TEXT NOT NULL,
    tipo TEXT NOT NULL,
    localizacao TEXT[] DEFAULT '{}',
    preco_min NUMERIC,
    preco_max NUMERIC,
    observacoes TEXT,
    status TEXT DEFAULT 'ativo',
    metadata JSONB DEFAULT '{}'
);

-- Create inventory_offers table
CREATE TABLE public.inventory_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    external_id TEXT UNIQUE,
    data_original TEXT NOT NULL,
    corretor TEXT NOT NULL,
    tipo TEXT,
    codigo TEXT,
    preco NUMERIC,
    bairro TEXT,
    link TEXT,
    permuta JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_offers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public leads access" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Public inventory access" ON public.inventory_offers FOR SELECT USING (true);
CREATE POLICY "Insert leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Insert inventory" ON public.inventory_offers FOR INSERT WITH CHECK (true);

-- Seed Initial Demands
INSERT INTO public.leads (external_id, data_original, corretor, tipo, localizacao, preco_max, observacoes)
VALUES 
('d001', '14/04/2026 09:20', 'Gabriel Turquino', 'terreno', '{Tauá, Araçari, Tangará}', 350000, 'Cliente busca terreno e pediu envio no privado'),
('d002', '14/04/2026 09:51', 'Willian Fabrin', 'apartamento', '{Centro}', 350000, 'Cliente busca apartamento no centro, preferência sala espaçosa'),
('d004', '14/04/2026 14:42', 'Roberta', 'apartamento', '{Próximo à Av. Inglaterra}', NULL, 'Cliente possui casa no José Bastos e deseja permuta');

-- Seed Initial Offers
INSERT INTO public.inventory_offers (external_id, data_original, corretor, codigo, tipo, preco, bairro, link, metadata)
VALUES 
('o001', '13/04/2026 21:41', 'Leila Oberhauser', 'CA4424', 'casa', 620000, 'Ouro Branco', 'http://auroraimobi.com.br/imovel/detalhes/CA4424-AURO', '{"quartos": 3, "suites": 1}'::jsonb),
('o005', '14/04/2026 18:39', 'Nabil Geha', 'AP13520', 'apartamento', 1850000, 'Gleba Palhano', 'http://auroraimobi.com.br/imovel/detalhes/AP13520-AURO', '{"area": 185, "suites": 3}'::jsonb);
