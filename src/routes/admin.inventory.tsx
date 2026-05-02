import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/inventory")({ component: InventoryPage });

type MoveType = "in" | "out" | "transfer_out" | "adjustment";

function InventoryPage() {
  const { t, dir } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filterLoc, setFilterLoc] = useState<string>("all");
  const [filterDepot, setFilterDepot] = useState<string>("all");

  const locations = useQuery({ queryKey: ["loc-list"], queryFn: async () => (await supabase.from("locations").select("id, name, code").order("name")).data ?? [] });
  const depots = useQuery({ queryKey: ["depot-list"], queryFn: async () => (await supabase.from("depots").select("id, name, type").eq("status", "active").order("name")).data ?? [] });
  const variantsQ = useQuery({
    queryKey: ["variant-list"],
    queryFn: async () => {
      const { data: v } = await supabase.from("product_variants").select("id, sku, product_id");
      const ids = (v ?? []).map((x) => x.product_id);
      const { data: tr } = ids.length ? await supabase.from("product_translations").select("product_id, locale, name").in("product_id", ids).eq("locale", "fr") : { data: [] };
      return (v ?? []).map((vv) => ({ ...vv, product_name: tr?.find((x: any) => x.product_id === vv.product_id)?.name ?? vv.sku }));
    },
  });

  const inventory = useQuery({
    queryKey: ["inventory", filterLoc],
    queryFn: async () => {
      let q = supabase.from("inventory").select("*");
      if (filterLoc !== "all") q = q.eq("location_id", filterLoc);
      const { data } = await q;
      return data ?? [];
    },
  });

  const movements = useQuery({
    queryKey: ["movements", filterDepot, filterLoc],
    queryFn: async () => {
      let q = supabase.from("inventory_movements").select("*").order("created_at", { ascending: false }).limit(100);
      if (filterDepot !== "all") q = q.eq("source_depot_id", filterDepot);
      if (filterLoc !== "all") q = q.eq("location_id", filterLoc);
      const { data } = await q;
      return data ?? [];
    },
  });

  const batches = useQuery({
    queryKey: ["batches"],
    queryFn: async () => (await supabase.from("batches").select("*").order("expires_at", { ascending: true, nullsFirst: false })).data ?? [],
  });

  const lookups = useMemo(() => ({
    loc: (id: string) => locations.data?.find((l: any) => l.id === id)?.name ?? id?.slice(0, 8),
    depot: (id: string | null) => depots.data?.find((d: any) => d.id === id)?.name ?? "—",
    variant: (id: string | null) => variantsQ.data?.find((v: any) => v.id === id)?.sku ?? id?.slice(0, 8),
  }), [locations.data, depots.data, variantsQ.data]);

  return (
    <div dir={dir}>
      <PageHeader title={t("nav.inventory")} actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="me-1 h-4 w-4" /> {t("inv.movements.new")}</Button>} />
      <div className="mb-3 flex flex-wrap gap-2">
        <Select value={filterLoc} onValueChange={setFilterLoc}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder={t("nav.locations")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")} {t("nav.locations")}</SelectItem>
            {locations.data?.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDepot} onValueChange={setFilterDepot}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder={t("nav.depots")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")} {t("nav.depots")}</SelectItem>
            {depots.data?.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">{t("inventory.byLocation")}</TabsTrigger>
          <TabsTrigger value="movements">{t("inventory.movements")}</TabsTrigger>
          <TabsTrigger value="low">{t("inventory.lowStock")}</TabsTrigger>
          <TabsTrigger value="batches">{t("inventory.batches")}</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <Card><CardContent className="p-4">
            <Table>
              <TableHeader><TableRow><TableHead>{t("nav.locations")}</TableHead><TableHead>{t("nav.variants")}</TableHead><TableHead className="text-right">{t("inventory.quantity")}</TableHead><TableHead className="text-right">{t("inventory.reserved")}</TableHead><TableHead className="text-right">{t("inventory.available")}</TableHead></TableRow></TableHeader>
              <TableBody>
                {inventory.data?.map((i: any) => (
                  <TableRow key={i.id}>
                    <TableCell>{lookups.loc(i.location_id)}</TableCell>
                    <TableCell className="font-mono text-xs">{lookups.variant(i.variant_id)}</TableCell>
                    <TableCell className="text-right font-mono">{i.quantity}</TableCell>
                    <TableCell className="text-right font-mono">{i.reserved}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{i.quantity - i.reserved}</TableCell>
                  </TableRow>
                ))}
                {inventory.data?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{t("common.empty")}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card><CardContent className="p-4">
            <Table>
              <TableHeader><TableRow><TableHead>{t("common.date")}</TableHead><TableHead>{t("common.type")}</TableHead><TableHead>{t("nav.variants")}</TableHead><TableHead>{t("nav.locations")}</TableHead><TableHead>{t("nav.depots")}</TableHead><TableHead className="text-right">{t("common.quantity")}</TableHead><TableHead>{t("common.notes")}</TableHead></TableRow></TableHeader>
              <TableBody>
                {movements.data?.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{m.type}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{lookups.variant(m.variant_id)}</TableCell>
                    <TableCell>{lookups.loc(m.location_id)}</TableCell>
                    <TableCell>{lookups.depot(m.source_depot_id)}</TableCell>
                    <TableCell className="text-right font-mono">{m.quantity}</TableCell>
                    <TableCell className="text-xs">{m.reason ?? ""}</TableCell>
                  </TableRow>
                ))}
                {movements.data?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">{t("common.empty")}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="low">
          <Card><CardContent className="p-4">
            <Table>
              <TableHeader><TableRow><TableHead></TableHead><TableHead>{t("nav.locations")}</TableHead><TableHead>{t("nav.variants")}</TableHead><TableHead className="text-right">{t("inventory.available")}</TableHead><TableHead className="text-right">Reorder</TableHead></TableRow></TableHeader>
              <TableBody>
                {(inventory.data ?? []).filter((i: any) => i.quantity - i.reserved <= (i.reorder_point ?? 0)).map((i: any) => (
                  <TableRow key={i.id}>
                    <TableCell><AlertTriangle className="h-4 w-4 text-yellow-600" /></TableCell>
                    <TableCell>{lookups.loc(i.location_id)}</TableCell>
                    <TableCell className="font-mono text-xs">{lookups.variant(i.variant_id)}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{i.quantity - i.reserved}</TableCell>
                    <TableCell className="text-right font-mono">{i.reorder_point}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="batches">
          <Card><CardContent className="p-4">
            <Table>
              <TableHeader><TableRow><TableHead>Lot</TableHead><TableHead>{t("nav.variants")}</TableHead><TableHead>{t("nav.depots")}</TableHead><TableHead>{t("nav.locations")}</TableHead><TableHead className="text-right">{t("common.quantity")}</TableHead><TableHead>Manuf.</TableHead><TableHead>Expires</TableHead></TableRow></TableHeader>
              <TableBody>
                {batches.data?.map((b: any) => {
                  const expired = b.expires_at && new Date(b.expires_at) < new Date();
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{b.lot_number}</TableCell>
                      <TableCell className="font-mono text-xs">{lookups.variant(b.variant_id)}</TableCell>
                      <TableCell>{lookups.depot(b.depot_id)}</TableCell>
                      <TableCell>{lookups.loc(b.location_id)}</TableCell>
                      <TableCell className="text-right font-mono">{b.quantity}</TableCell>
                      <TableCell className="text-xs">{b.manufactured_at ?? "—"}</TableCell>
                      <TableCell className="text-xs"><Badge variant={expired ? "destructive" : "outline"}>{b.expires_at ?? "—"}</Badge></TableCell>
                    </TableRow>
                  );
                })}
                {batches.data?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">{t("common.empty")}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <NewMovementDialog open={open} onOpenChange={setOpen}
        locations={locations.data ?? []} depots={depots.data ?? []} variants={variantsQ.data ?? []}
        onDone={() => { qc.invalidateQueries({ queryKey: ["inventory"] }); qc.invalidateQueries({ queryKey: ["movements"] }); qc.invalidateQueries({ queryKey: ["batches"] }); }} />
    </div>
  );
}

function NewMovementDialog({ open, onOpenChange, locations, depots, variants, onDone }: any) {
  const { t, dir } = useI18n();
  const [type, setType] = useState<MoveType>("in");
  const [form, setForm] = useState<any>({ variant_id: "", location_id: "", source_depot_id: "", quantity: 1, reason: "" });

  const submit = useMutation({
    mutationFn: async () => {
      if (!form.variant_id || !form.location_id || !form.quantity) throw new Error(t("common.required"));
      if (type === "in" && !form.source_depot_id) throw new Error(t("inv.requireDepot"));
      const payload: any = { variant_id: form.variant_id, location_id: form.location_id, type, quantity: form.quantity, reason: form.reason };
      if (form.source_depot_id) payload.source_depot_id = form.source_depot_id;
      const { error } = await supabase.from("inventory_movements").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(t("common.success")); onOpenChange(false); setForm({ variant_id: "", location_id: "", source_depot_id: "", quantity: 1, reason: "" }); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={dir}>
        <DialogHeader><DialogTitle>{t("inv.movements.new")}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>{t("common.type")}</Label>
            <Select value={type} onValueChange={(v) => setType(v as MoveType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in">{t("inv.movements.in")}</SelectItem>
                <SelectItem value="out">{t("inv.movements.out")}</SelectItem>
                <SelectItem value="transfer_out">{t("inv.movements.transfer")}</SelectItem>
                <SelectItem value="adjustment">{t("inv.movements.adjustment")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>{t("nav.variants")} *</Label>
            <Select value={form.variant_id} onValueChange={(v) => setForm({ ...form, variant_id: v })}>
              <SelectTrigger><SelectValue placeholder={t("common.search")} /></SelectTrigger>
              <SelectContent>{variants.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.product_name} · {v.sku}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>{t("nav.locations")} *</Label>
            <Select value={form.location_id} onValueChange={(v) => setForm({ ...form, location_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{locations.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {type === "in" && <div><Label>{t("nav.depots")} * <span className="text-xs text-muted-foreground">({t("inv.requireDepot")})</span></Label>
            <Select value={form.source_depot_id} onValueChange={(v) => setForm({ ...form, source_depot_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{depots.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>}
          <div><Label>{t("common.quantity")} *</Label><Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
          <div><Label>{t("common.notes")}</Label><Textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}