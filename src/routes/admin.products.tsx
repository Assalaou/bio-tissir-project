import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products")({ component: ProductsList });

const STATUSES = ["draft", "active", "archived"] as const;

function ProductsList() {
  const { t, dir, locale } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ sku: "", slug: "", base_price: 0, name_fr: "", name_ar: "" });

  const list = useQuery({
    queryKey: ["products-admin", search, statusFilter],
    queryFn: async () => {
      let q = supabase.from("products").select("id, sku, slug, status, base_price, avg_rating, review_count, is_featured, created_at").order("created_at", { ascending: false }).limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
      if (search.trim()) q = q.or(`sku.ilike.%${search}%,slug.ilike.%${search}%`);
      const { data } = await q;
      const ids = (data ?? []).map((p) => p.id);
      const { data: tr } = ids.length ? await supabase.from("product_translations").select("product_id, locale, name").in("product_id", ids) : { data: [] };
      return (data ?? []).map((p) => ({
        ...p,
        name: tr?.find((x: any) => x.product_id === p.id && x.locale === locale)?.name
          ?? tr?.find((x: any) => x.product_id === p.id && x.locale === "fr")?.name
          ?? p.slug,
      }));
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("products").insert({ sku: draft.sku, slug: draft.slug, base_price: draft.base_price, status: "draft" }).select("id").single();
      if (error) throw error;
      const productId = data!.id;
      const trs: any[] = [];
      if (draft.name_fr) trs.push({ product_id: productId, locale: "fr", name: draft.name_fr });
      if (draft.name_ar) trs.push({ product_id: productId, locale: "ar", name: draft.name_ar });
      if (trs.length) await supabase.from("product_translations").insert(trs);
      return productId;
    },
    onSuccess: () => { toast.success(t("common.success")); setOpen(false); setDraft({ sku: "", slug: "", base_price: 0, name_fr: "", name_ar: "" }); qc.invalidateQueries({ queryKey: ["products-admin"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div dir={dir}>
      <PageHeader title={t("products.title")} actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="me-1 h-4 w-4" /> {t("products.new")}</Button>} />
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <Input placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t("products.sku")}</TableHead>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("products.basePrice")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {list.isLoading ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{t("common.loading")}</TableCell></TableRow> :
                list.data?.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{t("common.empty")}</TableCell></TableRow> :
                list.data!.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell><Link to="/admin/products/$productId" params={{ productId: p.id }} className="font-medium text-primary hover:underline">{p.name}</Link></TableCell>
                    <TableCell className="font-mono text-xs">{Number(p.base_price).toFixed(2)}</TableCell>
                    <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                    <TableCell><Button asChild size="sm" variant="ghost"><Link to="/admin/products/$productId" params={{ productId: p.id }}>{t("common.edit")}</Link></Button></TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir={dir}>
          <DialogHeader><DialogTitle>{t("products.new")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>{t("products.sku")} *</Label><Input value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} /></div>
            <div><Label>{t("products.slug")} *</Label><Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} /></div>
            <div><Label>{t("products.basePrice")}</Label><Input type="number" step="0.01" value={draft.base_price} onChange={(e) => setDraft({ ...draft, base_price: Number(e.target.value) })} /></div>
            <div><Label>{t("common.name")} (FR)</Label><Input value={draft.name_fr} onChange={(e) => setDraft({ ...draft, name_fr: e.target.value })} /></div>
            <div><Label>{t("common.name")} (AR)</Label><Input dir="rtl" value={draft.name_ar} onChange={(e) => setDraft({ ...draft, name_ar: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !draft.sku || !draft.slug}>{t("common.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}