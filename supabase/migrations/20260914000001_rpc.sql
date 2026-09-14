-- SeaGres: fungsi RPC & bucket storage untuk aksi server.
-- reserve_lot_weight memotong stok dalam satu statement UPDATE:
-- row lock dari klausa `weight >= p_qty` mencegah oversell konkuren.

create or replace function public.reserve_lot_weight(p_lot_id text, p_qty numeric)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  update public.lots
  set weight = weight - p_qty
  where id = p_lot_id
    and weight >= p_qty;
  return found;
end;
$$;

-- apply_accept_effects dipanggil sekali saat order bertransisi ke "Diterima"
-- (guard ganda dilakukan pemanggil di app/actions.ts).

create or replace function public.apply_accept_effects(p_order_id text)
returns void
language plpgsql
set search_path = public
as $$
begin
  update public.lots
  set weight = greatest(0, weight - o.quantity),
      sold = sold + o.quantity
  from public.orders o
  where o.id = p_order_id
    and public.lots.id = o.lot_id;
end;
$$;

-- Bucket publik untuk foto lot yang diunggah createLot.

insert into storage.buckets (id, name, public)
values ('lot-photos', 'lot-photos', true)
on conflict (id) do nothing;
