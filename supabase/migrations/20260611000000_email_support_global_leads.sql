-- Allow email history to reference either a manual lead (leads) or a global lead (user_leads).
-- lead_id becomes nullable; user_lead_id is added for global leads.

ALTER TABLE public.email_threads
  ALTER COLUMN lead_id DROP NOT NULL,
  ADD COLUMN user_lead_id uuid references public.user_leads(id) on delete cascade;

ALTER TABLE public.email_messages
  ALTER COLUMN lead_id DROP NOT NULL,
  ADD COLUMN user_lead_id uuid references public.user_leads(id) on delete cascade;

create index email_threads_user_lead_id_idx on public.email_threads (user_lead_id);
create index email_messages_user_lead_id_idx on public.email_messages (user_lead_id);
