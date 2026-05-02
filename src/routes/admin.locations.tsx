import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/locations")({ component: LocationsPage });

const TYPES = ["warehouse", "shop", "franchise", "transit"] as const;

function LocationsPage() {
  const { t, dir } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ["locations-admin"],
    queryFn: async () => (await supabase.from("locations").select("*").order("name")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async (l: any) => {
      if (l.id) {
        const { error } = await supabase.from("locations").update(l).eq("id", l.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("locations").insert(l);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(t("common.success")); setOpen(false); qc.invalidateQueries({ queryKey: ["locations-admin"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setEditing({ code: "", name: "", type: "warehouse", city: "", region: "", address_line1: "", phone: "", active: true, is_default: false }); setOpen(true); };

  return (
    <div dir={dir}>
      <PageHeader title={t("nav.locations")} actions={<Button size="sm" onClick={openNew}><Plus className="me-1 h-4 w-4" /> {t("common.add")}</Button>} />
      <Card><CardContent className="p-4">
        <Table>
          <TableHeader><TableRow><TableHead>{t("common.code")}</TableHead><TableHead>{t("common.name")}</TableHead><TableHead>{t("common.type")}</TableHead><TableHead>{t("common.city")}</TableHead><TableHead>{t("common.status")}</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {list.data?.map((l: any) => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{l.code}</TableCell>
                <TableCell className="font-medium">{l.name} {l.is_default && <Badge variant="outline" className="ms-1">default</Badge>}</TableCell>
                <TableCell>{l.type}</TableCell>
                <TableCell>{l.city ?? "—"}</TableCell>
                <TableCell><Badge variant={l.active ? "default" : "secondary"}>{l.active ? t("common.active") : t("common.inactive")}</Badge></TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => { setEditing(l); setOpen(true); }}><Pencil className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {list.data?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{t("common.empty")}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir={dir}>
          <DialogHeader><DialogTitle>{editing?.id ? t("common.edit") : t("common.add")}</DialogTitle></DialogHeader>
          {editing && <div className="grid gap-3 md:grid-cols-2">
            <div><Label>{t("common.code")} *</Label><Input value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} /></div>
            <div><Label>{t("common.name")} *</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>{t("common.type")}</Label>
              <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((ty) => <SelectItem key={ty} value={ty}>{ty}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t("common.city")}</Label><Input value={editing.city ?? ""} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></div>
            <div><Label>{t("common.address")}</Label><Input value={editing.address_line1 ?? ""} onChange={(e) => setEditing({ ...editing, address_line1: e.target.value })} /></div>
            <div><Label>{t("common.phone")}</Label><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /><Label>{t("common.active")}</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.is_default} onCheckedChange={(v) => setEditing({ ...editing, is_default: v })} /><Label>Default</Label></div>
          </div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => save.mutate(editing)} disabled={save.isPending || !editing?.code || !editing?.name}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}