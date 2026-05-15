create table public.leads (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null references auth.users(id) on delete cascade,
  company_name       text        not null,
  contact_name       text,
  email              text,
  phone              text,
  website            text,
  city               text,
  source             text        not null default 'manual',
  status             text        not null default 'novo',
  notes              text,
  is_hidden          boolean     not null default false,
  hidden_at          timestamptz,
  last_contacted_at  timestamptz,
  last_reply_at      timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.leads enable row level security;

create policy "leads_select_own"
  on public.leads for select
  using (auth.uid() = user_id);

create policy "leads_insert_own"
  on public.leads for insert
  with check (auth.uid() = user_id);

create policy "leads_update_own"
  on public.leads for update
  using (auth.uid() = user_id);

create policy "leads_delete_own"
  on public.leads for delete
  using (auth.uid() = user_id);
