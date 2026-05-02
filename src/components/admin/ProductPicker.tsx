import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ImageOff } from "lucide-react";

export interface PickedItem {
  variant_id: string;
  product_id: string;
  sku: string;
  product_name: string;
  variant_label: string | null;
  unit_price: number;
  image_url: string | null;
}

type CustomerType = "retail" | "wholesale" | "franchise" | string;

function priceFor(price: number, type?: CustomerType) {
  if (type === "wholesale") return Math.round(price * 0.9 * 100) / 100;
  if (type === "franchise") return Math.round(price * 0.85 * 100) / 100;
  return price;
}

export function ProductPicker({
  customerType,
  onPick,
}: {
  customerType?: CustomerType;
  onPick: (item: PickedItem) => void;
}) {
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 180);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const search = useQuery({
    queryKey: ["product-picker", debounced, locale],
    queryFn: async () => {
      // Variants
      let vq = supabase
        .from("product_variants")
        .select("id, sku, price, product_id, attributes, barcode, image_url, active")
        .eq("active", true)
        .limit(50);
      if (debounced) {
        vq = vq.or(`sku.ilike.%${debounced}%,barcode.ilike.%${debounced}%`);
      }
      const { data: variants } = await vq;
      let variantList = variants ?? [];

      // Also search by translated product name
      if (debounced) {
        const { data: trMatch } = await supabase
          .from("product_translations")
          .select("product_id")
          .ilike("name", `%${debounced}%`)
          .limit(50);
        const pids = (trMatch ?? []).map((x: any) => x.product_id);
        if (pids.length) {
          const { data: extra } = await supabase
            .from("product_variants")
            .select("id, sku, price, product_id, attributes, barcode, image_url, active")
            .eq("active", true)
            .in("product_id", pids)
            .limit(50);
          const seen = new Set(variantList.map((v: any) => v.id));
          for (const e of extra ?? []) if (!seen.has(e.id)) variantList.push(e as any);
        }
      }
      if (variantList.length === 0) return [];

      const productIds = Array.from(new Set(variantList.map((v: any) => v.product_id)));
      const [{ data: products }, { data: trans }, { data: imgs }, { data: inv }] = await Promise.all([
        supabase.from("products").select("id, sku, base_price").in("id", productIds),
        supabase.from("product_translations").select("product_id, locale, name").in("product_id", productIds),
        supabase.from("product_images").select("product_id, url, is_primary, sort_order").in("product_id", productIds),
        supabase.from("inventory").select("variant_id, location_id, quantity, reserved").in("variant_id", variantList.map((v: any) => v.id)),
      ]);
      const { data: locs } = await supabase.from("locations").select("id, name, code");

      return variantList.map((v: any) => {
        const p = products?.find((x: any) => x.id === v.product_id);
        const trL = trans?.find((x: any) => x.product_id === v.product_id && x.locale === locale)
          ?? trans?.find((x: any) => x.product_id === v.product_id && x.locale === "fr")
          ?? trans?.find((x: any) => x.product_id === v.product_id);
        const productImages = (imgs ?? []).filter((x: any) => x.product_id === v.product_id);
        const primary = productImages.find((x: any) => x.is_primary) ?? productImages.sort((a: any, b: any) => a.sort_order - b.sort_order)[0];
        const stocks = (inv ?? []).filter((x: any) => x.variant_id === v.id);
        const totalAvail = stocks.reduce((s: number, x: any) => s + Math.max(0, x.quantity - x.reserved), 0);
        const attrs = v.attributes && typeof v.attributes === "object"
          ? Object.values(v.attributes).filter(Boolean).join(" / ")
          : "";
        const basePrice = Number(v.price ?? p?.base_price ?? 0);
        return {
          variant_id: v.id,
          product_id: v.product_id,
          sku: v.sku,
          barcode: v.barcode,
          product_name: trL?.name ?? p?.sku ?? v.sku,
          variant_label: attrs || null,
          base_price: basePrice,
          image_url: v.image_url ?? primary?.url ?? null,
          stocks: stocks.map((s: any) => ({
            qty: Math.max(0, s.quantity - s.reserved),
            location: locs?.find((l: any) => l.id === s.location_id)?.name ?? "—",
          })),
          totalAvail,
        };
      });
    },
    enabled: open,
  });

  const results = search.data ?? [];

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute start-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={t("picker.placeholder")}
          className="ps-8"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 max-h-[420px] w-full overflow-y-auto rounded-md border bg-popover shadow-lg">
          {search.isLoading && <div className="p-3 text-sm text-muted-foreground">{t("common.loading")}</div>}
          {!search.isLoading && results.length === 0 && <div className="p-3 text-sm text-muted-foreground">{t("common.empty")}</div>}
          {results.map((r: any) => {
            const oos = r.totalAvail <= 0;
            const finalPrice = priceFor(r.base_price, customerType);
            return (
              <button
                key={r.variant_id}
                type="button"
                disabled={oos}
                onClick={() => {
                  onPick({
                    variant_id: r.variant_id,
                    product_id: r.product_id,
                    sku: r.sku,
                    product_name: r.product_name,
                    variant_label: r.variant_label,
                    unit_price: finalPrice,
                    image_url: r.image_url,
                  });
                  setQ("");
                  setOpen(false);
                  inputRef.current?.focus();
                }}
                className={`flex w-full items-center gap-3 border-b p-2 text-start last:border-0 ${oos ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"}`}
              >
                <div className="h-12 w-12 flex-none overflow-hidden rounded bg-muted">
                  {r.image_url
                    ? <img src={r.image_url} alt="" className="h-full w-full object-cover" />
                    : <div className="flex h-full w-full items-center justify-center text-muted-foreground"><ImageOff className="h-4 w-4" /></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.product_name}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{r.sku}</span>
                    {r.variant_label && <span>· {r.variant_label}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.stocks.length === 0 && <Badge variant="outline" className="text-[10px]">{t("picker.noStock")}</Badge>}
                    {r.stocks.map((s: any, i: number) => (
                      <Badge key={i} variant={s.qty > 0 ? "secondary" : "outline"} className="text-[10px]">
                        {s.location}: {s.qty}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end text-end">
                  <div className="text-sm font-bold">{finalPrice.toFixed(2)}</div>
                  {finalPrice !== r.base_price && (
                    <div className="text-[10px] text-muted-foreground line-through">{r.base_price.toFixed(2)}</div>
                  )}
                  {oos && <Badge variant="destructive" className="mt-1 text-[10px]">{t("picker.outOfStock")}</Badge>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}