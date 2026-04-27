import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/admin/orders")({
  component: OrdersList,
});

const STATUSES = [
  "pending",
  "awaiting_confirmation",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

const statusVariant = (s: string): "default" | "secondary" | "outline" | "destructive" => {
  if (["delivered", "confirmed"].includes(s)) return "default";
  if (["cancelled", "returned"].includes(s)) return "destructive";
  if (["pending", "awaiting_confirmation"].includes(s)) return "secondary";
  return "outline";
};

function OrdersList() {
  const { t, dir } = useI18n();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", status, search],
    queryFn: async () => {
      let q = supabase
        .from("orders")
        .select("id, order_number, status, channel, payment_status, grand_total, currency, placed_at, shipping_full_name, shipping_phone")
        .order("placed_at", { ascending: false })
        .limit(100);
      if (status !== "all") q = q.eq("status", status as any);
      if (search.trim()) {
        q = q.or(`order_number.ilike.%${search}%,shipping_full_name.ilike.%${search}%,shipping_phone.ilike.%${search}%`);
      }
      const { data } = await q;
      return data ?? [];
    },
  });

  return (
    <div dir={dir}>
      <PageHeader title={t("orders.title")} />
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <Input
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("orders.number")}</TableHead>
                  <TableHead>{t("orders.customer")}</TableHead>
                  <TableHead>{t("orders.channel")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("orders.payment")}</TableHead>
                  <TableHead className="text-right">{t("common.total")}</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">{t("common.loading")}</TableCell></TableRow>
                ) : (data ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">{t("common.empty")}</TableCell></TableRow>
                ) : (
                  data!.map((o) => (
                    <TableRow key={o.id} className="cursor-pointer">
                      <TableCell>
                        <Link to="/admin/orders/$orderId" params={{ orderId: o.id }} className="font-medium text-primary hover:underline">
                          {o.order_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{o.shipping_full_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{o.shipping_phone ?? ""}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{o.channel}</Badge></TableCell>
                      <TableCell><Badge variant={statusVariant(o.status)}>{o.status}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{o.payment_status}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-xs">{Number(o.grand_total).toFixed(2)} {o.currency}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(o.placed_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}