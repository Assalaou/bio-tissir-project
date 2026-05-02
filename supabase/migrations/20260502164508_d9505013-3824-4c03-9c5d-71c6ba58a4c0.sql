
CREATE EXTENSION IF NOT EXISTS pg_trgm;

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read product-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Staff insert product-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role,'commercial_admin'::app_role,'stock_manager'::app_role]));

CREATE POLICY "Staff update product-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role,'commercial_admin'::app_role,'stock_manager'::app_role]));

CREATE POLICY "Staff delete product-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role,'commercial_admin'::app_role,'stock_manager'::app_role]));

ALTER TABLE public.product_images
  ADD COLUMN IF NOT EXISTS alt_text_fr text,
  ADD COLUMN IF NOT EXISTS alt_text_ar text,
  ADD COLUMN IF NOT EXISTS alt_text_en text,
  ADD COLUMN IF NOT EXISTS storage_path text;

CREATE INDEX IF NOT EXISTS idx_variants_barcode ON public.product_variants(barcode);
CREATE INDEX IF NOT EXISTS idx_variants_sku_search ON public.product_variants USING gin (sku gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_translations_name_search ON public.product_translations USING gin (name gin_trgm_ops);
