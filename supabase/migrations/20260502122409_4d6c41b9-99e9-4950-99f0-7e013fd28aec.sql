-- 1) Fix status logging triggers
CREATE OR REPLACE FUNCTION public.log_order_status_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.order_status_history(order_id, from_status, to_status, changed_by)
  VALUES (NEW.id, NULL, NEW.status, auth.uid());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history(order_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    IF NEW.status = 'confirmed' AND NEW.confirmed_at IS NULL THEN NEW.confirmed_at := now(); END IF;
    IF NEW.status = 'shipped'   AND NEW.shipped_at   IS NULL THEN NEW.shipped_at   := now(); END IF;
    IF NEW.status = 'delivered' AND NEW.delivered_at IS NULL THEN NEW.delivered_at := now(); END IF;
    IF NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL THEN NEW.cancelled_at := now(); END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_status_log     ON public.orders;
DROP TRIGGER IF EXISTS trg_order_status_history ON public.orders;

CREATE TRIGGER trg_order_status_log_insert
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_status_insert();

CREATE TRIGGER trg_order_status_log_update
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- 2) Fix create_confirmation_call: remove non-existent 'facebook' channel
CREATE OR REPLACE FUNCTION public.create_confirmation_call()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.channel IN ('web','whatsapp','instagram') AND NEW.status IN ('pending','awaiting_confirmation') THEN
    INSERT INTO public.confirmation_calls (order_id, status)
    VALUES (NEW.id, 'pending')
    ON CONFLICT (order_id) DO NOTHING;
    IF NEW.status = 'pending' THEN
      UPDATE public.orders SET status = 'awaiting_confirmation' WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Seed
DO $$
DECLARE
  v RECORD;
  default_loc UUID;
  supplier_depot UUID;
  cust1 UUID;
  cust2 UUID;
  variant_a UUID;
  variant_b UUID;
  ord1 UUID;
  ord2 UUID;
BEGIN
  SELECT id INTO default_loc FROM public.locations WHERE is_default = true AND active = true LIMIT 1;
  IF default_loc IS NULL THEN SELECT id INTO default_loc FROM public.locations WHERE active = true LIMIT 1; END IF;
  SELECT id INTO supplier_depot FROM public.depots WHERE type = 'supplier' AND status = 'active' LIMIT 1;
  IF supplier_depot IS NULL THEN SELECT id INTO supplier_depot FROM public.depots WHERE status = 'active' LIMIT 1; END IF;

  IF default_loc IS NOT NULL AND supplier_depot IS NOT NULL THEN
    FOR v IN SELECT id FROM public.product_variants WHERE active = true LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.inventory_movements
        WHERE variant_id = v.id AND location_id = default_loc AND reason = 'QA seed initial stock'
      ) THEN
        INSERT INTO public.inventory_movements (variant_id, location_id, type, quantity, reason, source_depot_id)
        VALUES (v.id, default_loc, 'in', 50, 'QA seed initial stock', supplier_depot);
      END IF;
    END LOOP;
    UPDATE public.inventory SET reorder_point = 60
    WHERE id IN (SELECT id FROM public.inventory ORDER BY updated_at LIMIT 2);
  END IF;

  INSERT INTO public.customers (full_name, phone, acquisition_channel, segment)
  SELECT 'Fatima Zahra', '+212600111222', 'whatsapp', 'new'
  WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE phone = '+212600111222');
  SELECT id INTO cust1 FROM public.customers WHERE phone = '+212600111222' LIMIT 1;

  INSERT INTO public.customers (full_name, phone, acquisition_channel, segment)
  SELECT 'Youssef El Amrani', '+212600333444', 'web', 'regular'
  WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE phone = '+212600333444');
  SELECT id INTO cust2 FROM public.customers WHERE phone = '+212600333444' LIMIT 1;

  SELECT id INTO variant_a FROM public.product_variants WHERE active = true ORDER BY created_at LIMIT 1;
  SELECT id INTO variant_b FROM public.product_variants WHERE active = true ORDER BY created_at OFFSET 1 LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE notes = 'QA seed order 1') THEN
    INSERT INTO public.orders (customer_id, channel, status, payment_method, subtotal, grand_total,
      shipping_full_name, shipping_phone, shipping_address_line1, shipping_city, notes)
    VALUES (cust1, 'web', 'pending', 'cod', 250, 280,
      'Fatima Zahra', '+212600111222', 'Rue Ibn Battuta 12', 'Casablanca', 'QA seed order 1')
    RETURNING id INTO ord1;
    IF variant_a IS NOT NULL THEN
      INSERT INTO public.order_items (order_id, variant_id, sku, product_name, quantity, unit_price, line_total)
      SELECT ord1, variant_a, pv.sku, COALESCE(pt.name, pv.sku), 2, 125, 250
      FROM public.product_variants pv
      LEFT JOIN public.product_translations pt ON pt.product_id = pv.product_id AND pt.locale = 'fr'
      WHERE pv.id = variant_a;
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE notes = 'QA seed order 2') THEN
    INSERT INTO public.orders (customer_id, channel, status, payment_method, payment_status,
      subtotal, grand_total, shipping_full_name, shipping_phone, shipping_city, notes,
      placed_at, confirmed_at, delivered_at)
    VALUES (cust2, 'walk_in', 'delivered', 'cash', 'paid',
      180, 180, 'Youssef El Amrani', '+212600333444', 'Rabat', 'QA seed order 2',
      now() - interval '2 days', now() - interval '2 days', now() - interval '1 day')
    RETURNING id INTO ord2;
    IF variant_b IS NOT NULL THEN
      INSERT INTO public.order_items (order_id, variant_id, sku, product_name, quantity, unit_price, line_total)
      SELECT ord2, variant_b, pv.sku, COALESCE(pt.name, pv.sku), 1, 180, 180
      FROM public.product_variants pv
      LEFT JOIN public.product_translations pt ON pt.product_id = pv.product_id AND pt.locale = 'fr'
      WHERE pv.id = variant_b;
    END IF;
  END IF;
END $$;