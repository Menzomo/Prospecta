-- ============================================================
-- FASE 1: Banco Global Prospecta  (idempotent rewrite)
-- ============================================================
-- Introduz:
--   1. profiles.role          (admin | user)
--   2. lead_categories         (catálogo global de categorias)
--   3. global_leads            (banco global de empresas)
--   4. user_leads              (vínculo usuário ↔ lead global)
--
-- Não altera tabelas existentes (leads, profiles exceto role,
-- templates, email_threads, email_messages, followups).
-- ============================================================


-- ============================================================
-- 1. PROFILES — adicionar campo role
-- ============================================================

alter table public.profiles
  add column if not exists role text not null default 'user';


-- ============================================================
-- 2. HELPER — verificar se usuário autenticado é admin
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;


-- ============================================================
-- 3. LEAD_CATEGORIES — catálogo global de categorias
-- ============================================================
-- A tabela pode já existir com schema antigo (id, name, created_at).
-- CREATE TABLE IF NOT EXISTS garante que em DBs frescos ela é criada.
-- Os ALTER TABLE abaixo adicionam colunas novas de forma segura.

create table if not exists public.lead_categories (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  created_at timestamptz not null default now()
);

alter table public.lead_categories
  add column if not exists slug             text;

alter table public.lead_categories
  add column if not exists search_terms     text[] not null default '{}';

alter table public.lead_categories
  add column if not exists confidence_rules jsonb  not null default '{}';

alter table public.lead_categories
  add column if not exists updated_at       timestamptz not null default now();

alter table public.lead_categories enable row level security;

drop policy if exists "lead_categories_select_auth" on public.lead_categories;
create policy "lead_categories_select_auth"
  on public.lead_categories for select
  to authenticated
  using (true);

drop policy if exists "lead_categories_insert_admin" on public.lead_categories;
create policy "lead_categories_insert_admin"
  on public.lead_categories for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "lead_categories_update_admin" on public.lead_categories;
create policy "lead_categories_update_admin"
  on public.lead_categories for update
  to authenticated
  using (public.is_admin());

create index if not exists lead_categories_slug_idx on public.lead_categories (slug);


-- ============================================================
-- 4. SEED — categorias iniciais  (idempotent upsert)
-- ============================================================
-- Passo 1: atualiza linhas existentes que ainda não têm slug.
-- Passo 2: insere categorias que ainda não existem pelo nome.

update public.lead_categories as t
set
  slug         = s.slug,
  search_terms = s.terms,
  updated_at   = now()
from (values
  ('Restaurantes',         'restaurantes',         ARRAY['restaurante', 'restaurantes', 'lanchonete', 'pizzaria', 'churrascaria']),
  ('Dentistas',            'dentistas',            ARRAY['dentista', 'odontologia', 'clínica odontológica', 'consultório dentário']),
  ('Academias',            'academias',            ARRAY['academia', 'gym', 'fitness', 'musculação']),
  ('Mercados',             'mercados',             ARRAY['mercado', 'supermercado', 'mercearia', 'mercadinho']),
  ('Advogados',            'advogados',            ARRAY['advogado', 'escritório de advocacia', 'advocacia', 'jurídico']),
  ('Auto Peças',           'auto-pecas',           ARRAY['auto peças', 'autopeças', 'peças automotivas', 'peças de carro']),
  ('Barbearias',           'barbearias',           ARRAY['barbearia', 'barbeiro', 'corte masculino']),
  ('Salões Beleza',        'saloes-beleza',        ARRAY['salão de beleza', 'cabeleireiro', 'estética', 'salão']),
  ('Clínicas',             'clinicas',             ARRAY['clínica médica', 'clínica', 'ambulatório', 'consultório médico']),
  ('Pet Shop',             'pet-shop',             ARRAY['pet shop', 'veterinária', 'petshop', 'loja de animais']),
  ('Contabilidade',        'contabilidade',        ARRAY['contabilidade', 'contador', 'escritório contábil', 'contábil']),
  ('Imobiliárias',         'imobiliarias',         ARRAY['imobiliária', 'imóveis', 'corretor de imóveis', 'venda de imóveis']),
  ('Mecânicas',            'mecanicas',            ARRAY['mecânica', 'oficina mecânica', 'auto center', 'funilaria']),
  ('Papelarias',           'papelarias',           ARRAY['papelaria', 'artigos de escritório', 'papelaria e presentes']),
  ('Farmácias',            'farmacias',            ARRAY['farmácia', 'drogaria', 'farmácia de manipulação']),
  ('Padarias',             'padarias',             ARRAY['padaria', 'confeitaria', 'bakery', 'pão de forma']),
  ('Materiais Construção', 'materiais-construcao', ARRAY['materiais de construção', 'loja de construção', 'ferragem', 'depósito de materiais']),
  ('Lojas Roupa',          'lojas-roupa',          ARRAY['loja de roupa', 'vestuário', 'moda', 'boutique']),
  ('Decoração Infantil',   'decoracao-infantil',   ARRAY['decoração infantil', 'festa infantil', 'artigos infantis', 'brinquedos']),
  ('Móveis Planejados',    'moveis-planejados',    ARRAY['móveis planejados', 'marcenaria', 'móveis sob medida', 'marceneiro']),
  ('Metalúrgica',          'metalurgica',          ARRAY['metalúrgica', 'metalurgia', 'usinagem', 'caldeiraria', 'CNC', 'serralheria']),
  ('Indústria Plástica',   'industria-plastica',   ARRAY['indústria plástica', 'plástico', 'moldagem plástica', 'injeção plástica'])
) as s(name, slug, terms)
where t.name = s.name
  and t.slug is null;

insert into public.lead_categories (name, slug, search_terms)
select s.name, s.slug, s.terms
from (values
  ('Restaurantes',         'restaurantes',         ARRAY['restaurante', 'restaurantes', 'lanchonete', 'pizzaria', 'churrascaria']),
  ('Dentistas',            'dentistas',            ARRAY['dentista', 'odontologia', 'clínica odontológica', 'consultório dentário']),
  ('Academias',            'academias',            ARRAY['academia', 'gym', 'fitness', 'musculação']),
  ('Mercados',             'mercados',             ARRAY['mercado', 'supermercado', 'mercearia', 'mercadinho']),
  ('Advogados',            'advogados',            ARRAY['advogado', 'escritório de advocacia', 'advocacia', 'jurídico']),
  ('Auto Peças',           'auto-pecas',           ARRAY['auto peças', 'autopeças', 'peças automotivas', 'peças de carro']),
  ('Barbearias',           'barbearias',           ARRAY['barbearia', 'barbeiro', 'corte masculino']),
  ('Salões Beleza',        'saloes-beleza',        ARRAY['salão de beleza', 'cabeleireiro', 'estética', 'salão']),
  ('Clínicas',             'clinicas',             ARRAY['clínica médica', 'clínica', 'ambulatório', 'consultório médico']),
  ('Pet Shop',             'pet-shop',             ARRAY['pet shop', 'veterinária', 'petshop', 'loja de animais']),
  ('Contabilidade',        'contabilidade',        ARRAY['contabilidade', 'contador', 'escritório contábil', 'contábil']),
  ('Imobiliárias',         'imobiliarias',         ARRAY['imobiliária', 'imóveis', 'corretor de imóveis', 'venda de imóveis']),
  ('Mecânicas',            'mecanicas',            ARRAY['mecânica', 'oficina mecânica', 'auto center', 'funilaria']),
  ('Papelarias',           'papelarias',           ARRAY['papelaria', 'artigos de escritório', 'papelaria e presentes']),
  ('Farmácias',            'farmacias',            ARRAY['farmácia', 'drogaria', 'farmácia de manipulação']),
  ('Padarias',             'padarias',             ARRAY['padaria', 'confeitaria', 'bakery', 'pão de forma']),
  ('Materiais Construção', 'materiais-construcao', ARRAY['materiais de construção', 'loja de construção', 'ferragem', 'depósito de materiais']),
  ('Lojas Roupa',          'lojas-roupa',          ARRAY['loja de roupa', 'vestuário', 'moda', 'boutique']),
  ('Decoração Infantil',   'decoracao-infantil',   ARRAY['decoração infantil', 'festa infantil', 'artigos infantis', 'brinquedos']),
  ('Móveis Planejados',    'moveis-planejados',    ARRAY['móveis planejados', 'marcenaria', 'móveis sob medida', 'marceneiro']),
  ('Metalúrgica',          'metalurgica',          ARRAY['metalúrgica', 'metalurgia', 'usinagem', 'caldeiraria', 'CNC', 'serralheria']),
  ('Indústria Plástica',   'industria-plastica',   ARRAY['indústria plástica', 'plástico', 'moldagem plástica', 'injeção plástica'])
) as s(name, slug, terms)
where not exists (
  select 1 from public.lead_categories where name = s.name
);

-- Adiciona unique constraint em slug após garantir que todas as linhas têm slug
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'lead_categories_slug_key'
      and conrelid = 'public.lead_categories'::regclass
  ) then
    alter table public.lead_categories
      add constraint lead_categories_slug_key unique (slug);
  end if;
end $$;


-- ============================================================
-- 5. GLOBAL_LEADS — banco global de empresas
-- ============================================================

create table if not exists public.global_leads (
  id                   uuid        primary key default gen_random_uuid(),
  company_name         text        not null,
  email                text,
  website              text,
  phone                text,
  city                 text,
  state                text,
  category_id          uuid        references public.lead_categories(id) on delete set null,
  confidence_score     integer     not null default 0,
  provider_source      text,
  provider_external_id text,
  status               text        not null default 'active',
  review_required      boolean     not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.global_leads enable row level security;

drop policy if exists "global_leads_select_auth" on public.global_leads;
create policy "global_leads_select_auth"
  on public.global_leads for select
  to authenticated
  using (status = 'active');

drop policy if exists "global_leads_insert_admin" on public.global_leads;
create policy "global_leads_insert_admin"
  on public.global_leads for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "global_leads_update_admin" on public.global_leads;
create policy "global_leads_update_admin"
  on public.global_leads for update
  to authenticated
  using (public.is_admin());

create index if not exists global_leads_category_id_idx       on public.global_leads (category_id);
create index if not exists global_leads_status_idx            on public.global_leads (status);
create index if not exists global_leads_provider_source_idx   on public.global_leads (provider_source);
create index if not exists global_leads_provider_external_idx on public.global_leads (provider_external_id)
  where provider_external_id is not null;


-- ============================================================
-- 6. USER_LEADS — vínculo usuário ↔ lead global
-- ============================================================

create table if not exists public.user_leads (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  global_lead_id uuid        not null references public.global_leads(id) on delete cascade,
  status         text        not null default 'novo',
  hidden         boolean     not null default false,
  notes          text,
  last_contacted timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  unique (user_id, global_lead_id)
);

alter table public.user_leads enable row level security;

drop policy if exists "user_leads_select_own" on public.user_leads;
create policy "user_leads_select_own"
  on public.user_leads for select
  using (auth.uid() = user_id);

drop policy if exists "user_leads_insert_own" on public.user_leads;
create policy "user_leads_insert_own"
  on public.user_leads for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_leads_update_own" on public.user_leads;
create policy "user_leads_update_own"
  on public.user_leads for update
  using (auth.uid() = user_id);

drop policy if exists "user_leads_delete_own" on public.user_leads;
create policy "user_leads_delete_own"
  on public.user_leads for delete
  using (auth.uid() = user_id);

create index if not exists user_leads_user_id_idx        on public.user_leads (user_id);
create index if not exists user_leads_global_lead_id_idx on public.user_leads (global_lead_id);
create index if not exists user_leads_user_status_idx    on public.user_leads (user_id, status);
create index if not exists user_leads_hidden_idx         on public.user_leads (user_id, hidden)
  where hidden = false;
