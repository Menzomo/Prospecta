alter table public.profiles
  add column if not exists gmail_request_email    text,
  add column if not exists gmail_request_status   text not null default 'not_requested',
  add column if not exists gmail_requested_at     timestamptz;
