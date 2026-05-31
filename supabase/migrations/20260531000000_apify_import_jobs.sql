create table if not exists apify_import_jobs (
  id                       uuid primary key default gen_random_uuid(),
  created_by               uuid not null,
  category_id              uuid,
  category_name            text not null,
  city                     text not null,
  requested_limit          int not null,
  status                   text not null default 'pending',
  apify_run_id             text,
  apify_dataset_id         text,
  imported_count           int not null default 0,
  skipped_duplicate_count  int not null default 0,
  email_found_count        int not null default 0,
  website_only_count       int not null default 0,
  manual_review_count      int not null default 0,
  invalid_count            int not null default 0,
  error_message            text,
  payload                  jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  finished_at              timestamptz
);

alter table apify_import_jobs enable row level security;

create policy "apify_import_jobs_admin_all"
  on apify_import_jobs
  for all
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create index apify_import_jobs_created_by_idx on apify_import_jobs (created_by);
create index apify_import_jobs_status_idx on apify_import_jobs (status);
create index apify_import_jobs_created_at_idx on apify_import_jobs (created_at desc);
