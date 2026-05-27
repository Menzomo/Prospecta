-- Reduce lead_categories to the 5 official MVP categories.
-- Categories removed: 17 legacy entries.
-- Categories added: Construção Civil, Consultórios Médicos (did not exist before).
-- global_leads.category_id FK is ON DELETE SET NULL — nulled automatically for removed categories.

-- Insert the 2 new categories if they don't exist yet
INSERT INTO public.lead_categories (name, slug, search_terms, created_at, updated_at)
VALUES
  (
    'Construção Civil',
    'construcao-civil',
    ARRAY['construtora', 'construção civil', 'empreiteira', 'incorporadora'],
    now(),
    now()
  ),
  (
    'Consultórios Médicos',
    'consultorios-medicos',
    ARRAY['consultório médico', 'clínica médica', 'médico', 'medicina'],
    now(),
    now()
  )
ON CONFLICT (slug) DO NOTHING;

-- Delete every category that is not one of the 5 official ones.
-- global_leads.category_id has ON DELETE SET NULL, so affected rows are automatically nulled.
DELETE FROM public.lead_categories
WHERE slug NOT IN (
  'metalurgica',
  'industria-plastica',
  'construcao-civil',
  'restaurantes',
  'consultorios-medicos'
);
