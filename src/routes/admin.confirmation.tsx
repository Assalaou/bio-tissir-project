import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Phone } from "lucide-react";

export const Route = createFileRoute("/admin/confirmation")({
  component: ConfirmationCenter,
});

function ConfirmationCenter() {
  const { t, dir } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const queue = useQuery({
    queryKey: ["confirmation-queue"],
    queryFn: async () => {
      const { data } = await supabase
        .from("confirmation_calls")
        .select("*")
        .in("status", ["pending", "in_progress", "no_answer", "rescheduled"])
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(50);
      return data ?? [];
    },
  });

  const selected = queue.data?.find((c) => c.id === selectedId) ?? queue.data?.[0];

  const order = useQuery({
    queryKey: ["confirm-order", selected?.order_id],
    enabled: !!selected?.order_id,
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").eq("id", selected!.order_id).maybeSingle();
      return data;
    },
  });

  const items = useQuery({
    queryKey: ["confirm-items", selected?.order_id],
    enabled: !!selected?.order_id,
    queryFn: async () => {
      const { data } = await supabase.from("order_items").select("*").eq("order_id", selected!.order_id);
      return data ?? [];
    },
  });

  const confirmMut = useMutation({
    mutationFn: async (result: "confirmed" | "rejected") => {
      if (!selected) return;
      const patch: any = { status: result, agent_id: user?.id };
      const { error: e1 } = await supabase.from("confirmation_calls").update(patch).eq("id", selected.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("call_logs").insert({
        confirmation_call_id: selected.id,
        agent_id: user?.id,
        result: result === "confirmed" ? "answered" : "refused",
        notes,
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("OK");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["confirmation-queue"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const logAttempt = useMutation({
    mutationFn: async (result: "no_answer" | "voicemail" | "wrong_number") => {
      if (!selected) return;
      const { error } = await supabase.from("call_logs").insert({
        confirmation_call_id: selected.id,
        agent_id: user?.id,
        result,
        notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Call logged");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["confirmation-queue"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div dir={dir}>
      <PageHeader title={t("confirm.title")} />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">Queue ({queue.data?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="p-2">
            {queue.isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">{t("common.loading")}</div>
            ) : queue.data?.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">{t("common.empty")}</div>
            ) : (
              <ul className="space-y-1">
                {queue.data!.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full rounded-md p-2 text-start text-sm hover:bg-muted ${selected?.id === c.id ? "bg-muted" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs">{c.order_id.slice(0, 8)}</span>
                        <Badge variant="outline">{c.status}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t("confirm.attempts")}: {c.attempts}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {selected && order.data ? (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">{order.data.order_number}</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">{t("orders.customer")}</div>
                  <div className="font-medium">{order.data.shipping_full_name}</div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-3 w-3" /> {order.data.shipping_phone}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("orders.address")}</div>
                  <div>{order.data.shipping_address_line1}</div>
                  <div>{order.data.shipping_city} · {order.data.shipping_region}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-muted-foreground mb-1">{t("orders.items")}</div>
                  <ul className="space-y-1">
                    {items.data?.map((i) => (
                      <li key={i.id} className="flex justify-between border-b py-1">
                        <span>{i.product_name}{i.variant_label ? ` · ${i.variant_label}` : ""}</span>
                        <span className="font-mono text-xs">×{i.quantity} · {Number(i.line_total).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">{t("confirm.notes")}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="..." rows={3} />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => confirmMut.mutate("confirmed")} disabled={confirmMut.isPending}>
                    <CheckCircle2 className="me-1 h-4 w-4" /> {t("confirm.confirm")}
                  </Button>
                  <Button variant="destructive" onClick={() => confirmMut.mutate("rejected")} disabled={confirmMut.isPending}>
                    <XCircle className="me-1 h-4 w-4" /> {t("confirm.reject")}
                  </Button>
                  <Button variant="outline" onClick={() => logAttempt.mutate("no_answer")}>No answer</Button>
                  <Button variant="outline" onClick={() => logAttempt.mutate("voicemail")}>Voicemail</Button>
                  <Button variant="outline" onClick={() => logAttempt.mutate("wrong_number")}>Wrong #</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">{t("common.empty")}</CardContent></Card>
        )}
      </div>
    </div>
  );
}