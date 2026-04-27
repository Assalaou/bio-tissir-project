import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, PhoneCall, CheckCircle2, Truck, XCircle, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { t, dir } = useI18n();

  const kpi = useQuery({
    queryKey: ["admin-kpi"],
    queryFn: async () => {
      const fields: Array<"pending" | "awaiting_confirmation" | "confirmed" | "delivered" | "cancelled"> =
        ["pending", "awaiting_confirmation", "confirmed", "delivered", "cancelled"];
      const counts: Record<string, number> = {};
      for (const status of fields) {
        const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", status);
        counts[status] = count ?? 0;
      }
      const { count: total } = await supabase.from("orders").select("id", { count: "exact", head: true });
      counts.total = total ?? 0;
      return counts;
    },
  });

  const recent = useQuery({
    queryKey: ["admin-recent-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, status, grand_total, currency, channel, placed_at, shipping_full_name")
        .order("placed_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const lowStock = useQuery({
    queryKey: ["admin-low-stock"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inventory")
        .select("id, quantity, reserved, reorder_point, variant_id, location_id")
        .order("quantity", { ascending: true })
        .limit(20);
      return (data ?? []).filter((r) => r.quantity - r.reserved <= (r.reorder_point ?? 0)).slice(0, 10);
    },
  });

  const cards = [
    { key: "total", label: t("kpi.totalOrders"), icon: ShoppingCart, value: kpi.data?.total ?? 0 },
    { key: "toConfirm", label: t("kpi.toConfirm"), icon: PhoneCall, value: (kpi.data?.pending ?? 0) + (kpi.data?.awaiting_confirmation ?? 0) },
    { key: "confirmed", label: t("kpi.confirmed"), icon: CheckCircle2, value: kpi.data?.confirmed ?? 0 },
    { key: "delivered", label: t("kpi.delivered"), icon: Truck, value: kpi.data?.delivered ?? 0 },
    { key: "cancelled", label: t("kpi.cancelled"), icon: XCircle, value: kpi.data?.cancelled ?? 0 },
    { key: "lowStock", label: t("kpi.lowStock"), icon: AlertTriangle, value: lowStock.data?.length ?? 0 },
  ];

  return (
    <div dir={dir}>
      <PageHeader title={t("nav.dashboard")} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.key}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">{c.label}</div>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-2xl font-bold">{c.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{t("kpi.recentOrders")}</CardTitle></CardHeader>
          <CardContent>
            {recent.isLoading ? <div className="text-sm text-muted-foreground">{t("common.loading")}</div> :
              recent.data && recent.data.length > 0 ? (
                <ul className="divide-y">
                  {recent.data.map((o) => (
                    <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <div className="font-medium">{o.order_number}</div>
                        <div className="text-xs text-muted-foreground">{o.shipping_full_name ?? "—"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{o.status}</Badge>
                        <span className="font-mono text-xs">{Number(o.grand_total).toFixed(2)} {o.currency}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <div className="text-sm text-muted-foreground">{t("common.empty")}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t("kpi.lowStock")}</CardTitle></CardHeader>
          <CardContent>
            {lowStock.isLoading ? <div className="text-sm text-muted-foreground">{t("common.loading")}</div> :
              lowStock.data && lowStock.data.length > 0 ? (
                <ul className="divide-y">
                  {lowStock.data.map((r) => (
                    <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                      <div className="font-mono text-xs">{r.variant_id?.slice(0, 8)}</div>
                      <div className="text-xs">{t("inventory.available")}: <span className="font-bold">{r.quantity - r.reserved}</span></div>
                    </li>
                  ))}
                </ul>
              ) : <div className="text-sm text-muted-foreground">{t("common.empty")}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}