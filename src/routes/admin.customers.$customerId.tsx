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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/customers/$customerId")({ component: CustomerDetail });

function CustomerDetail() {
  const { customerId } = Route.useParams();
  const { t, dir } = useI18n();
  const qc = useQueryClient();

  const cust = useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => (await supabase.from("customers").select("*").eq("id", customerId).maybeSingle()).data,
  });
  const addresses = useQuery({
    queryKey: ["customer-addr", customerId],
    queryFn: async () => (await supabase.from("customer_addresses").select("*").eq("customer_id", customerId)).data ?? [],
  });
  const orders = useQuery({
    queryKey: ["customer-orders", customerId],
    queryFn: async () => (await supabase.from("orders").select("id, order_number, status, grand_total, currency, placed_at").eq("customer_id", customerId).order("placed_at", { ascending: false }).limit(20)).data ?? [],
  });

  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (cust.data && !form) setForm(cust.data); }, [cust.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("customers").update({
        full_name: form.full_name, phone: form.phone, email: form.email, customer_type: form.customer_type,
        preferred_locale: form.preferred_locale, segment: form.segment, notes: form.notes, blocked: form.blocked, blocked_reason: form.blocked_reason,
      }).eq("id", customerId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(t("common.success")); qc.invalidateQueries({ queryKey: ["customer", customerId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (cust.isLoading || !form) return <div className="p-4 text-muted-foreground">{t("common.loading")}</div>;
  if (!cust.data) return <div className="p-4">{t("common.empty")}</div>;

  return (
    <div dir={dir}>
      <PageHeader title={form.full_name} description={form.phone ?? form.email ?? ""}
        actions={<Button asChild variant="outline" size="sm"><Link to="/admin/customers"><ArrowLeft className="me-1 h-4 w-4" /> {t("customers.title")}</Link></Button>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card><CardHeader><CardTitle className="text-base">{t("common.edit")}</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2"><Label>{t("common.name")}</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>{t("common.phone")}</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>{t("common.email")}</Label><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>{t("common.type")}</Label>
                <Select value={form.customer_type} onValueChange={(v) => setForm({ ...form, customer_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["retail", "wholesale", "franchise"].map((c) => <SelectItem key={c} value={c}>{t(`customers.type.${c}`)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t("customers.preferredLocale")}</Label>
                <Select value={form.preferred_locale} onValueChange={(v) => setForm({ ...form, preferred_locale: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["fr", "ar", "en"].map((l) => <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2"><Label>{t("common.notes")}</Label><Textarea rows={3} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.blocked} onCheckedChange={(v) => setForm({ ...form, blocked: v })} /><Label>Blocked</Label></div>
              {form.blocked && <div><Label>Reason</Label><Input value={form.blocked_reason ?? ""} onChange={(e) => setForm({ ...form, blocked_reason: e.target.value })} /></div>}
              <div className="md:col-span-2"><Button onClick={() => save.mutate()} disabled={save.isPending}>{t("common.save")}</Button></div>
            </CardContent>
          </Card>

          <Card><CardHeader><CardTitle className="text-base">{t("nav.orders")}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>{t("orders.number")}</TableHead><TableHead>{t("common.status")}</TableHead><TableHead className="text-right">{t("common.total")}</TableHead><TableHead>{t("common.date")}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {orders.data?.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell><Link to="/admin/orders/$orderId" params={{ orderId: o.id }} className="font-medium text-primary hover:underline">{o.order_number}</Link></TableCell>
                      <TableCell><Badge variant="outline">{o.status}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-xs">{Number(o.grand_total).toFixed(2)} {o.currency}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(o.placed_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {orders.data?.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">{t("common.empty")}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base">Stats</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>{t("customers.reliability")}</span><Badge>{cust.data.reliability_score}</Badge></div>
              <div className="flex justify-between"><span>{t("customers.totalOrders")}</span><span className="font-mono">{cust.data.total_orders}</span></div>
              <div className="flex justify-between"><span>{t("customers.totalSpent")}</span><span className="font-mono">{Number(cust.data.total_spent).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Cancelled</span><span className="font-mono">{cust.data.cancelled_orders}</span></div>
              <div className="flex justify-between"><span>Returned</span><span className="font-mono">{cust.data.returned_orders}</span></div>
              <div className="flex justify-between"><span>{t("customers.lastOrder")}</span><span className="text-xs">{cust.data.last_order_at ? new Date(cust.data.last_order_at).toLocaleDateString() : "—"}</span></div>
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="text-base">{t("orders.address")}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {addresses.data?.length === 0 && <div className="text-muted-foreground">{t("common.empty")}</div>}
              {addresses.data?.map((a: any) => (
                <div key={a.id} className="rounded border p-2">
                  <div className="font-medium">{a.full_name ?? cust.data.full_name}</div>
                  <div>{a.address_line1}</div>
                  <div>{a.city} {a.postal_code}</div>
                  <div className="text-xs text-muted-foreground">{a.region} · {a.country}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}