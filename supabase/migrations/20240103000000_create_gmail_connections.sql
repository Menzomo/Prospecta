create table public.gmail_connections (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id) on delete cascade,
  gmail_email         text        not null,
  provider_account_id text,
  access_token        text        not null,
  refresh_token       text,
  expires_at          timestamptz,
  scope               text,
  is_connected        boolean     not null default true,
  connected_at        timestamptz not null default now(),
  disconnected_at     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint gmail_connections_user_id_key unique (user_id)
);

alter table public.gmail_connections enable row level security;

create policy "gmail_connections_select_own"
  on public.gmail_connections for select
  using (auth.uid() = user_id);

create policy "gmail_connections_insert_own"
  on public.gmail_connections for insert
  with check (auth.uid() = user_id);

create policy "gmail_connections_update_own"
  on public.gmail_connections for update
  using (auth.uid() = user_id);

create policy "gmail_connections_delete_own"
  on public.gmail_connections for delete
  using (auth.uid() = user_id);

create index gmail_connections_user_id_idx
  on public.gmail_connections (user_id);
