create extension if not exists "vector";
create extension if not exists "pgcrypto";

do $$
begin
  create type public.message_role as enum ('system', 'user', 'assistant', 'tool');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.message_status as enum ('draft', 'streaming', 'complete', 'error');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.document_status as enum ('processing', 'ready', 'failed', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.agent_run_status as enum ('queued', 'running', 'succeeded', 'failed', 'canceled');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text default 'system',
  rag jsonb not null default '{}'::jsonb,
  notifications jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text,
  last_message_at timestamptz,
  pinned boolean not null default false,
  archived boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  conversation_id uuid not null,
  role public.message_role not null,
  status public.message_status not null default 'complete',
  content text not null,
  model text,
  token_count integer,
  prompt_tokens integer,
  completion_tokens integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint messages_conversation_user_fk
    foreign key (conversation_id, user_id)
    references public.conversations (id, user_id)
    on delete cascade
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source text,
  file_name text,
  file_type text,
  status public.document_status not null default 'processing',
  token_count integer,
  checksum text,
  storage_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  document_id uuid not null,
  chunk_index integer not null,
  content text not null,
  token_count integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, chunk_index),
  unique (id, user_id),
  constraint document_chunks_document_user_fk
    foreign key (document_id, user_id)
    references public.documents (id, user_id)
    on delete cascade
);

create table if not exists public.embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  chunk_id uuid not null,
  embedding vector(1536) not null,
  model text not null,
  provider text,
  dimensions integer not null default 1536,
  content_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  constraint embeddings_chunk_user_fk
    foreign key (chunk_id, user_id)
    references public.document_chunks (id, user_id)
    on delete cascade
);

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  conversation_id uuid,
  message_id uuid,
  prompt_message_id uuid,
  model text,
  provider text,
  temperature numeric,
  max_tokens integer,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  constraint ai_generations_conversation_user_fk
    foreign key (conversation_id, user_id)
    references public.conversations (id, user_id)
    on delete cascade,
  constraint ai_generations_message_user_fk
    foreign key (message_id, user_id)
    references public.messages (id, user_id)
    on delete cascade,
  constraint ai_generations_prompt_message_user_fk
    foreign key (prompt_message_id, user_id)
    references public.messages (id, user_id)
    on delete set null
);

create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid,
  message_id uuid,
  generation_id uuid,
  event_type text not null,
  tokens integer,
  cost_usd numeric(10, 4),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint usage_logs_conversation_user_fk
    foreign key (conversation_id, user_id)
    references public.conversations (id, user_id)
    on delete set null,
  constraint usage_logs_message_user_fk
    foreign key (message_id, user_id)
    references public.messages (id, user_id)
    on delete set null,
  constraint usage_logs_generation_user_fk
    foreign key (generation_id, user_id)
    references public.ai_generations (id, user_id)
    on delete set null
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid,
  document_id uuid,
  status public.agent_run_status not null default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint agent_runs_conversation_user_fk
    foreign key (conversation_id, user_id)
    references public.conversations (id, user_id)
    on delete set null,
  constraint agent_runs_document_user_fk
    foreign key (document_id, user_id)
    references public.documents (id, user_id)
    on delete set null
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_settings_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

create trigger set_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create trigger set_messages_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

create trigger set_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create trigger set_document_chunks_updated_at
before update on public.document_chunks
for each row execute function public.set_updated_at();

create trigger set_agent_runs_updated_at
before update on public.agent_runs
for each row execute function public.set_updated_at();

create index if not exists profiles_user_id_idx on public.profiles (user_id);
create index if not exists settings_user_id_idx on public.settings (user_id);

create index if not exists conversations_user_id_idx on public.conversations (user_id);
create index if not exists conversations_user_last_message_idx
  on public.conversations (user_id, last_message_at desc nulls last);
create index if not exists conversations_user_pinned_idx
  on public.conversations (user_id, pinned) where pinned is true;
create index if not exists conversations_metadata_gin_idx
  on public.conversations using gin (metadata);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);
create index if not exists messages_user_created_idx
  on public.messages (user_id, created_at desc);
create index if not exists messages_metadata_gin_idx
  on public.messages using gin (metadata);

create index if not exists documents_user_status_idx
  on public.documents (user_id, status);
create index if not exists documents_user_updated_idx
  on public.documents (user_id, updated_at desc);
create index if not exists documents_metadata_gin_idx
  on public.documents using gin (metadata);

create index if not exists document_chunks_document_idx
  on public.document_chunks (document_id, chunk_index);
create index if not exists document_chunks_user_idx
  on public.document_chunks (user_id, created_at desc);
create index if not exists document_chunks_metadata_gin_idx
  on public.document_chunks using gin (metadata);

create index if not exists embeddings_user_idx on public.embeddings (user_id);
create index if not exists embeddings_chunk_idx on public.embeddings (chunk_id);
create index if not exists embeddings_metadata_gin_idx on public.embeddings using gin (metadata);
create index if not exists embeddings_vector_idx
  on public.embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_count int default 10,
  filter_document_id uuid default null,
  filter_metadata jsonb default null
)
returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id as chunk_id,
    c.document_id,
    c.content,
    c.metadata,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.embeddings e
  join public.document_chunks c on c.id = e.chunk_id
  where c.user_id = auth.uid()
    and (filter_document_id is null or c.document_id = filter_document_id)
    and (filter_metadata is null or c.metadata @> filter_metadata)
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

create index if not exists ai_generations_user_created_idx
  on public.ai_generations (user_id, created_at desc);
create index if not exists ai_generations_conversation_idx
  on public.ai_generations (conversation_id, created_at desc);
create index if not exists ai_generations_metadata_gin_idx
  on public.ai_generations using gin (metadata);

create index if not exists usage_logs_user_created_idx
  on public.usage_logs (user_id, created_at desc);
create index if not exists usage_logs_event_type_idx
  on public.usage_logs (event_type, created_at desc);
create index if not exists usage_logs_metadata_gin_idx
  on public.usage_logs using gin (metadata);

create index if not exists agent_runs_user_status_idx
  on public.agent_runs (user_id, status, created_at desc);
create index if not exists agent_runs_metadata_gin_idx
  on public.agent_runs using gin (metadata);


alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.embeddings enable row level security;
alter table public.ai_generations enable row level security;
alter table public.usage_logs enable row level security;
alter table public.agent_runs enable row level security;

create policy "profiles_select" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles_delete" on public.profiles
  for delete using (auth.uid() = user_id);

create policy "settings_select" on public.settings
  for select using (auth.uid() = user_id);
create policy "settings_insert" on public.settings
  for insert with check (auth.uid() = user_id);
create policy "settings_update" on public.settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "settings_delete" on public.settings
  for delete using (auth.uid() = user_id);

create policy "conversations_select" on public.conversations
  for select using (auth.uid() = user_id);
create policy "conversations_insert" on public.conversations
  for insert with check (auth.uid() = user_id);
create policy "conversations_update" on public.conversations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "conversations_delete" on public.conversations
  for delete using (auth.uid() = user_id);

create policy "messages_select" on public.messages
  for select using (auth.uid() = user_id);
create policy "messages_insert" on public.messages
  for insert with check (auth.uid() = user_id);
create policy "messages_update" on public.messages
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "messages_delete" on public.messages
  for delete using (auth.uid() = user_id);

create policy "documents_select" on public.documents
  for select using (auth.uid() = user_id);
create policy "documents_insert" on public.documents
  for insert with check (auth.uid() = user_id);
create policy "documents_update" on public.documents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "documents_delete" on public.documents
  for delete using (auth.uid() = user_id);

create policy "document_chunks_select" on public.document_chunks
  for select using (auth.uid() = user_id);
create policy "document_chunks_insert" on public.document_chunks
  for insert with check (auth.uid() = user_id);
create policy "document_chunks_update" on public.document_chunks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "document_chunks_delete" on public.document_chunks
  for delete using (auth.uid() = user_id);

create policy "embeddings_select" on public.embeddings
  for select using (auth.uid() = user_id);
create policy "embeddings_insert" on public.embeddings
  for insert with check (auth.uid() = user_id);
create policy "embeddings_update" on public.embeddings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "embeddings_delete" on public.embeddings
  for delete using (auth.uid() = user_id);

create policy "ai_generations_select" on public.ai_generations
  for select using (auth.uid() = user_id);
create policy "ai_generations_insert" on public.ai_generations
  for insert with check (auth.uid() = user_id);
create policy "ai_generations_update" on public.ai_generations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_generations_delete" on public.ai_generations
  for delete using (auth.uid() = user_id);

create policy "usage_logs_select" on public.usage_logs
  for select using (auth.uid() = user_id);
create policy "usage_logs_insert" on public.usage_logs
  for insert with check (auth.uid() = user_id);
create policy "usage_logs_update" on public.usage_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "usage_logs_delete" on public.usage_logs
  for delete using (auth.uid() = user_id);

create policy "agent_runs_select" on public.agent_runs
  for select using (auth.uid() = user_id);
create policy "agent_runs_insert" on public.agent_runs
  for insert with check (auth.uid() = user_id);
create policy "agent_runs_update" on public.agent_runs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "agent_runs_delete" on public.agent_runs
  for delete using (auth.uid() = user_id);
