create table public.email_threads (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  lead_id        uuid        not null references public.leads(id) on delete cascade,
  gmail_thread_id text       not null,
  subject        text        not null,
  last_reply_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.email_threads enable row level security;

create policy "email_threads_select_own"
  on public.email_threads for select
  using (auth.uid() = user_id);

create policy "email_threads_insert_own"
  on public.email_threads for insert
  with check (auth.uid() = user_id);

create policy "email_threads_update_own"
  on public.email_threads for update
  using (auth.uid() = user_id);

create index email_threads_user_id_idx
  on public.email_threads (user_id);

create index email_threads_lead_id_idx
  on public.email_threads (lead_id);
