import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products/$productId")({ component: ProductDetail });

const LOCALES = ["fr", "ar", "en"] as const;

function ProductDetail() {
  const { productId } = Route.useParams();
  const { t, dir } = useI18n();
  const qc = useQueryClient();

  const product = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
      return data;
    },
  });
  const trans = useQuery({
    queryKey: ["product-trans", productId],
    queryFn: async () => (await supabase.from("product_translations").select("*").eq("product_id", productId)).data ?? [],
  });
  const variants = useQuery({
    queryKey: ["product-variants", productId],
    queryFn: async () => (await supabase.from("product_variants").select("*").eq("product_id", productId).order("sort_order")).data ?? [],
  });
  const images = useQuery({
    queryKey: ["product-images", productId],
    queryFn: async () => (await supabase.from("product_images").select("*").eq("product_id", productId).order("sort_order")).data ?? [],
  });

  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (product.data && !form) setForm(product.data); }, [product.data]);

  const saveBase = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("products").update({
        sku: form.sku, slug: form.slug, base_price: form.base_price, compare_at_price: form.compare_at_price,
        cost_price: form.cost_price, tax_rate: form.tax_rate, status: form.status, is_featured: form.is_featured,
        brand: form.brand, weight_grams: form.weight_grams,
      }).eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(t("common.success")); qc.invalidateQueries({ queryKey: ["product", productId] }); qc.invalidateQueries({ queryKey: ["products-admin"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (product.isLoading || !form) return <div className="p-4 text-muted-foreground">{t("common.loading")}</div>;
  if (!product.data) return <div className="p-4">{t("common.empty")}</div>;

  return (
    <div dir={dir}>
      <PageHeader title={form.sku} description={form.slug}
        actions={<Button asChild variant="outline" size="sm"><Link to="/admin/products"><ArrowLeft className="me-1 h-4 w-4" /> {t("products.title")}</Link></Button>} />
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">{t("common.edit")}</TabsTrigger>
          <TabsTrigger value="translations">{t("products.translations")}</TabsTrigger>
          <TabsTrigger value="variants">{t("nav.variants")}</TabsTrigger>
          <TabsTrigger value="images">{t("products.images")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card><CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div><Label>{t("products.sku")}</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
              <div><Label>{t("products.slug")}</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
              <div><Label>{t("products.brand")}</Label><Input value={form.brand ?? ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
              <div><Label>{t("products.basePrice")}</Label><Input type="number" step="0.01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) })} /></div>
              <div><Label>Compare</Label><Input type="number" step="0.01" value={form.compare_at_price ?? ""} onChange={(e) => setForm({ ...form, compare_at_price: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              <div><Label>Cost</Label><Input type="number" step="0.01" value={form.cost_price ?? ""} onChange={(e) => setForm({ ...form, cost_price: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              <div><Label>{t("products.taxRate")}</Label><Input type="number" step="0.01" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })} /></div>
              <div><Label>{t("common.status")}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["draft", "active", "archived"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6"><Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} /><Label>{t("products.featured")}</Label></div>
            </div>
            <div className="mt-4"><Button onClick={() => saveBase.mutate()} disabled={saveBase.isPending}>{t("common.save")}</Button></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="translations"><TranslationsTab productId={productId} translations={trans.data ?? []} /></TabsContent>
        <TabsContent value="variants"><VariantsTab productId={productId} variants={variants.data ?? []} basePrice={form.base_price} /></TabsContent>
        <TabsContent value="images"><ImagesTab productId={productId} images={images.data ?? []} /></TabsContent>
      </Tabs>
    </div>
  );
}

function TranslationsTab({ productId, translations }: { productId: string; translations: any[] }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [forms, setForms] = useState<Record<string, any>>(() => {
    const o: Record<string, any> = {};
    LOCALES.forEach((l) => {
      const ex = translations.find((x) => x.locale === l);
      o[l] = ex ?? { product_id: productId, locale: l, name: "", short_description: "", long_description: "", ingredients: "", usage_instructions: "", meta_title: "", meta_description: "" };
    });
    return o;
  });

  const save = useMutation({
    mutationFn: async (loc: string) => {
      const f = forms[loc];
      if (!f.name) throw new Error(`${t("common.name")} ${t("common.required")}`);
      if (f.id) {
        const { error } = await supabase.from("product_translations").update({
          name: f.name, short_description: f.short_description, long_description: f.long_description,
          ingredients: f.ingredients, usage_instructions: f.usage_instructions, meta_title: f.meta_title, meta_description: f.meta_description,
        }).eq("id", f.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("product_translations").insert({
          product_id: productId, locale: loc as any, name: f.name, short_description: f.short_description,
          long_description: f.long_description, ingredients: f.ingredients, usage_instructions: f.usage_instructions,
          meta_title: f.meta_title, meta_description: f.meta_description,
        }).select("id").single();
        if (error) throw error;
        setForms((s) => ({ ...s, [loc]: { ...s[loc], id: data!.id } }));
      }
    },
    onSuccess: () => { toast.success(t("common.success")); qc.invalidateQueries({ queryKey: ["product-trans", productId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card><CardContent className="p-4">
      <Tabs defaultValue="fr">
        <TabsList>{LOCALES.map((l) => <TabsTrigger key={l} value={l}>{l.toUpperCase()}</TabsTrigger>)}</TabsList>
        {LOCALES.map((l) => {
          const f = forms[l];
          const setF = (patch: any) => setForms((s) => ({ ...s, [l]: { ...s[l], ...patch } }));
          const rtl = l === "ar";
          return (
            <TabsContent key={l} value={l} className="space-y-3" dir={rtl ? "rtl" : "ltr"}>
              <div><Label>{t("common.name")} *</Label><Input value={f.name ?? ""} onChange={(e) => setF({ name: e.target.value })} /></div>
              <div><Label>{t("products.shortDesc")}</Label><Textarea rows={2} value={f.short_description ?? ""} onChange={(e) => setF({ short_description: e.target.value })} /></div>
              <div><Label>{t("products.longDesc")}</Label><Textarea rows={4} value={f.long_description ?? ""} onChange={(e) => setF({ long_description: e.target.value })} /></div>
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label>{t("products.ingredients")}</Label><Textarea rows={2} value={f.ingredients ?? ""} onChange={(e) => setF({ ingredients: e.target.value })} /></div>
                <div><Label>{t("products.usage")}</Label><Textarea rows={2} value={f.usage_instructions ?? ""} onChange={(e) => setF({ usage_instructions: e.target.value })} /></div>
                <div><Label>{t("products.metaTitle")}</Label><Input value={f.meta_title ?? ""} onChange={(e) => setF({ meta_title: e.target.value })} /></div>
                <div><Label>{t("products.metaDesc")}</Label><Input value={f.meta_description ?? ""} onChange={(e) => setF({ meta_description: e.target.value })} /></div>
              </div>
              <Button onClick={() => save.mutate(l)} disabled={save.isPending}>{t("common.save")}</Button>
            </TabsContent>
          );
        })}
      </Tabs>
    </CardContent></Card>
  );
}

function VariantsTab({ productId, variants, basePrice }: { productId: string; variants: any[]; basePrice: number }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState({ sku: "", price: basePrice, attributes: "" });

  const add = useMutation({
    mutationFn: async () => {
      let attrs: any = {};
      if (draft.attributes.trim()) {
        try { attrs = JSON.parse(draft.attributes); } catch { throw new Error("Invalid JSON for attributes"); }
      }
      const { error } = await supabase.from("product_variants").insert({ product_id: productId, sku: draft.sku, price: draft.price, attributes: attrs });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(t("common.success")); setDraft({ sku: "", price: basePrice, attributes: "" }); qc.invalidateQueries({ queryKey: ["product-variants", productId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("product_variants").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success(t("common.success")); qc.invalidateQueries({ queryKey: ["product-variants", productId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card><CardContent className="p-4">
      <div className="mb-3 grid gap-2 md:grid-cols-4">
        <Input placeholder={t("products.sku")} value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} />
        <Input type="number" step="0.01" placeholder={t("common.price")} value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
        <Input placeholder='Attributes JSON {"size":"50ml"}' value={draft.attributes} onChange={(e) => setDraft({ ...draft, attributes: e.target.value })} />
        <Button onClick={() => add.mutate()} disabled={!draft.sku || add.isPending}><Plus className="me-1 h-4 w-4" /> {t("common.add")}</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>{t("products.sku")}</TableHead><TableHead>{t("common.price")}</TableHead><TableHead>Attributes</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {variants.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">{t("common.empty")}</TableCell></TableRow>}
          {variants.map((v) => (
            <TableRow key={v.id}>
              <TableCell className="font-mono text-xs">{v.sku}</TableCell>
              <TableCell className="font-mono text-xs">{v.price ?? "—"}</TableCell>
              <TableCell className="font-mono text-xs">{JSON.stringify(v.attributes)}</TableCell>
              <TableCell><Button size="sm" variant="ghost" onClick={() => del.mutate(v.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}

function ImagesTab({ productId, images }: { productId: string; images: any[] }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState({ url: "", alt_text: "", is_primary: false });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_images").insert({ product_id: productId, url: draft.url, alt_text: draft.alt_text, is_primary: draft.is_primary });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(t("common.success")); setDraft({ url: "", alt_text: "", is_primary: false }); qc.invalidateQueries({ queryKey: ["product-images", productId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("product_images").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["product-images", productId] }); },
  });

  return (
    <Card><CardContent className="p-4">
      <div className="mb-3 grid gap-2 md:grid-cols-4">
        <Input placeholder="Image URL" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} className="md:col-span-2" />
        <Input placeholder="Alt text" value={draft.alt_text} onChange={(e) => setDraft({ ...draft, alt_text: e.target.value })} />
        <Button onClick={() => add.mutate()} disabled={!draft.url || add.isPending}><Plus className="me-1 h-4 w-4" /> {t("common.add")}</Button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {images.length === 0 && <div className="col-span-full text-center text-sm text-muted-foreground">{t("common.empty")}</div>}
        {images.map((img) => (
          <div key={img.id} className="relative rounded-md border p-2">
            <img src={img.url} alt={img.alt_text ?? ""} className="aspect-square w-full rounded object-cover" />
            <div className="mt-1 flex items-center justify-between">
              {img.is_primary && <Badge variant="default" className="text-xs">Primary</Badge>}
              <Button size="sm" variant="ghost" onClick={() => del.mutate(img.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </div>
        ))}
      </div>
    </CardContent></Card>
  );
}