create table public.email_messages (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  lead_id          uuid        not null references public.leads(id) on delete cascade,
  thread_id        uuid        not null references public.email_threads(id) on delete cascade,
  template_id      uuid        references public.templates(id) on delete set null,
  subject          text        not null,
  body             text        not null,
  direction        text        not null default 'outbound',
  gmail_message_id text        not null,
  sent_at          timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

alter table public.email_messages enable row level security;

create policy "email_messages_select_own"
  on public.email_messages for select
  using (auth.uid() = user_id);

create policy "email_messages_insert_own"
  on public.email_messages for insert
  with check (auth.uid() = user_id);

create index email_messages_user_id_idx
  on public.email_messages (user_id);

create index email_messages_lead_id_idx
  on public.email_messages (lead_id);

create index email_messages_thread_id_idx
  on public.email_messages (thread_id);
