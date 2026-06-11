alter table public.profiles
  add column if not exists oauth_notification_sent boolean not null default false;
