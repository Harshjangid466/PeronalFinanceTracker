-- Run only in the synthetic test project after the sync migration.
-- All fixture writes are rolled back, including on assertion failure.
begin;
do $$
declare
 test_user uuid;
 result jsonb;
 doc jsonb := '{"format":1,"data":{"schemaVersion":4,"transactions":[]}}';
 relation text;
 role_name text;
begin
 select id into test_user from auth.users order by created_at limit 1;
 if test_user is null then raise exception 'A synthetic auth user is required'; end if;
 if exists(select 1 from public.finance_sync_documents where user_id=test_user) then
   raise exception 'Test requires an empty cloud ledger; existing data will not be touched';
 end if;
 foreach relation in array array['finance_sync_accounts','finance_sync_documents','finance_sync_backups'] loop
   if not (select relrowsecurity from pg_class where oid=('public.'||relation)::regclass) then raise exception 'RLS disabled: %',relation; end if;
   foreach role_name in array array['anon','authenticated'] loop
     if has_table_privilege(role_name,'public.'||relation,'SELECT,INSERT,UPDATE,DELETE') then raise exception 'Unexpected browser privilege: % %',role_name,relation; end if;
   end loop;
 end loop;
 foreach role_name in array array['anon','authenticated'] loop
   if has_function_privilege(role_name,'public.finance_sync_commit(uuid,bigint,jsonb,boolean)','EXECUTE') then raise exception 'Browser RPC allowed'; end if;
 end loop;
 if not has_function_privilege('service_role','public.finance_sync_commit(uuid,bigint,jsonb,boolean)','EXECUTE') then raise exception 'Backend RPC denied'; end if;
 result := public.finance_sync_commit(test_user,0,doc,false);
 if result->>'revision'<>'1' or result->>'backupWarning' is not null then raise exception 'Initial commit failed: %',result; end if;
 result := public.finance_sync_commit(test_user,0,doc,false);
 if result->>'conflict'<>'true' or result->>'revision'<>'1' then raise exception 'Stale revision not rejected'; end if;
 result := public.finance_sync_commit(test_user,1,jsonb_set(doc,'{testMarker}','"second"'),false);
 if result->>'revision'<>'2' then raise exception 'Second commit failed'; end if;
 if (select count(*) from public.finance_sync_backups where user_id=test_user)<>1 then raise exception 'Daily snapshot duplicated'; end if;
 if (select revision from public.finance_sync_backups where user_id=test_user)<>1 then raise exception 'First daily snapshot overwritten'; end if;
 insert into public.finance_sync_backups(user_id,backup_key,revision,document)
 select test_user,to_char((now() at time zone 'UTC')::date-n,'YYYY-MM-DD'),1,doc from generate_series(1,8) n;
 result := public.finance_sync_commit(test_user,2,doc,true);
 if result->>'revision'<>'3' or result->>'backupWarning' is not null then raise exception 'Restore failed'; end if;
 if (select count(*) from public.finance_sync_backups where user_id=test_user and backup_key<>'pre-restore')<>7 then raise exception 'Daily retention failed'; end if;
 if not exists(select 1 from public.finance_sync_backups where user_id=test_user and backup_key='pre-restore' and revision=2 and document->>'testMarker'='second') then raise exception 'Pre-restore state missing'; end if;
 if exists(select 1 from public.finance_sync_backups where user_id=test_user and backup_key=to_char((now() at time zone 'UTC')::date-8,'YYYY-MM-DD')) then raise exception 'Old backup retained'; end if;
end $$;
rollback;
select 'PASS: RLS, browser grants, backend RPC, stale revisions, daily first-copy, seven-day retention, pre-restore preservation; fixture writes rolled back' as result;
