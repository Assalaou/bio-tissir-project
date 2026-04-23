
-- ============================================================================
-- ROLES & AUTH
-- ============================================================================
CREATE TYPE public.app_role AS ENUM (
  'super_admin', 'commercial_admin', 'stock_manager', 'confirmation_agent',
  'accountant', 'logistics', 'franchise_manager', 'customer'
);

CREATE TYPE public.locale_code AS ENUM ('fr', 'ar', 'en');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  preferred_locale public.locale_code NOT NULL DEFAULT 'fr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- security definer to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin','commercial_admin','stock_manager','confirmation_agent','accountant','logistics','franchise_manager')
  )
$$;

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), NEW.raw_user_meta_data->>'phone');
  -- default role: customer
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS: profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Staff view all profiles" ON public.profiles FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(),'super_admin'));

-- RLS: user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'super_admin'));

-- ============================================================================
-- CATEGORIES
-- ============================================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.category_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  locale public.locale_code NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  meta_title TEXT,
  meta_description TEXT,
  UNIQUE (category_id, locale)
);

CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active categories" ON public.categories FOR SELECT USING (active = true);
CREATE POLICY "Staff manage categories" ON public.categories FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','commercial_admin']::public.app_role[]));
CREATE POLICY "Public read category translations" ON public.category_translations FOR SELECT USING (true);
CREATE POLICY "Staff manage category translations" ON public.category_translations FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','commercial_admin']::public.app_role[]));

-- ============================================================================
-- PRODUCTS
-- ============================================================================
CREATE TYPE public.product_status AS ENUM ('draft','active','archived','out_of_stock');

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  brand TEXT DEFAULT 'Bio Tissir',
  status public.product_status NOT NULL DEFAULT 'draft',
  base_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  compare_at_price NUMERIC(12,2),
  cost_price NUMERIC(12,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 20,
  weight_grams INT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  has_variants BOOLEAN NOT NULL DEFAULT false,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.product_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  locale public.locale_code NOT NULL,
  name TEXT NOT NULL,
  short_description TEXT,
  long_description TEXT,
  ingredients TEXT,
  usage_instructions TEXT,
  meta_title TEXT,
  meta_description TEXT,
  UNIQUE (product_id, locale)
);

CREATE TABLE public.product_categories (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb, -- {size:"100ml", scent:"original"}
  price NUMERIC(12,2),  -- override base_price; null = use product.base_price
  compare_at_price NUMERIC(12,2),
  cost_price NUMERIC(12,2),
  weight_grams INT,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_translations_product ON public.product_translations(product_id);
CREATE INDEX idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX idx_products_status ON public.products(status);

CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_variants_updated BEFORE UPDATE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active products" ON public.products FOR SELECT USING (status = 'active' OR public.is_staff(auth.uid()));
CREATE POLICY "Staff manage products" ON public.products FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','commercial_admin','stock_manager']::public.app_role[]));

CREATE POLICY "Public read product translations" ON public.product_translations FOR SELECT USING (true);
CREATE POLICY "Staff manage product translations" ON public.product_translations FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','commercial_admin']::public.app_role[]));

CREATE POLICY "Public read product categories" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "Staff manage product categories" ON public.product_categories FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','commercial_admin']::public.app_role[]));

CREATE POLICY "Public read product images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Staff manage product images" ON public.product_images FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','commercial_admin']::public.app_role[]));

CREATE POLICY "Public read active variants" ON public.product_variants FOR SELECT USING (active = true OR public.is_staff(auth.uid()));
CREATE POLICY "Staff manage variants" ON public.product_variants FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','commercial_admin','stock_manager']::public.app_role[]));

-- ============================================================================
-- LOCATIONS & INVENTORY
-- ============================================================================
CREATE TYPE public.location_type AS ENUM ('warehouse','shop','franchise','virtual');

CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type public.location_type NOT NULL DEFAULT 'warehouse',
  city TEXT,
  region TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  phone TEXT,
  manager_user_id UUID REFERENCES auth.users(id),
  active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 0,
  reserved INT NOT NULL DEFAULT 0,
  reorder_point INT NOT NULL DEFAULT 0,
  reorder_qty INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (variant_id, location_id),
  CHECK (quantity >= 0),
  CHECK (reserved >= 0)
);

CREATE TYPE public.movement_type AS ENUM (
  'in','out','transfer_in','transfer_out','adjustment','reservation','release','return'
);

CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  type public.movement_type NOT NULL,
  quantity INT NOT NULL, -- positive integer; sign derived from type
  reason TEXT,
  reference_type TEXT, -- 'order','batch','manual','transfer'
  reference_id UUID,
  batch_id UUID,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  lot_number TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC(12,2),
  supplier TEXT,
  manufactured_at DATE,
  expires_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (variant_id, location_id, lot_number),
  CHECK (quantity >= 0)
);

CREATE INDEX idx_inventory_variant ON public.inventory(variant_id);
CREATE INDEX idx_inventory_location ON public.inventory(location_id);
CREATE INDEX idx_movements_ref ON public.inventory_movements(reference_type, reference_id);
CREATE INDEX idx_batches_expires ON public.batches(expires_at);

-- Validate batch expiration via trigger (CHECK can't use now())
CREATE OR REPLACE FUNCTION public.validate_batch_expiration()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.expires_at IS NOT NULL AND NEW.manufactured_at IS NOT NULL
     AND NEW.expires_at < NEW.manufactured_at THEN
    RAISE EXCEPTION 'Batch expiration must be after manufacturing date';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_batch_validate BEFORE INSERT OR UPDATE ON public.batches
FOR EACH ROW EXECUTE FUNCTION public.validate_batch_expiration();

CREATE TRIGGER trg_locations_updated BEFORE UPDATE ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_batches_updated BEFORE UPDATE ON public.batches
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-update inventory from movements
CREATE OR REPLACE FUNCTION public.apply_inventory_movement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  qty_delta INT := 0;
  reserved_delta INT := 0;
BEGIN
  -- Determine effects on quantity and reserved
  CASE NEW.type
    WHEN 'in', 'transfer_in', 'return' THEN qty_delta := NEW.quantity;
    WHEN 'out', 'transfer_out' THEN qty_delta := -NEW.quantity;
    WHEN 'adjustment' THEN qty_delta := NEW.quantity; -- caller passes signed via separate flow; treat as set delta
    WHEN 'reservation' THEN reserved_delta := NEW.quantity;
    WHEN 'release' THEN reserved_delta := -NEW.quantity;
  END CASE;

  INSERT INTO public.inventory (variant_id, location_id, quantity, reserved)
  VALUES (NEW.variant_id, NEW.location_id, GREATEST(qty_delta, 0), GREATEST(reserved_delta, 0))
  ON CONFLICT (variant_id, location_id)
  DO UPDATE SET
    quantity = public.inventory.quantity + qty_delta,
    reserved = GREATEST(public.inventory.reserved + reserved_delta, 0),
    updated_at = now();

  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_apply_movement AFTER INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_inventory_movement();

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read locations" ON public.locations FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage locations" ON public.locations FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','stock_manager']::public.app_role[]));

CREATE POLICY "Staff read inventory" ON public.inventory FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Stock managers manage inventory" ON public.inventory FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','stock_manager']::public.app_role[]));

CREATE POLICY "Staff read movements" ON public.inventory_movements FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Stock managers create movements" ON public.inventory_movements FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','stock_manager','logistics']::public.app_role[]));

CREATE POLICY "Staff read batches" ON public.batches FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Stock managers manage batches" ON public.batches FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','stock_manager']::public.app_role[]));

-- ============================================================================
-- CUSTOMERS
-- ============================================================================
CREATE TYPE public.customer_segment AS ENUM ('new','regular','vip','wholesale','at_risk','blocked');
CREATE TYPE public.acquisition_channel AS ENUM ('web','whatsapp','instagram','facebook','shop','referral','wholesale','franchise','other');

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL, -- nullable: guest customers from manual orders
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  preferred_locale public.locale_code NOT NULL DEFAULT 'fr',
  acquisition_channel public.acquisition_channel NOT NULL DEFAULT 'web',
  segment public.customer_segment NOT NULL DEFAULT 'new',
  reliability_score INT NOT NULL DEFAULT 100 CHECK (reliability_score BETWEEN 0 AND 100),
  total_orders INT NOT NULL DEFAULT 0,
  successful_orders INT NOT NULL DEFAULT 0,
  cancelled_orders INT NOT NULL DEFAULT 0,
  returned_orders INT NOT NULL DEFAULT 0,
  total_spent NUMERIC(14,2) NOT NULL DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  notes TEXT,
  blocked BOOLEAN NOT NULL DEFAULT false,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_customers_segment ON public.customers(segment);

CREATE TABLE public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  label TEXT,
  full_name TEXT,
  phone TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  region TEXT,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'MA',
  is_default_shipping BOOLEAN NOT NULL DEFAULT false,
  is_default_billing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_customer_addr_updated BEFORE UPDATE ON public.customer_addresses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own record" ON public.customers FOR SELECT
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Customers update own record" ON public.customers FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "Staff manage customers" ON public.customers FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','commercial_admin','confirmation_agent']::public.app_role[]));

CREATE POLICY "Customers view own addresses" ON public.customer_addresses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND (c.user_id = auth.uid() OR public.is_staff(auth.uid()))));
CREATE POLICY "Customers manage own addresses" ON public.customer_addresses FOR ALL
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid()));
CREATE POLICY "Staff manage addresses" ON public.customer_addresses FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','commercial_admin','confirmation_agent','logistics']::public.app_role[]));

-- ============================================================================
-- ORDERS
-- ============================================================================
CREATE TYPE public.order_channel AS ENUM ('web','whatsapp','instagram','phone','shop','wholesale','franchise','manual');
CREATE TYPE public.order_status AS ENUM (
  'draft','pending','awaiting_confirmation','confirmed','preparing','shipped','delivered','cancelled','returned','refunded'
);
CREATE TYPE public.payment_status AS ENUM ('unpaid','partial','paid','refunded','cod_pending');
CREATE TYPE public.payment_method AS ENUM ('cod','card','bank_transfer','cash','wallet');

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 10000;

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT ('BT-' || nextval('public.order_number_seq')),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  channel public.order_channel NOT NULL DEFAULT 'web',
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  payment_method public.payment_method NOT NULL DEFAULT 'cod',
  currency TEXT NOT NULL DEFAULT 'MAD',
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  shipping_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- Shipping address snapshot
  shipping_full_name TEXT,
  shipping_phone TEXT,
  shipping_address_line1 TEXT,
  shipping_address_line2 TEXT,
  shipping_city TEXT,
  shipping_region TEXT,
  shipping_postal_code TEXT,
  shipping_country TEXT DEFAULT 'MA',
  -- Sourcing / fulfillment
  source_location_id UUID REFERENCES public.locations(id),
  franchise_id UUID, -- forward ref; franchise table later
  assigned_agent_id UUID REFERENCES auth.users(id),
  notes TEXT,
  internal_notes TEXT,
  coupon_code TEXT,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  bundle_id UUID, -- forward ref; bundles table in phase 2
  -- Snapshot fields (immutable record of what was sold)
  product_name TEXT NOT NULL,
  variant_label TEXT,
  sku TEXT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL,
  source_location_id UUID REFERENCES public.locations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status public.order_status,
  to_status public.order_status NOT NULL,
  reason TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_placed_at ON public.orders(placed_at DESC);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_variant ON public.order_items(variant_id);
CREATE INDEX idx_order_history_order ON public.order_status_history(order_id);

CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Log status changes & set timestamps
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_history(order_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history(order_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());

    -- Auto timestamps
    IF NEW.status = 'confirmed' AND NEW.confirmed_at IS NULL THEN NEW.confirmed_at := now(); END IF;
    IF NEW.status = 'shipped' AND NEW.shipped_at IS NULL THEN NEW.shipped_at := now(); END IF;
    IF NEW.status = 'delivered' AND NEW.delivered_at IS NULL THEN NEW.delivered_at := now(); END IF;
    IF NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL THEN NEW.cancelled_at := now(); END IF;
  END IF;
  RETURN NEW;
END;
$$;
-- Use BEFORE so timestamp updates persist
CREATE TRIGGER trg_order_status_log
BEFORE INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- Reserve / release stock based on order status transitions
CREATE OR REPLACE FUNCTION public.handle_order_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  itm RECORD;
  default_loc UUID;
BEGIN
  -- Reserve when transitioning to 'confirmed'
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'confirmed') THEN
    SELECT id INTO default_loc FROM public.locations WHERE is_default = true AND active = true LIMIT 1;
    FOR itm IN SELECT * FROM public.order_items WHERE order_id = NEW.id AND variant_id IS NOT NULL LOOP
      INSERT INTO public.inventory_movements (variant_id, location_id, type, quantity, reason, reference_type, reference_id, performed_by)
      VALUES (itm.variant_id, COALESCE(itm.source_location_id, NEW.source_location_id, default_loc),
              'reservation', itm.quantity, 'Order confirmed', 'order', NEW.id, auth.uid());
    END LOOP;
  END IF;

  -- Release reservation if cancelled/returned after confirmation
  IF (TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status IN ('cancelled','returned')) THEN
    SELECT id INTO default_loc FROM public.locations WHERE is_default = true AND active = true LIMIT 1;
    FOR itm IN SELECT * FROM public.order_items WHERE order_id = NEW.id AND variant_id IS NOT NULL LOOP
      INSERT INTO public.inventory_movements (variant_id, location_id, type, quantity, reason, reference_type, reference_id, performed_by)
      VALUES (itm.variant_id, COALESCE(itm.source_location_id, NEW.source_location_id, default_loc),
              'release', itm.quantity, 'Order ' || NEW.status, 'order', NEW.id, auth.uid());
    END LOOP;
  END IF;

  -- Convert reservation to outbound on shipped
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'shipped') THEN
    SELECT id INTO default_loc FROM public.locations WHERE is_default = true AND active = true LIMIT 1;
    FOR itm IN SELECT * FROM public.order_items WHERE order_id = NEW.id AND variant_id IS NOT NULL LOOP
      INSERT INTO public.inventory_movements (variant_id, location_id, type, quantity, reason, reference_type, reference_id, performed_by)
      VALUES (itm.variant_id, COALESCE(itm.source_location_id, NEW.source_location_id, default_loc),
              'release', itm.quantity, 'Shipped', 'order', NEW.id, auth.uid());
      INSERT INTO public.inventory_movements (variant_id, location_id, type, quantity, reason, reference_type, reference_id, performed_by)
      VALUES (itm.variant_id, COALESCE(itm.source_location_id, NEW.source_location_id, default_loc),
              'out', itm.quantity, 'Order shipped', 'order', NEW.id, auth.uid());
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_order_stock AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_order_stock();

-- Customer metrics aggregation on delivery/cancellation
CREATE OR REPLACE FUNCTION public.update_customer_metrics()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.customer_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    UPDATE public.customers SET
      successful_orders = successful_orders + 1,
      total_orders = total_orders + 1,
      total_spent = total_spent + NEW.grand_total,
      last_order_at = now(),
      reliability_score = LEAST(100, reliability_score + 2)
    WHERE id = NEW.customer_id;
  ELSIF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE public.customers SET
      cancelled_orders = cancelled_orders + 1,
      reliability_score = GREATEST(0, reliability_score - 10)
    WHERE id = NEW.customer_id;
  ELSIF NEW.status = 'returned' AND OLD.status IS DISTINCT FROM 'returned' THEN
    UPDATE public.customers SET
      returned_orders = returned_orders + 1,
      reliability_score = GREATEST(0, reliability_score - 5)
    WHERE id = NEW.customer_id;
  END IF;

  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_order_customer_metrics AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_customer_metrics();

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own orders" ON public.orders FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid()));
CREATE POLICY "Customers create orders" ON public.orders FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid()));
CREATE POLICY "Staff manage orders" ON public.orders FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','commercial_admin','confirmation_agent','logistics','accountant']::public.app_role[]));

CREATE POLICY "Customers view own order items" ON public.order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.orders o JOIN public.customers c ON c.id = o.customer_id WHERE o.id = order_id AND c.user_id = auth.uid()));
CREATE POLICY "Customers create own order items" ON public.order_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o JOIN public.customers c ON c.id = o.customer_id WHERE o.id = order_id AND c.user_id = auth.uid()));
CREATE POLICY "Staff manage order items" ON public.order_items FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','commercial_admin','confirmation_agent','logistics']::public.app_role[]));

CREATE POLICY "Customers view own order history" ON public.order_status_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.orders o JOIN public.customers c ON c.id = o.customer_id WHERE o.id = order_id AND c.user_id = auth.uid()));
CREATE POLICY "Staff view all order history" ON public.order_status_history FOR SELECT USING (public.is_staff(auth.uid()));

-- ============================================================================
-- CONFIRMATION CENTER
-- ============================================================================
CREATE TYPE public.call_status AS ENUM ('pending','in_progress','confirmed','rejected','no_answer','postponed','wrong_number','duplicate');
CREATE TYPE public.call_result AS ENUM ('answered','no_answer','busy','voicemail','wrong_number','callback_requested','confirmed','rejected');

CREATE TABLE public.confirmation_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES auth.users(id),
  status public.call_status NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  outcome_notes TEXT,
  priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_call_id UUID NOT NULL REFERENCES public.confirmation_calls(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES auth.users(id),
  result public.call_result NOT NULL,
  duration_seconds INT,
  notes TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calls_status ON public.confirmation_calls(status);
CREATE INDEX idx_calls_agent ON public.confirmation_calls(agent_id);
CREATE INDEX idx_call_logs_call ON public.call_logs(confirmation_call_id);

CREATE TRIGGER trg_calls_updated BEFORE UPDATE ON public.confirmation_calls
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create confirmation call when an online order is placed
CREATE OR REPLACE FUNCTION public.create_confirmation_call()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.channel IN ('web','whatsapp','instagram','facebook') AND NEW.status IN ('pending','awaiting_confirmation') THEN
    INSERT INTO public.confirmation_calls (order_id, status)
    VALUES (NEW.id, 'pending')
    ON CONFLICT (order_id) DO NOTHING;
    -- Also move the order to awaiting_confirmation if still pending
    IF NEW.status = 'pending' THEN
      UPDATE public.orders SET status = 'awaiting_confirmation' WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_create_confirmation_call AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.create_confirmation_call();

-- Sync confirmation call → order status
CREATE OR REPLACE FUNCTION public.sync_call_to_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed' THEN
    NEW.confirmed_at := COALESCE(NEW.confirmed_at, now());
    UPDATE public.orders SET status = 'confirmed' WHERE id = NEW.order_id AND status NOT IN ('confirmed','shipped','delivered','cancelled');
  ELSIF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    NEW.rejected_at := COALESCE(NEW.rejected_at, now());
    UPDATE public.orders SET status = 'cancelled' WHERE id = NEW.order_id AND status NOT IN ('shipped','delivered','cancelled');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_sync_call_to_order BEFORE UPDATE OF status ON public.confirmation_calls
FOR EACH ROW EXECUTE FUNCTION public.sync_call_to_order();

-- Append to call_logs auto-increments attempts
CREATE OR REPLACE FUNCTION public.bump_call_attempts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.confirmation_calls
  SET attempts = attempts + 1,
      last_attempt_at = NEW.attempted_at,
      agent_id = COALESCE(agent_id, NEW.agent_id)
  WHERE id = NEW.confirmation_call_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_bump_attempts AFTER INSERT ON public.call_logs
FOR EACH ROW EXECUTE FUNCTION public.bump_call_attempts();

ALTER TABLE public.confirmation_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Confirmation staff read calls" ON public.confirmation_calls FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','commercial_admin','confirmation_agent']::public.app_role[]));
CREATE POLICY "Confirmation staff manage calls" ON public.confirmation_calls FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','commercial_admin','confirmation_agent']::public.app_role[]));

CREATE POLICY "Confirmation staff read logs" ON public.call_logs FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','commercial_admin','confirmation_agent']::public.app_role[]));
CREATE POLICY "Confirmation staff create logs" ON public.call_logs FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','commercial_admin','confirmation_agent']::public.app_role[]));
