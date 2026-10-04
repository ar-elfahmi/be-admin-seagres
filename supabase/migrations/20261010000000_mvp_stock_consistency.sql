-- Non-destructive: no demo reseed or changes to existing quantities/history.
-- Custom app sessions are authorized on the server; this RPC is service-role only.
begin;
create or replace function public.record_stock_event(
  p_event_id text, p_product_id text, p_sub_product_id text,
  p_actor_id text, p_delta numeric, p_note text default null
) returns numeric language plpgsql security invoker set search_path = '' as $$
declare
  v_stock numeric; v_actor text; v_owner text;
begin
  if p_delta is null or p_delta = 0 or abs(p_delta) > 99999999999.9 or p_delta <> round(p_delta, 1) then
    raise exception 'INVALID_QUANTITY';
  end if;
  select p.pengepul_id into v_owner from public.products p where p.id = p_product_id;
  select u.name into v_actor from public.users u where u.id = p_actor_id and u.account_type = 'pengepul';
  if v_actor is null or v_owner is distinct from p_actor_id then raise exception 'NOT_PRODUCT_OWNER'; end if;
  -- Serialize concurrent sales and reject overselling rather than clamping to zero.
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

create or replace function public.create_product_receipts(
  p_actor_id text, p_product_id text, p_product jsonb, p_receipts jsonb
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_actor text; v_owner text; v_receipt jsonb; v_lat double precision; v_lng double precision; v_qty numeric;
begin
  select name into v_actor from public.users where id = p_actor_id and account_type = 'pengepul';
  if v_actor is null then raise exception 'NOT_COLLECTOR'; end if;
  if p_receipts is null or jsonb_typeof(p_receipts) <> 'array' or jsonb_array_length(p_receipts) < 1 then
    raise exception 'RECEIPTS_REQUIRED';
  end if;
  if p_product is not null then
    if p_product->>'pengepul_id' is distinct from p_actor_id or p_product->>'id' is distinct from p_product_id then
      raise exception 'NOT_PRODUCT_OWNER';
    end if;
    insert into public.products (id,name,type,price,coret,size,image,promo,pengepul_id,organization,location,barcode,created_at)
      select r.id,r.name,r.type,r.price,r.coret,r.size,r.image,r.promo,r.pengepul_id,r.organization,r.location,r.barcode,now()
      from jsonb_populate_record(null::public.products, p_product) r;
  end if;
  select pengepul_id into v_owner from public.products where id = p_product_id for update;
  if v_owner is distinct from p_actor_id then raise exception 'NOT_PRODUCT_OWNER'; end if;
  for v_receipt in select value from jsonb_array_elements(p_receipts) loop
    v_qty := (v_receipt->>'quantity')::numeric;
    v_lat := (v_receipt->>'geo_lat')::double precision;
    v_lng := (v_receipt->>'geo_lng')::double precision;
    if v_qty is null or v_qty < 0 or v_qty <> round(v_qty,1) then raise exception 'INVALID_QUANTITY'; end if;
    if (v_lat is null) <> (v_lng is null) or abs(v_lat) > 90 or abs(v_lng) > 180 then raise exception 'INVALID_LOCATION'; end if;
    if coalesce((v_receipt->>'price')::numeric,0) < 1000 or coalesce((v_receipt->>'min_order_kg')::numeric,0) <= 0 then
      raise exception 'INVALID_PRICE_OR_MINIMUM';
    end if;
    if nullif(btrim(v_receipt->>'fisherman_name'),'') is null then raise exception 'FISHERMAN_REQUIRED'; end if;
    insert into public.sub_products (id,product_id,name,fisherman_name,quantity,unit,geo_lat,geo_lng,price,min_order_kg,grade,quality,barcode,created_at)
      values (v_receipt->>'id',p_product_id,v_receipt->>'name',v_receipt->>'fisherman_name',v_qty,'kg',v_lat,v_lng,
        (v_receipt->>'price')::numeric,(v_receipt->>'min_order_kg')::numeric,v_receipt->>'grade',v_receipt->'quality',v_receipt->>'barcode',now());
    insert into public.product_history (id,product_id,sub_product_id,actor_id,actor,kind,stage,note,quantity_delta,created_at)
      values (v_receipt->>'history_id',p_product_id,v_receipt->>'id',p_actor_id,v_actor,'terima_nelayan','diambil_pengepul',v_receipt->>'note',v_qty,now());
    if v_lat is not null then
      insert into public.history_geo_points (id,history_id,lat,lng,label,created_at)
        values ('GEO-' || (v_receipt->>'history_id'),v_receipt->>'history_id',v_lat,v_lng,'Lokasi penerimaan ' || (v_receipt->>'fisherman_name'),now());
    end if;
  end loop;
end;
$$;
revoke all on function public.create_product_receipts(text,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.create_product_receipts(text,text,jsonb,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
