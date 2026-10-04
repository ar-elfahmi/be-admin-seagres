-- Read-only checks. Run AFTER 20261011000000_server_only_access.sql in SQL Editor.
-- Raises an error instead of claiming success if an effective permission leaks.
begin read only;
do $$
declare
  v_table text;
  v_role text;
  v_permission text;
  v_function text;
begin
  foreach v_table in array array[
    'users', 'prices', 'lots', 'orders', 'reports', 'products',
    'sub_products', 'product_history', 'history_geo_points', 'history_documents', 'order_views'
  ] loop
    foreach v_role in array array['anon', 'authenticated'] loop
      foreach v_permission in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
        if pg_catalog.has_table_privilege(v_role, 'public.' || v_table, v_permission) then
          raise exception 'CLIENT_PERMISSION_LEAK: % on % for %', v_permission, v_table, v_role;
        end if;
      end loop;
      if pg_catalog.has_any_column_privilege(v_role, 'public.' || v_table, 'SELECT,INSERT,UPDATE,REFERENCES') then
        raise exception 'CLIENT_COLUMN_PERMISSION_LEAK: % for %', v_table, v_role;
      end if;
    end loop;
    if not pg_catalog.has_table_privilege('service_role', 'public.' || v_table, 'SELECT') then
      raise exception 'SERVER_READ_MISSING: %', v_table;
    end if;
    foreach v_permission in array case
      when v_table in ('users', 'lots', 'orders', 'sub_products') then array['INSERT', 'UPDATE']
      when v_table = 'products' then array['INSERT', 'UPDATE', 'DELETE']
      when v_table in ('reports', 'product_history', 'history_geo_points', 'history_documents') then array['INSERT']
      else array[]::text[]
    end loop
      if not pg_catalog.has_table_privilege('service_role', 'public.' || v_table, v_permission) then
        raise exception 'SERVER_WRITE_MISSING: % on %', v_permission, v_table;
      end if;
    end loop;
    if v_table <> 'order_views' then
      if not (select relrowsecurity from pg_catalog.pg_class where oid = ('public.' || v_table)::regclass) then
        raise exception 'RLS_MISSING: %', v_table;
      end if;
      if exists (select 1 from pg_catalog.pg_policies where schemaname = 'public' and tablename = v_table) then
        raise exception 'UNEXPECTED_CLIENT_POLICY: %', v_table;
      end if;
    end if;
  end loop;
  foreach v_function in array array[
    'public.reserve_lot_weight(text,numeric)', 'public.apply_accept_effects(text)',
    'public.record_stock_event(text,text,text,text,numeric,text)',
    'public.create_product_receipts(text,text,jsonb,jsonb)'
  ] loop
    foreach v_role in array array['anon', 'authenticated'] loop
      if pg_catalog.has_function_privilege(v_role, v_function, 'EXECUTE') then
        raise exception 'CLIENT_RPC_PERMISSION_LEAK: % for %', v_function, v_role;
      end if;
    end loop;
    if not pg_catalog.has_function_privilege('service_role', v_function, 'EXECUTE') then
      raise exception 'SERVER_RPC_MISSING: %', v_function;
    end if;
  end loop;
  if not exists (
    select 1 from pg_catalog.pg_class
    where oid = 'public.order_views'::regclass and reloptions @> array['security_invoker=true']
  ) then raise exception 'VIEW_SECURITY_INVOKER_MISSING'; end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role' and rolbypassrls) then
    raise exception 'SERVICE_ROLE_BYPASSRLS_MISSING';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_policy
    where polrelid = 'storage.objects'::regclass
      and polname = 'seagres_evidence_server_only' and not polpermissive and polcmd = '*'
      and polroles @> array[(select oid from pg_catalog.pg_roles where rolname = 'anon'),
                           (select oid from pg_catalog.pg_roles where rolname = 'authenticated')]
      and pg_catalog.pg_get_expr(polqual, polrelid) like '%lot-photos%'
      and pg_catalog.pg_get_expr(polwithcheck, polrelid) like '%lot-photos%'
  ) then raise exception 'EVIDENCE_STORAGE_GUARD_MISSING'; end if;
end;
$$;
select 'PASS: SeaGres direct client access is blocked; server reads and RPC permissions are present.' as result;
commit;
