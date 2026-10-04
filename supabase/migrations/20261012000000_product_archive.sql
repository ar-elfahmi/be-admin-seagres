-- Recoverable archive: quantities, source receipts, documents and QR IDs are retained.
-- Apply after 20261011000000_server_only_access.sql. No reseed or deletion.
begin;
alter table public.products add column if not exists deleted_at timestamptz;

create or replace function public.set_product_archived(
  p_product_id text, p_actor_id text, p_archived boolean
) returns timestamptz language plpgsql security invoker set search_path = '' as $$
declare v_owner text; v_deleted timestamptz;
begin
  if p_archived is null then raise exception 'ARCHIVE_STATE_REQUIRED'; end if;
  select pengepul_id, deleted_at into v_owner, v_deleted
    from public.products where id = p_product_id for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  if v_owner is distinct from p_actor_id or not exists (
    select 1 from public.users where id = p_actor_id and account_type = 'pengepul'
  ) then raise exception 'NOT_PRODUCT_OWNER'; end if;
  -- Repeated archive requests preserve the original archive date.
  v_deleted := case when p_archived then coalesce(v_deleted, now()) else null end;
  update public.products set deleted_at = v_deleted where id = p_product_id;
  return v_deleted;
end;
$$;
revoke all on function public.set_product_archived(text,text,boolean) from public, anon, authenticated;
grant execute on function public.set_product_archived(text,text,boolean) to service_role;

-- Parent locks serialize archive against receipts, stock and process history writes.
create or replace function public.require_active_product() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare v_deleted timestamptz;
begin
  select deleted_at into v_deleted from public.products where id = new.product_id for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  if v_deleted is not null then raise exception 'PRODUCT_ARCHIVED'; end if;
  return new;
end;
$$;
revoke all on function public.require_active_product() from public, anon, authenticated;
grant execute on function public.require_active_product() to service_role;
drop trigger if exists sub_products_require_active on public.sub_products;
create trigger sub_products_require_active before insert or update on public.sub_products
  for each row execute function public.require_active_product();
drop trigger if exists product_history_require_active on public.product_history;
create trigger product_history_require_active before insert on public.product_history
  for each row execute function public.require_active_product();

create or replace function public.record_stock_event(
  p_event_id text, p_product_id text, p_sub_product_id text,
  p_actor_id text, p_delta numeric, p_note text default null
) returns numeric language plpgsql security invoker set search_path = '' as $$
declare v_stock numeric; v_actor text; v_owner text; v_deleted timestamptz;
begin
  if p_delta is null or p_delta = 0 or abs(p_delta) > 99999999999.9 or p_delta <> round(p_delta, 1) then
    raise exception 'INVALID_QUANTITY';
  end if;
  -- Always parent before source: same lock order as create_product_receipts.
  select p.pengepul_id, p.deleted_at into v_owner, v_deleted
    from public.products p where p.id = p_product_id for update;
  select u.name into v_actor from public.users u where u.id = p_actor_id and u.account_type = 'pengepul';
  if v_actor is null or v_owner is distinct from p_actor_id then raise exception 'NOT_PRODUCT_OWNER'; end if;
  if v_deleted is not null then raise exception 'PRODUCT_ARCHIVED'; end if;
  select s.quantity into v_stock from public.sub_products s
    where s.id = p_sub_product_id and s.product_id = p_product_id for update;
  if v_stock is null then raise exception 'SOURCE_NOT_FOUND'; end if;
  if v_stock + p_delta < 0 then raise exception 'INSUFFICIENT_STOCK'; end if;
  update public.sub_products set quantity = v_stock + p_delta where id = p_sub_product_id;
  insert into public.product_history (id, product_id, sub_product_id, actor_id, actor, kind, stage, note, quantity_delta, created_at)
    values (p_event_id, p_product_id, p_sub_product_id, p_actor_id, v_actor,
      case when p_delta < 0 then 'jual' else 'terima_nelayan' end,
      case when p_delta < 0 then 'jual' else 'diambil_pengepul' end,
      p_note, p_delta, now());
  return v_stock + p_delta;
end;
$$;
revoke all on function public.record_stock_event(text,text,text,text,numeric,text) from public, anon, authenticated;
grant execute on function public.record_stock_event(text,text,text,text,numeric,text) to service_role;
notify pgrst, 'reload schema';
commit;
