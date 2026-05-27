-- ============================================================
-- Lead Quality Status — global_leads enrichment pipeline
-- ============================================================

alter table public.global_leads
  add column if not exists lead_quality_status text not null default 'manual_review';

-- Backfill existing rows with computed quality status
update public.global_leads set lead_quality_status =
  case
    when email is not null and trim(email) != '' then 'email_found'
    when website is not null and trim(website) != '' then 'website_only'
    else 'manual_review'
  end
where lead_quality_status = 'manual_review';

create index if not exists global_leads_quality_status_idx
  on public.global_leads (lead_quality_status);
