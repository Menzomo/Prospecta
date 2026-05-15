-- Listagem principal: leads visíveis por usuário (query mais frequente)
create index leads_user_id_is_hidden_idx
  on public.leads (user_id, is_hidden);

-- Deduplicação por email
create index leads_user_id_email_idx
  on public.leads (user_id, email)
  where email is not null;

-- Deduplicação por website
create index leads_user_id_website_idx
  on public.leads (user_id, website)
  where website is not null;

-- Lookup por status (filtros futuros)
create index leads_user_id_status_idx
  on public.leads (user_id, status);
