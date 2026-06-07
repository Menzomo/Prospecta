alter table public.followups
  add column type             text                                                     not null default 'manual',
  add column email_message_id uuid references public.email_messages(id) on delete set null;

comment on column public.followups.type is 'manual | no_reply';
comment on column public.followups.email_message_id is 'email que originou o acompanhamento no_reply';
