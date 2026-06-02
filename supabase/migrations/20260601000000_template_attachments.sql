-- Create template_attachments table
create table if not exists template_attachments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  template_id uuid not null references templates(id) on delete cascade,
  file_name   text not null,
  file_path   text not null,
  file_type   text not null,
  file_size   int not null,
  created_at  timestamptz not null default now()
);

alter table template_attachments enable row level security;

create policy "template_attachments_user_all"
  on template_attachments
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index template_attachments_template_id_idx on template_attachments (template_id);
create index template_attachments_user_id_idx on template_attachments (user_id);

-- Ensure template-attachments storage bucket exists (private)
insert into storage.buckets (id, name, public)
values ('template-attachments', 'template-attachments', false)
on conflict (id) do nothing;

-- Storage policies: users access only their own folder ({user_id}/...)
create policy "template_attachments_storage_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'template-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "template_attachments_storage_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'template-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "template_attachments_storage_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'template-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
