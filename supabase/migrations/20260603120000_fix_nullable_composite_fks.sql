alter table public.usage_logs
  drop constraint if exists usage_logs_conversation_user_fk,
  add constraint usage_logs_conversation_user_fk
    foreign key (conversation_id, user_id)
    references public.conversations (id, user_id)
    on delete set null (conversation_id);

alter table public.usage_logs
  drop constraint if exists usage_logs_message_user_fk,
  add constraint usage_logs_message_user_fk
    foreign key (message_id, user_id)
    references public.messages (id, user_id)
    on delete set null (message_id);

alter table public.usage_logs
  drop constraint if exists usage_logs_generation_user_fk,
  add constraint usage_logs_generation_user_fk
    foreign key (generation_id, user_id)
    references public.ai_generations (id, user_id)
    on delete set null (generation_id);

alter table public.ai_generations
  drop constraint if exists ai_generations_prompt_message_user_fk,
  add constraint ai_generations_prompt_message_user_fk
    foreign key (prompt_message_id, user_id)
    references public.messages (id, user_id)
    on delete set null (prompt_message_id);

alter table public.agent_runs
  drop constraint if exists agent_runs_conversation_user_fk,
  add constraint agent_runs_conversation_user_fk
    foreign key (conversation_id, user_id)
    references public.conversations (id, user_id)
    on delete set null (conversation_id);

alter table public.agent_runs
  drop constraint if exists agent_runs_document_user_fk,
  add constraint agent_runs_document_user_fk
    foreign key (document_id, user_id)
    references public.documents (id, user_id)
    on delete set null (document_id);
