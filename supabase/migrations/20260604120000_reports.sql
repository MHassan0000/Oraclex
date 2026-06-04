create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_type text not null check (source_type in ('current_chat', 'selected_documents', 'knowledge_base')),
  conversation_id uuid,
  document_ids uuid[] not null default '{}'::uuid[],
  formats text[] not null default '{}'::text[],
  status text not null default 'completed' check (status in ('completed', 'failed')),
  executive_summary text,
  content_markdown text not null,
  structured jsonb not null default '{}'::jsonb,
  source_citations jsonb not null default '[]'::jsonb,
  generation_time_ms integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  export_count integer not null default 0,
  last_generated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint reports_conversation_fk foreign key (conversation_id)
    references public.conversations(id) on delete set null
);

create table if not exists public.report_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  format text not null check (format in ('pdf', 'markdown', 'csv')),
  storage_path text not null,
  file_size integer not null default 0,
  download_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id, format),
  constraint report_exports_report_user_fk foreign key (report_id, user_id)
    references public.reports(id, user_id) on delete cascade
);

create trigger set_reports_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

create trigger set_report_exports_updated_at
before update on public.report_exports
for each row execute function public.set_updated_at();

create index if not exists reports_user_created_at_idx on public.reports (user_id, created_at desc);
create index if not exists reports_user_source_type_idx on public.reports (user_id, source_type);
create index if not exists report_exports_report_id_idx on public.report_exports (report_id);

alter table public.reports enable row level security;
alter table public.report_exports enable row level security;

create policy "reports_select" on public.reports
  for select using (auth.uid() = user_id);
create policy "reports_insert" on public.reports
  for insert with check (auth.uid() = user_id);
create policy "reports_update" on public.reports
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reports_delete" on public.reports
  for delete using (auth.uid() = user_id);

create policy "report_exports_select" on public.report_exports
  for select using (auth.uid() = user_id);
create policy "report_exports_insert" on public.report_exports
  for insert with check (auth.uid() = user_id);
create policy "report_exports_update" on public.report_exports
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "report_exports_delete" on public.report_exports
  for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reports',
  'reports',
  false,
  10485760,
  array['application/pdf', 'text/markdown', 'text/csv', 'text/plain']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "reports_storage_select" on storage.objects
  for select using (bucket_id = 'reports' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "reports_storage_insert" on storage.objects
  for insert with check (bucket_id = 'reports' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "reports_storage_update" on storage.objects
  for update using (bucket_id = 'reports' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'reports' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "reports_storage_delete" on storage.objects
  for delete using (bucket_id = 'reports' and auth.uid()::text = (storage.foldername(name))[1]);
