
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.depot_type AS ENUM ('supplier','cooperative','producer','internal_warehouse','franchise','shop');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.depot_status AS ENUM ('active','inactive','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.customer_type AS ENUM ('retail','wholesale','franchise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add new channels to order_channel if not present
DO $$
BEGIN
  BEGIN ALTER TYPE public.order_channel ADD VALUE IF NOT EXISTS 'walk_in'; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TYPE public.order_channel ADD VALUE IF NOT EXISTS 'phone'; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TYPE public.order_channel ADD VALUE IF NOT EXISTS 'whatsapp_ai'; EXCEPTION WHEN others THEN NULL; END;
END $$;

-- ============ DEPOTS ============
CREATE TABLE IF NOT EXISTS public.depots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type public.depot_type NOT NULL DEFAULT 'supplier',
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  region TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  notes TEXT,
  status public.depot_status NOT NULL DEFAULT 'active',
  linked_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_depots_status ON public.depots(status);
CREATE INDEX IF NOT EXISTS idx_depots_type ON public.depots(type);

ALTER TABLE public.depots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read depots" ON public.depots;
CREATE POLICY "Staff read depots" ON public.depots FOR SELECT USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Stock admins manage depots" ON public.depots;
CREATE POLICY "Stock admins manage depots" ON public.depots FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role,'commercial_admin'::app_role,'stock_manager'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role,'commercial_admin'::app_role,'stock_manager'::app_role]));

CREATE TRIGGER trg_depots_updated_at BEFORE UPDATE ON public.depots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ LINK BATCHES & MOVEMENTS TO DEPOT ============
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS depot_id UUID REFERENCES public.depots(id) ON DELETE SET NULL;

ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS source_depot_id UUID REFERENCES public.depots(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_batches_depot ON public.batches(depot_id);
CREATE INDEX IF NOT EXISTS idx_movements_depot ON public.inventory_movements(source_depot_id);

-- ============ PRODUCT ORIGIN HISTORY ============
CREATE TABLE IF NOT EXISTS public.product_origin_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  depot_id UUID NOT NULL REFERENCES public.depots(id) ON DELETE RESTRICT,
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  unit_cost NUMERIC(12,2),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_origin_product ON public.product_origin_history(product_id);
CREATE INDEX IF NOT EXISTS idx_origin_depot ON public.product_origin_history(depot_id);

ALTER TABLE public.product_origin_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read origin" ON public.product_origin_history;
CREATE POLICY "Staff read origin" ON public.product_origin_history FOR SELECT USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Stock managers insert origin" ON public.product_origin_history;
CREATE POLICY "Stock managers insert origin" ON public.product_origin_history FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role,'stock_manager'::app_role,'logistics'::app_role]));

-- ============ CUSTOMER TYPE ============
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS customer_type public.customer_type NOT NULL DEFAULT 'retail';

-- ============ AI AGENT FIELDS ON ORDERS ============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ai_extracted_data JSONB,
  ADD COLUMN IF NOT EXISTS ai_confidence_score NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS needs_human_review BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_message_text TEXT,
  ADD COLUMN IF NOT EXISTS source_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_needs_review ON public.orders(needs_human_review) WHERE needs_human_review = true;

-- ============ PREVENT NEGATIVE STOCK ============
CREATE OR REPLACE FUNCTION public.prevent_negative_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_qty INT;
  current_reserved INT;
BEGIN
  IF NEW.type IN ('out','transfer_out') THEN
    SELECT quantity, reserved INTO current_qty, current_reserved
    FROM public.inventory WHERE variant_id = NEW.variant_id AND location_id = NEW.location_id;
    IF current_qty IS NULL OR (current_qty - NEW.quantity) < 0 THEN
      RAISE EXCEPTION 'Insufficient stock: cannot remove % units from variant %', NEW.quantity, NEW.variant_id;
    END IF;
  END IF;
  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Movement quantity must be positive';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_negative_stock ON public.inventory_movements;
CREATE TRIGGER trg_prevent_negative_stock
  BEFORE INSERT ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.prevent_negative_stock();

-- ============ Recreate apply_inventory_movement trigger if missing ============
DROP TRIGGER IF EXISTS trg_apply_movement ON public.inventory_movements;
CREATE TRIGGER trg_apply_movement
  AFTER INSERT ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.apply_inventory_movement();

-- ============ Make sure order triggers exist ============
DROP TRIGGER IF EXISTS trg_order_status_history ON public.orders;
CREATE TRIGGER trg_order_status_history
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

DROP TRIGGER IF EXISTS trg_order_stock ON public.orders;
CREATE TRIGGER trg_order_stock
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_order_stock();

DROP TRIGGER IF EXISTS trg_order_customer_metrics ON public.orders;
CREATE TRIGGER trg_order_customer_metrics
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_customer_metrics();

DROP TRIGGER IF EXISTS trg_order_create_call ON public.orders;
CREATE TRIGGER trg_order_create_call
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.create_confirmation_call();

DROP TRIGGER IF EXISTS trg_call_sync ON public.confirmation_calls;
CREATE TRIGGER trg_call_sync
  BEFORE UPDATE ON public.confirmation_calls
  FOR EACH ROW EXECUTE FUNCTION public.sync_call_to_order();

DROP TRIGGER IF EXISTS trg_call_log_bump ON public.call_logs;
CREATE TRIGGER trg_call_log_bump
  AFTER INSERT ON public.call_logs
  FOR EACH ROW EXECUTE FUNCTION public.bump_call_attempts();

DROP TRIGGER IF EXISTS trg_batch_validate ON public.batches;
CREATE TRIGGER trg_batch_validate
  BEFORE INSERT OR UPDATE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.validate_batch_expiration();
