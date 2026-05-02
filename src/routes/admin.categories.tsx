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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/categories")({ component: CategoriesPage });

const LOCALES = ["fr", "ar", "en"] as const;

interface CategoryForm {
  id?: string;
  slug: string;
  active: boolean;
  sort_order: number;
  parent_id: string | null;
  translations: Record<string, { name: string; description: string }>;
}

const empty: CategoryForm = {
  slug: "", active: true, sort_order: 0, parent_id: null,
  translations: { fr: { name: "", description: "" }, ar: { name: "", description: "" }, en: { name: "", description: "" } },
};

function CategoriesPage() {
  const { t, dir } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CategoryForm | null>(null);
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ["categories-admin"],
    queryFn: async () => {
      const { data: cats } = await supabase.from("categories").select("*").order("sort_order");
      const { data: tr } = await supabase.from("category_translations").select("*");
      return (cats ?? []).map((c) => ({
        ...c,
        names: Object.fromEntries(LOCALES.map((l) => [l, tr?.find((x) => x.category_id === c.id && x.locale === l)?.name ?? ""])),
      }));
    },
  });

  const openNew = () => { setEditing({ ...empty, translations: { fr: { name: "", description: "" }, ar: { name: "", description: "" }, en: { name: "", description: "" } } }); setOpen(true); };

  const openEdit = async (id: string) => {
    const { data: c } = await supabase.from("categories").select("*").eq("id", id).maybeSingle();
    const { data: tr } = await supabase.from("category_translations").select("*").eq("category_id", id);
    if (!c) return;
    const translations: any = { fr: { name: "", description: "" }, ar: { name: "", description: "" }, en: { name: "", description: "" } };
    (tr ?? []).forEach((r: any) => { translations[r.locale] = { name: r.name ?? "", description: r.description ?? "" }; });
    setEditing({ id: c.id, slug: c.slug, active: c.active, sort_order: c.sort_order, parent_id: c.parent_id, translations });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async (form: CategoryForm) => {
      let categoryId = form.id;
      if (categoryId) {
        const { error } = await supabase.from("categories").update({ slug: form.slug, active: form.active, sort_order: form.sort_order, parent_id: form.parent_id }).eq("id", categoryId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("categories").insert({ slug: form.slug, active: form.active, sort_order: form.sort_order, parent_id: form.parent_id }).select("id").single();
        if (error) throw error;
        categoryId = data!.id;
      }
      for (const loc of LOCALES) {
        const tr = form.translations[loc];
        if (!tr.name) continue;
        const { data: existing } = await supabase.from("category_translations").select("id").eq("category_id", categoryId!).eq("locale", loc).maybeSingle();
        if (existing) {
          await supabase.from("category_translations").update({ name: tr.name, description: tr.description }).eq("id", existing.id);
        } else {
          await supabase.from("category_translations").insert({ category_id: categoryId!, locale: loc as any, name: tr.name, description: tr.description });
        }
      }
    },
    onSuccess: () => { toast.success(t("common.success")); setOpen(false); qc.invalidateQueries({ queryKey: ["categories-admin"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div dir={dir}>
      <PageHeader title={t("categories.title")} actions={<Button size="sm" onClick={openNew}><Plus className="me-1 h-4 w-4" /> {t("categories.new")}</Button>} />
      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t("products.slug")}</TableHead>
              <TableHead>FR</TableHead>
              <TableHead>AR</TableHead>
              <TableHead>EN</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {list.data?.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.slug}</TableCell>
                  <TableCell>{c.names.fr || "—"}</TableCell>
                  <TableCell>{c.names.ar || "—"}</TableCell>
                  <TableCell>{c.names.en || "—"}</TableCell>
                  <TableCell><Badge variant={c.active ? "default" : "secondary"}>{c.active ? t("common.active") : t("common.inactive")}</Badge></TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => openEdit(c.id)}><Pencil className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
              {list.data?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{t("common.empty")}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl" dir={dir}>
          <DialogHeader><DialogTitle>{editing?.id ? t("common.edit") : t("categories.new")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2"><Label>{t("products.slug")} *</Label><Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
                <div className="flex items-center gap-2 pt-6"><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /><Label>{t("common.active")}</Label></div>
              </div>
              <Tabs defaultValue="fr">
                <TabsList>{LOCALES.map((l) => <TabsTrigger key={l} value={l}>{l.toUpperCase()}</TabsTrigger>)}</TabsList>
                {LOCALES.map((l) => (
                  <TabsContent key={l} value={l} className="space-y-2">
                    <div><Label>{t("common.name")}</Label>
                      <Input value={editing.translations[l].name} onChange={(e) => setEditing({ ...editing, translations: { ...editing.translations, [l]: { ...editing.translations[l], name: e.target.value } } })} dir={l === "ar" ? "rtl" : "ltr"} />
                    </div>
                    <div><Label>{t("products.shortDesc")}</Label>
                      <Textarea rows={3} value={editing.translations[l].description} onChange={(e) => setEditing({ ...editing, translations: { ...editing.translations, [l]: { ...editing.translations[l], description: e.target.value } } })} dir={l === "ar" ? "rtl" : "ltr"} />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending || !editing?.slug}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}