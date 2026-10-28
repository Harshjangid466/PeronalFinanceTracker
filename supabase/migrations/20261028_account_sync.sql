-- Apply manually after synthetic acceptance. Does not enable bank capture.
begin;
create table public.finance_sync_accounts(user_id uuid primary key, probe uuid not null default gen_random_uuid(), deleted boolean not null default false);
create table public.finance_sync_documents(user_id uuid primary key references auth.users(id) on delete cascade, revision bigint not null, document jsonb not null, updated_at timestamptz not null default now());
create table public.finance_sync_backups(user_id uuid references auth.users(id) on delete cascade, backup_key text not null, revision bigint not null, document jsonb not null, created_at timestamptz not null default now(), primary key(user_id,backup_key));
alter table public.finance_sync_accounts enable row level security;
alter table public.finance_sync_documents enable row level security;
alter table public.finance_sync_backups enable row level security;
revoke all on public.finance_sync_accounts,public.finance_sync_documents,public.finance_sync_backups from public,anon,authenticated;
grant all on public.finance_sync_accounts,public.finance_sync_documents,public.finance_sync_backups to service_role;
-- Defense in depth: no browser table access is granted; these policies also scope future read grants.
create policy owner_documents on public.finance_sync_documents for select to authenticated using(user_id=(select auth.uid()));
create policy owner_backups on public.finance_sync_backups for select to authenticated using(user_id=(select auth.uid()));
create function public.finance_sync_commit(p_user_id uuid,p_expected bigint,p_document jsonb,p_restore boolean default false) returns jsonb language plpgsql security invoker set search_path=public as $$
declare current_revision bigint; previous_document jsonb; next_revision bigint; warning text; day_key text;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 if exists(select 1 from public.finance_sync_accounts where user_id=p_user_id and deleted) then raise exception 'Account deleted'; end if;
 if p_expected<0 or p_document->>'format'<>'1' or p_document->'data'->>'schemaVersion'<>'4' or jsonb_typeof(p_document->'data'->'transactions')<>'array' or octet_length(p_document::text)>8000000 then raise exception 'Invalid document'; end if;
 select revision,document into current_revision,previous_document from public.finance_sync_documents where user_id=p_user_id;
 current_revision:=coalesce(current_revision,0);
 if current_revision<>p_expected then return jsonb_build_object('conflict',true,'revision',current_revision); end if;
 -- A restore cannot proceed unless the previous cloud state was preserved first.
 if p_restore and previous_document is not null then
   insert into public.finance_sync_backups(user_id,backup_key,revision,document) values(p_user_id,'pre-restore',current_revision,previous_document)
   on conflict(user_id,backup_key) do update set revision=excluded.revision,document=excluded.document,created_at=now();
 end if;
 next_revision:=current_revision+1;
 insert into public.finance_sync_documents(user_id,revision,document) values(p_user_id,next_revision,p_document)
 on conflict(user_id) do update set revision=excluded.revision,document=excluded.document,updated_at=now();
 begin
   day_key:=to_char(now() at time zone 'UTC','YYYY-MM-DD');
   insert into public.finance_sync_backups(user_id,backup_key,revision,document) values(p_user_id,day_key,next_revision,p_document) on conflict do nothing;
   if not exists(select 1 from public.finance_sync_backups where user_id=p_user_id and backup_key=day_key) then raise exception 'Backup not verified'; end if;
   delete from public.finance_sync_backups where user_id=p_user_id and backup_key<>'pre-restore' and backup_key not in (select backup_key from public.finance_sync_backups where user_id=p_user_id and backup_key<>'pre-restore' order by backup_key desc limit 7);
 exception when others then warning:='Cloud sync saved, but the daily recovery copy could not be saved. Retry Sync now.';
 end;
 return jsonb_build_object('revision',next_revision,'backupWarning',warning);
end $$;
revoke all on function public.finance_sync_commit(uuid,bigint,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.finance_sync_commit(uuid,bigint,jsonb,boolean) to service_role;
-- Invitation-only accounts are configured in Supabase Auth, not by this migration.
notify pgrst,'reload schema';
commit;
