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

export const Route = createFileRoute("/admin/customers")({ component: CustomersList });

const TYPES = ["retail", "wholesale", "franchise"] as const;

function CustomersList() {
  const { t, dir } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeF, setTypeF] = useState("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ full_name: "", phone: "", email: "", customer_type: "retail", preferred_locale: "fr", acquisition_channel: "web" });

  const list = useQuery({
    queryKey: ["customers-admin", search, typeF],
    queryFn: async () => {
      let q = supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(200);
      if (typeF !== "all") q = q.eq("customer_type", typeF as any);
      if (search.trim()) q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      return (await q).data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("customers").insert(draft); if (error) throw error; },
    onSuccess: () => { toast.success(t("common.success")); setOpen(false); setDraft({ full_name: "", phone: "", email: "", customer_type: "retail", preferred_locale: "fr", acquisition_channel: "web" }); qc.invalidateQueries({ queryKey: ["customers-admin"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div dir={dir}>
      <PageHeader title={t("customers.title")} actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="me-1 h-4 w-4" /> {t("customers.new")}</Button>} />
      <Card><CardContent className="p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          <Input placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={typeF} onValueChange={setTypeF}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {TYPES.map((ty) => <SelectItem key={ty} value={ty}>{t(`customers.type.${ty}`)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>{t("common.name")}</TableHead>
            <TableHead>{t("common.phone")}</TableHead>
            <TableHead>{t("common.type")}</TableHead>
            <TableHead>{t("customers.reliability")}</TableHead>
            <TableHead className="text-right">{t("customers.totalOrders")}</TableHead>
            <TableHead className="text-right">{t("customers.totalSpent")}</TableHead>
            <TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {list.data?.map((c) => (
              <TableRow key={c.id}>
                <TableCell><Link to="/admin/customers/$customerId" params={{ customerId: c.id }} className="font-medium text-primary hover:underline">{c.full_name}</Link></TableCell>
                <TableCell>{c.phone ?? "—"}</TableCell>
                <TableCell>{t(`customers.type.${c.customer_type}`)}</TableCell>
                <TableCell><Badge variant={c.reliability_score >= 70 ? "default" : c.reliability_score >= 40 ? "secondary" : "destructive"}>{c.reliability_score}</Badge></TableCell>
                <TableCell className="text-right font-mono">{c.total_orders}</TableCell>
                <TableCell className="text-right font-mono">{Number(c.total_spent).toFixed(2)}</TableCell>
                <TableCell><Button asChild size="sm" variant="ghost"><Link to="/admin/customers/$customerId" params={{ customerId: c.id }}>{t("common.edit")}</Link></Button></TableCell>
              </TableRow>
            ))}
            {list.data?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">{t("common.empty")}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir={dir}>
          <DialogHeader><DialogTitle>{t("customers.new")}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2"><Label>{t("common.name")} *</Label><Input value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} /></div>
            <div><Label>{t("common.phone")}</Label><Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
            <div><Label>{t("common.email")}</Label><Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
            <div><Label>{t("common.type")}</Label>
              <Select value={draft.customer_type} onValueChange={(v) => setDraft({ ...draft, customer_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((ty) => <SelectItem key={ty} value={ty}>{t(`customers.type.${ty}`)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t("customers.preferredLocale")}</Label>
              <Select value={draft.preferred_locale} onValueChange={(v) => setDraft({ ...draft, preferred_locale: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["fr", "ar", "en"].map((l) => <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !draft.full_name}>{t("common.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}