begin;
do $$ begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='bank_capture_messages' and column_name='message_text')
    or to_regprocedure('public.ingest_bank_capture(text,text,text,timestamp with time zone,integer)') is not null then
    raise exception 'Older full-text capture exists. Stop and review migration; do not enable it.';
  end if;
end $$;
-- Future-message capture only. Does not read or update financial transactions.
create table if not exists public.bank_capture_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  source_id text not null,
  source_label text not null,
  name text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days',
  revoked_at timestamptz,
  quota_day date not null default current_date,
  quota_used integer not null default 0
);
create table if not exists public.bank_capture_messages (
  sequence bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references public.bank_capture_devices(id),
  capture_id text not null,
  source_id text not null,
  source_label text not null,
  amount_minor bigint not null check(amount_minor>0 and amount_minor<=1000000000000),
  transaction_date date,
  direction text not null check(direction in ('debit','credit')),
  captured_at timestamptz not null,
  received_at timestamptz not null default now(),
  unique(user_id,capture_id)
);
create index if not exists bank_capture_user_sequence on public.bank_capture_messages(user_id,sequence);
alter table public.bank_capture_devices enable row level security;
alter table public.bank_capture_messages enable row level security;
revoke all on public.bank_capture_devices, public.bank_capture_messages from anon,authenticated;
revoke all on sequence public.bank_capture_messages_sequence_seq from anon,authenticated;

create or replace function public.pair_bank_capture_device(p_token text,p_source_id text,p_source_label text,p_name text)
returns table(id uuid,source_id text,source_label text,name text,expires_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if p_token is null or p_token !~ '^cap_[0-9a-f]{64}$' then raise exception 'Invalid capture key'; end if;
  if p_source_id is null or p_source_id !~ '^[-A-Za-z0-9_]{1,128}$' or nullif(btrim(p_source_label),'') is null
    or length(p_source_label)>500 or nullif(btrim(p_name),'') is null or length(p_name)>200 then raise exception 'Select an account and device name'; end if;
  if (select count(*) from public.bank_capture_devices d where d.user_id=auth.uid() and d.revoked_at is null and d.expires_at>now())>=32 then raise exception 'Revoke an unused capture key first'; end if;
  return query insert into public.bank_capture_devices as d(user_id,token_hash,source_id,source_label,name)
    values(auth.uid(),encode(sha256(convert_to(p_token,'UTF8')),'hex'),p_source_id,btrim(p_source_label),btrim(p_name))
    returning d.id,d.source_id,d.source_label,d.name,d.expires_at;
end; $$;

create or replace function public.list_bank_capture_devices()
returns table(id uuid,source_id text,source_label text,name text,expires_at timestamptz,revoked_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  return query select d.id,d.source_id,d.source_label,d.name,d.expires_at,d.revoked_at
    from public.bank_capture_devices d where d.user_id=auth.uid() order by d.created_at;
end; $$;

create or replace function public.revoke_bank_capture_device(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  update public.bank_capture_devices d set revoked_at=now() where d.id=p_id and d.user_id=auth.uid();
end; $$;

create or replace function public.ingest_bank_capture(p_token text,p_capture_id text,p_amount_minor bigint,p_direction text,p_transaction_date text,p_captured_at timestamptz,p_version integer default 2)
returns jsonb language plpgsql security definer set search_path='' as $$
declare device public.bank_capture_devices%rowtype; old_message public.bank_capture_messages%rowtype; bank_date date;
begin
  if p_token is null or p_token !~ '^cap_[0-9a-f]{64}$' then raise exception 'Capture key is invalid or expired'; end if;
  select * into device from public.bank_capture_devices d where d.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
  if not found or device.revoked_at is not null or device.expires_at<=now() then raise exception 'Capture key is invalid or expired'; end if;
  if p_version is distinct from 2 or p_capture_id is null or p_capture_id !~ '^[-A-Za-z0-9_.:+|]{1,128}$'
    or p_amount_minor is null or p_amount_minor<=0 or p_amount_minor>1000000000000 or p_direction is null or p_direction not in ('debit','credit')
    or p_transaction_date is null or p_captured_at is null
    or p_captured_at>now()+interval '1 day' or p_captured_at<now()-interval '90 days' then raise exception 'Invalid capture payload'; end if;
  if p_transaction_date<>'' then
    if p_transaction_date !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid transaction date'; end if;
    bank_date:=p_transaction_date::date;
    if to_char(bank_date,'YYYY-MM-DD')<>p_transaction_date then raise exception 'Invalid transaction date'; end if;
  end if;
  select * into old_message from public.bank_capture_messages m where m.user_id=device.user_id and m.capture_id=p_capture_id;
  if found then
    if old_message.device_id<>device.id or old_message.amount_minor<>p_amount_minor or old_message.direction<>p_direction or old_message.transaction_date is distinct from bank_date or old_message.captured_at<>p_captured_at then raise exception 'Capture ID was already used for another message'; end if;
    return jsonb_build_object('accepted',true,'captureId',p_capture_id);
  end if;
  if device.quota_day=current_date and device.quota_used>=500 then raise exception 'Daily capture limit reached'; end if;
  insert into public.bank_capture_messages(user_id,device_id,capture_id,source_id,source_label,amount_minor,transaction_date,direction,captured_at)
    values(device.user_id,device.id,p_capture_id,device.source_id,device.source_label,p_amount_minor,bank_date,p_direction,p_captured_at);
  update public.bank_capture_devices d set quota_day=current_date,
    quota_used=case when device.quota_day=current_date then device.quota_used+1 else 1 end where d.id=device.id;
  return jsonb_build_object('accepted',true,'captureId',p_capture_id);
end; $$;

create or replace function public.read_bank_captures(p_after bigint default 0)
returns table(sequence bigint,source_id text,source_label text,amount_minor bigint,transaction_date date,direction text,captured_at timestamptz,received_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  return query select m.sequence,m.source_id,m.source_label,m.amount_minor,m.transaction_date,m.direction,m.captured_at,m.received_at
    from public.bank_capture_messages m where m.user_id=auth.uid() and m.sequence>greatest(p_after,0)
    order by m.sequence limit 100;
end; $$;

revoke all on function public.pair_bank_capture_device(text,text,text,text) from public,anon;
revoke all on function public.list_bank_capture_devices() from public,anon;
revoke all on function public.revoke_bank_capture_device(uuid) from public,anon;
revoke all on function public.read_bank_captures(bigint) from public,anon;
revoke all on function public.ingest_bank_capture(text,text,bigint,text,text,timestamptz,integer) from public;
grant execute on function public.pair_bank_capture_device(text,text,text,text), public.list_bank_capture_devices(),
  public.revoke_bank_capture_device(uuid), public.read_bank_captures(bigint) to authenticated;
grant execute on function public.ingest_bank_capture(text,text,bigint,text,text,timestamptz,integer) to anon,authenticated;
notify pgrst, 'reload schema';


commit;
