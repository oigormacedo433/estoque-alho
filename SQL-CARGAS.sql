CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.cargas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_carga date NOT NULL DEFAULT CURRENT_DATE,
  hora time without time zone DEFAULT CURRENT_TIME,
  numero_carga text NOT NULL,
  cliente text NOT NULL,
  quantidade_total_caixas numeric NOT NULL DEFAULT 0 CHECK (quantidade_total_caixas >= 0),
  peso_total_kg numeric NOT NULL DEFAULT 0 CHECK (peso_total_kg >= 0),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmada', 'cancelada')),
  responsavel_id uuid NULL REFERENCES public.responsaveis(id),
  observacao text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.carga_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carga_id uuid NOT NULL REFERENCES public.cargas(id) ON DELETE CASCADE,
  calibre_id uuid NOT NULL REFERENCES public.calibres(id),
  quantidade_caixas numeric NOT NULL DEFAULT 0 CHECK (quantidade_caixas > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cargas_data_carga ON public.cargas(data_carga);
CREATE INDEX IF NOT EXISTS idx_cargas_status ON public.cargas(status);
CREATE INDEX IF NOT EXISTS idx_cargas_cliente ON public.cargas(cliente);
CREATE INDEX IF NOT EXISTS idx_carga_itens_carga_id ON public.carga_itens(carga_id);
CREATE INDEX IF NOT EXISTS idx_carga_itens_calibre_id ON public.carga_itens(calibre_id);

CREATE OR REPLACE FUNCTION public.atualizar_updated_at_cargas()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cargas_updated_at ON public.cargas;

CREATE TRIGGER trg_cargas_updated_at
BEFORE UPDATE ON public.cargas
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_updated_at_cargas();

ALTER TABLE public.cargas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.carga_itens DISABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cargas TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carga_itens TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
