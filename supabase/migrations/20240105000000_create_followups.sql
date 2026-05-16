create table public.followups (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  lead_id     uuid        not null references public.leads(id) on delete cascade,
  title       text        not null,
  notes       text,
  due_at      timestamptz not null,
  status      text        not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.followups enable row level security;

create policy "followups_select_own"
  on public.followups for select
  using (auth.uid() = user_id);

create policy "followups_insert_own"
  on public.followups for insert
  with check (auth.uid() = user_id);

create policy "followups_update_own"
  on public.followups for update
  using (auth.uid() = user_id);

create index followups_user_id_idx on public.followups (user_id);
create index followups_lead_id_idx on public.followups (lead_id);
create index followups_due_at_idx  on public.followups (due_at);
