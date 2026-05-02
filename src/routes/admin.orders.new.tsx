import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProductPicker, PickedItem } from "@/components/admin/ProductPicker";

export const Route = createFileRoute("/admin/orders/new")({ component: ManualOrderCapture });

const CHANNELS = ["whatsapp", "phone", "walk_in", "instagram", "facebook", "web"] as const;

interface LineItem {
  variant_id: string;
  sku: string;
  product_name: string;
  variant_label: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
}

function ManualOrderCapture() {
  const { t, dir } = useI18n();
  const navigate = useNavigate();

  const [channel, setChannel] = useState<string>("whatsapp");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ full_name: "", phone: "", customer_type: "retail", preferred_locale: "fr" });
  const [items, setItems] = useState<LineItem[]>([]);
  const [shippingTotal, setShippingTotal] = useState(0);
  const [discountTotal, setDiscountTotal] = useState(0);
  const [shipping, setShipping] = useState({ full_name: "", phone: "", address_line1: "", city: "", region: "", postal_code: "", notes: "" });
  const [aiData, setAiData] = useState({ original_message_text: "", source_reference: "" });
  const [paidNow, setPaidNow] = useState(false);

  const customers = useQuery({
    queryKey: ["cust-search", customerSearch],
    queryFn: async () => {
      let q = supabase.from("customers").select("id, full_name, phone, customer_type").order("created_at", { ascending: false }).limit(20);
      if (customerSearch.trim()) q = q.or(`full_name.ilike.%${customerSearch}%,phone.ilike.%${customerSearch}%`);
      return (await q).data ?? [];
    },
  });
  const selectedCustomer = useMemo(
    () => customers.data?.find((c) => c.id === customerId),
    [customers.data, customerId]
  );
  const customerType = creatingNew ? newCustomer.customer_type : selectedCustomer?.customer_type;

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.unit_price * i.quantity, 0), [items]);
  const grandTotal = subtotal + shippingTotal - discountTotal;

  const addItem = (p: PickedItem) => {
    setItems((s) => {
      const idx = s.findIndex((x) => x.variant_id === p.variant_id);
      if (idx >= 0) return s.map((x, j) => j === idx ? { ...x, quantity: x.quantity + 1 } : x);
      return [...s, { variant_id: p.variant_id, sku: p.sku, product_name: p.product_name, variant_label: p.variant_label, image_url: p.image_url, unit_price: p.unit_price, quantity: 1 }];
    });
  };

  const submit = useMutation({
    mutationFn: async () => {
      let cid = customerId;
      if (creatingNew) {
        if (!newCustomer.full_name) throw new Error(t("common.required"));
        const { data, error } = await supabase.from("customers").insert({ ...newCustomer, acquisition_channel: channel as any } as any).select("id").single();
        if (error) throw error;
        cid = data!.id;
      }
      if (!cid) throw new Error("Customer required");
      if (items.length === 0) throw new Error("Add at least 1 item");

      const isWalkIn = channel === "walk_in";
      const initialStatus = isWalkIn && paidNow ? "confirmed" : "pending";

      const { data: order, error: oerr } = await supabase.from("orders").insert({
        customer_id: cid,
        channel: channel as any,
        status: initialStatus as any,
        payment_method: paidNow ? "cash" as any : "cod",
        payment_status: paidNow ? "paid" as any : "unpaid",
        subtotal, discount_total: discountTotal, shipping_total: shippingTotal, grand_total: grandTotal,
        shipping_full_name: shipping.full_name || newCustomer.full_name || null,
        shipping_phone: shipping.phone || newCustomer.phone || null,
        shipping_address_line1: shipping.address_line1 || null,
        shipping_city: shipping.city || null,
        shipping_region: shipping.region || null,
        shipping_postal_code: shipping.postal_code || null,
        notes: shipping.notes || null,
        original_message_text: aiData.original_message_text || null,
        source_reference: aiData.source_reference || null,
        needs_human_review: false,
      }).select("id, order_number").single();
      if (oerr) throw oerr;

      const itemsPayload = items.map((i) => ({
        order_id: order!.id, variant_id: i.variant_id, sku: i.sku, product_name: i.product_name,
        variant_label: i.variant_label,
        unit_price: i.unit_price, quantity: i.quantity, line_total: i.unit_price * i.quantity,
      }));
      const { error: ierr } = await supabase.from("order_items").insert(itemsPayload as any);
      if (ierr) throw ierr;
      return order!;
    },
    onSuccess: (order) => {
      toast.success(`${order.order_number} ✓`);
      navigate({ to: "/admin/orders/$orderId", params: { orderId: order.id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div dir={dir}>
      <PageHeader title={t("newOrder.title")}
        actions={<Button asChild variant="outline" size="sm"><Link to="/admin/orders"><ArrowLeft className="me-1 h-4 w-4" /> {t("orders.title")}</Link></Button>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{t("newOrder.channel")}</CardTitle></CardHeader>
            <CardContent>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              {(channel === "whatsapp" || channel === "instagram" || channel === "facebook" || channel === "phone") && (
                <div className="mt-3 space-y-2">
                  <Label>{t("newOrder.originalMessage")}</Label>
                  <Textarea rows={3} value={aiData.original_message_text} onChange={(e) => setAiData({ ...aiData, original_message_text: e.target.value })} placeholder="Paste message / call summary…" />
                  <Input placeholder="Source reference (msg id / call id)" value={aiData.source_reference} onChange={(e) => setAiData({ ...aiData, source_reference: e.target.value })} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">{t("newOrder.selectCustomer")}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setCreatingNew((v) => !v)}>{creatingNew ? t("common.cancel") : t("newOrder.createCustomer")}</Button>
            </CardHeader>
            <CardContent>
              {creatingNew ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="md:col-span-2"><Label>{t("common.name")} *</Label><Input value={newCustomer.full_name} onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })} /></div>
                  <div><Label>{t("common.phone")}</Label><Input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} /></div>
                  <div><Label>{t("common.type")}</Label>
                    <Select value={newCustomer.customer_type} onValueChange={(v) => setNewCustomer({ ...newCustomer, customer_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["retail", "wholesale", "franchise"].map((c) => <SelectItem key={c} value={c}>{t(`customers.type.${c}`)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div>
                  <Input placeholder={t("common.search")} value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                  <div className="mt-2 max-h-60 overflow-y-auto">
                    {customers.data?.map((c) => (
                      <button key={c.id} onClick={() => setCustomerId(c.id)} className={`w-full rounded p-2 text-start text-sm hover:bg-muted ${customerId === c.id ? "bg-muted" : ""}`}>
                        <div className="font-medium">{c.full_name}</div>
                        <div className="text-xs text-muted-foreground">{c.phone ?? "—"} · {c.customer_type}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{t("newOrder.products")}</CardTitle></CardHeader>
            <CardContent>
              <ProductPicker customerType={customerType} onPick={addItem} />
              <Table className="mt-3">
                <TableHeader><TableRow><TableHead className="w-12"></TableHead><TableHead>{t("common.name")}</TableHead><TableHead>{t("common.price")}</TableHead><TableHead>{t("common.quantity")}</TableHead><TableHead className="text-right">{t("common.total")}</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {items.map((i, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="h-10 w-10 overflow-hidden rounded bg-muted">
                          {i.image_url ? <img src={i.image_url} alt="" className="h-full w-full object-cover" /> : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{i.product_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{i.sku}{i.variant_label ? ` · ${i.variant_label}` : ""}</div>
                      </TableCell>
                      <TableCell><Input type="number" step="0.01" value={i.unit_price} onChange={(e) => setItems((s) => s.map((x, j) => j === idx ? { ...x, unit_price: Number(e.target.value) } : x))} className="w-24" /></TableCell>
                      <TableCell><Input type="number" min={1} value={i.quantity} onChange={(e) => setItems((s) => s.map((x, j) => j === idx ? { ...x, quantity: Number(e.target.value) } : x))} className="w-20" /></TableCell>
                      <TableCell className="text-right font-mono">{(i.unit_price * i.quantity).toFixed(2)}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => setItems((s) => s.filter((_, j) => j !== idx))}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{t("common.empty")}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {channel !== "walk_in" && <Card>
            <CardHeader><CardTitle className="text-base">{t("orders.address")}</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div><Label>{t("common.name")}</Label><Input value={shipping.full_name} onChange={(e) => setShipping({ ...shipping, full_name: e.target.value })} /></div>
              <div><Label>{t("common.phone")}</Label><Input value={shipping.phone} onChange={(e) => setShipping({ ...shipping, phone: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>{t("common.address")}</Label><Input value={shipping.address_line1} onChange={(e) => setShipping({ ...shipping, address_line1: e.target.value })} /></div>
              <div><Label>{t("common.city")}</Label><Input value={shipping.city} onChange={(e) => setShipping({ ...shipping, city: e.target.value })} /></div>
              <div><Label>Region</Label><Input value={shipping.region} onChange={(e) => setShipping({ ...shipping, region: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>{t("common.notes")}</Label><Textarea rows={2} value={shipping.notes} onChange={(e) => setShipping({ ...shipping, notes: e.target.value })} /></div>
            </CardContent>
          </Card>}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{t("common.total")}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>{t("newOrder.subtotal")}</span><span className="font-mono">{subtotal.toFixed(2)}</span></div>
              <div className="flex items-center justify-between gap-2"><span>{t("newOrder.shipping")}</span>
                <Input type="number" step="0.01" value={shippingTotal} onChange={(e) => setShippingTotal(Number(e.target.value))} className="w-24" />
              </div>
              <div className="flex items-center justify-between gap-2"><span>{t("newOrder.discount")}</span>
                <Input type="number" step="0.01" value={discountTotal} onChange={(e) => setDiscountTotal(Number(e.target.value))} className="w-24" />
              </div>
              <div className="flex justify-between border-t pt-2 font-bold"><span>{t("common.total")}</span><span className="font-mono">{grandTotal.toFixed(2)} MAD</span></div>

              {channel === "walk_in" && (
                <label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={paidNow} onChange={(e) => setPaidNow(e.target.checked)} /> Paiement immédiat (caisse)</label>
              )}

              <Button className="mt-3 w-full" disabled={submit.isPending || items.length === 0 || (!customerId && !creatingNew)} onClick={() => submit.mutate()}>
                {t("newOrder.create")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}