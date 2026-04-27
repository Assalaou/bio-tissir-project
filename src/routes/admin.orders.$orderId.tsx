import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/admin/orders/$orderId")({
  component: OrderDetail,
});

function OrderDetail() {
  const { orderId } = Route.useParams();
  const { t, dir } = useI18n();

  const order = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
      return data;
    },
  });
  const items = useQuery({
    queryKey: ["order-items", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("order_items").select("*").eq("order_id", orderId);
      return data ?? [];
    },
  });
  const history = useQuery({
    queryKey: ["order-history", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("order_status_history").select("*").eq("order_id", orderId).order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  if (order.isLoading) return <div className="p-4 text-muted-foreground">{t("common.loading")}</div>;
  if (!order.data) return <div className="p-4">{t("common.empty")}</div>;
  const o = order.data;

  return (
    <div dir={dir}>
      <PageHeader
        title={o.order_number}
        description={`${o.channel} · ${new Date(o.placed_at).toLocaleString()}`}
        actions={<Button asChild variant="outline" size="sm"><Link to="/admin/orders"><ArrowLeft className="me-1 h-4 w-4" /> {t("orders.title")}</Link></Button>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{t("orders.items")}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>{t("orders.items")}</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">{t("common.total")}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {items.data?.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-mono text-xs">{it.sku}</TableCell>
                      <TableCell>{it.product_name}{it.variant_label ? ` · ${it.variant_label}` : ""}</TableCell>
                      <TableCell className="text-right">{it.quantity}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{Number(it.line_total).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{Number(o.subtotal).toFixed(2)} {o.currency}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span>{Number(o.shipping_total).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Tax</span><span>{Number(o.tax_total).toFixed(2)}</span></div>
                <div className="flex justify-between font-bold"><span>{t("common.total")}</span><span>{Number(o.grand_total).toFixed(2)} {o.currency}</span></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">{t("orders.timeline")}</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {history.data?.map((h) => (
                  <li key={h.id} className="flex items-center gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
                    <Badge variant="outline">{h.from_status ?? "—"} → {h.to_status}</Badge>
                  </li>
                ))}
                {history.data?.length === 0 && <div className="text-sm text-muted-foreground">{t("common.empty")}</div>}
              </ol>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base">{t("common.status")}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><div><Badge>{o.status}</Badge></div><div className="text-xs text-muted-foreground">Payment: {o.payment_status} · {o.payment_method}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">{t("orders.address")}</CardTitle></CardHeader><CardContent className="space-y-0.5 text-sm"><div className="font-medium">{o.shipping_full_name}</div><div>{o.shipping_phone}</div><div>{o.shipping_address_line1}</div>{o.shipping_address_line2 && <div>{o.shipping_address_line2}</div>}<div>{o.shipping_city} {o.shipping_postal_code}</div><div className="text-xs text-muted-foreground">{o.shipping_region} · {o.shipping_country}</div></CardContent></Card>
        </div>
      </div>
    </div>
  );
}