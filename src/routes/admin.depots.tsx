import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/depots")({ component: DepotsPage });

const TYPES = ["supplier", "cooperative", "producer", "internal_warehouse", "franchise", "shop"] as const;
const STATUSES = ["active", "inactive", "archived"] as const;

interface Depot {
  id?: string;
  code: string;
  name: string;
  type: typeof TYPES[number];
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  region: string | null;
  address_line1: string | null;
  notes: string | null;
  status: typeof STATUSES[number];
}

const empty: Depot = {
  code: "", name: "", type: "supplier",
  contact_person: "", phone: "", email: "", city: "", region: "", address_line1: "", notes: "", status: "active",
};

function DepotsPage() {
  const { t, dir } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Depot | null>(null);
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ["depots", search, typeFilter],
    queryFn: async () => {
      let q = supabase.from("depots").select("*").order("name");
      if (typeFilter !== "all") q = q.eq("type", typeFilter as any);
      if (search.trim()) q = q.or(`name.ilike.%${search}%,code.ilike.%${search}%,city.ilike.%${search}%`);
      const { data } = await q;
      return (data ?? []) as Depot[];
    },
  });

  const save = useMutation({
    mutationFn: async (d: Depot) => {
      const payload = { ...d };
      if (d.id) {
        const { error } = await supabase.from("depots").update(payload).eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("depots").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t("common.success"));
      setOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["depots"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setEditing({ ...empty }); setOpen(true); };
  const openEdit = (d: Depot) => { setEditing({ ...d }); setOpen(true); };

  return (
    <div dir={dir}>
      <PageHeader title={t("depots.title")} actions={
        <Button size="sm" onClick={openNew}><Plus className="me-1 h-4 w-4" /> {t("depots.new")}</Button>
      } />
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <Input placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {TYPES.map((ty) => <SelectItem key={ty} value={ty}>{t(`depots.type.${ty}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.code")}</TableHead>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("common.type")}</TableHead>
                <TableHead>{t("depots.contact")}</TableHead>
                <TableHead>{t("common.city")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.isLoading ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">{t("common.loading")}</TableCell></TableRow> :
                list.data?.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">{t("common.empty")}</TableCell></TableRow> :
                list.data!.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{d.code}</TableCell>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{t(`depots.type.${d.type}`)}</TableCell>
                    <TableCell><div className="text-sm">{d.contact_person ?? "—"}</div><div className="text-xs text-muted-foreground">{d.phone ?? ""}</div></TableCell>
                    <TableCell>{d.city ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl" dir={dir}>
          <DialogHeader><DialogTitle>{editing?.id ? t("common.edit") : t("depots.new")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>{t("common.code")} *</Label><Input value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} /></div>
              <div><Label>{t("common.name")} *</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>{t("common.type")}</Label>
                <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((ty) => <SelectItem key={ty} value={ty}>{t(`depots.type.${ty}`)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t("common.status")}</Label>
                <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t("depots.contact")}</Label><Input value={editing.contact_person ?? ""} onChange={(e) => setEditing({ ...editing, contact_person: e.target.value })} /></div>
              <div><Label>{t("common.phone")}</Label><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
              <div><Label>{t("common.email")}</Label><Input value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
              <div><Label>{t("common.city")}</Label><Input value={editing.city ?? ""} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>{t("common.address")}</Label><Input value={editing.address_line1 ?? ""} onChange={(e) => setEditing({ ...editing, address_line1: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>{t("common.notes")}</Label><Textarea value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} rows={2} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending || !editing?.code || !editing?.name}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}