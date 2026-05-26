-- ============================================================
-- Tabela cities — catálogo de cidades para autocomplete no Search
-- ============================================================

create table if not exists public.cities (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  state       text        not null,
  state_code  text        not null,
  search_text text        not null,
  created_at  timestamptz not null default now()
);

alter table public.cities enable row level security;

drop policy if exists "cities_select_auth" on public.cities;
create policy "cities_select_auth"
  on public.cities for select
  to authenticated
  using (true);

create index if not exists cities_search_text_idx on public.cities (search_text);
create index if not exists cities_name_idx         on public.cities (name);
create index if not exists cities_state_code_idx   on public.cities (state_code);


-- ============================================================
-- Seed — cidades principais
-- ============================================================

insert into public.cities (name, state, state_code, search_text) values
  ('São Paulo',       'São Paulo',       'SP', 'sao paulo'),
  ('Campinas',        'São Paulo',       'SP', 'campinas'),
  ('Sorocaba',        'São Paulo',       'SP', 'sorocaba'),
  ('Ribeirão Preto',  'São Paulo',       'SP', 'ribeirao preto'),
  ('Rio de Janeiro',  'Rio de Janeiro',  'RJ', 'rio de janeiro'),
  ('Belo Horizonte',  'Minas Gerais',    'MG', 'belo horizonte'),
  ('Curitiba',        'Paraná',          'PR', 'curitiba'),
  ('Porto Alegre',    'Rio Grande do Sul','RS','porto alegre'),
  ('Caxias do Sul',   'Rio Grande do Sul','RS','caxias do sul'),
  ('Joinville',       'Santa Catarina',  'SC', 'joinville'),
  ('Florianópolis',   'Santa Catarina',  'SC', 'florianopolis'),
  ('Blumenau',        'Santa Catarina',  'SC', 'blumenau'),
  ('Chapecó',         'Santa Catarina',  'SC', 'chapeco'),
  ('Canoas',          'Rio Grande do Sul','RS','canoas'),
  ('Novo Hamburgo',   'Rio Grande do Sul','RS','novo hamburgo'),
  ('Gravataí',        'Rio Grande do Sul','RS','gravatai'),
  ('Pelotas',         'Rio Grande do Sul','RS','pelotas'),
  ('Passo Fundo',     'Rio Grande do Sul','RS','passo fundo'),
  ('Londrina',        'Paraná',          'PR', 'londrina'),
  ('Maringá',         'Paraná',          'PR', 'maringa')
on conflict do nothing;
