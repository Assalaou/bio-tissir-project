import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Star, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

const BUCKET = "product-images";

export function ProductImageUploader({ productId, images }: { productId: string; images: any[] }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const onPick = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setPreviews((s) => [...s, ...arr]);
  };

  const upload = async () => {
    if (previews.length === 0) return;
    setUploading(true);
    try {
      for (const p of previews) {
        const ext = p.file.name.split(".").pop() || "jpg";
        const path = `${productId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, p.file, {
          contentType: p.file.type, upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const isFirst = images.length === 0 && previews.indexOf(p) === 0;
        const { error: insErr } = await supabase.from("product_images").insert({
          product_id: productId, url: pub.publicUrl, storage_path: path, is_primary: isFirst,
          sort_order: images.length + previews.indexOf(p),
        });
        if (insErr) throw insErr;
      }
      previews.forEach((p) => URL.revokeObjectURL(p.url));
      setPreviews([]);
      qc.invalidateQueries({ queryKey: ["product-images", productId] });
      toast.success(t("common.success"));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const setPrimary = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);
      const { error } = await supabase.from("product_images").update({ is_primary: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-images", productId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const updateAlt = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("product_images").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(t("common.success")); qc.invalidateQueries({ queryKey: ["product-images", productId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (img: any) => {
      if (img.storage_path) await supabase.storage.from(BUCKET).remove([img.storage_path]);
      const { error } = await supabase.from("product_images").delete().eq("id", img.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-images", productId] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-3">
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onPick(e.target.files)} />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <ImageIcon className="me-1 h-4 w-4" /> {t("images.choose")}
        </Button>
        <Button type="button" size="sm" onClick={upload} disabled={previews.length === 0 || uploading}>
          <Upload className="me-1 h-4 w-4" /> {uploading ? t("common.loading") : `${t("images.upload")} (${previews.length})`}
        </Button>
        <span className="text-xs text-muted-foreground">{t("images.hint")}</span>
      </div>

      {previews.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-medium">{t("images.preview")}</div>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {previews.map((p, i) => (
              <div key={i} className="relative">
                <img src={p.url} alt="" className="aspect-square w-full rounded border object-cover" />
                <button onClick={() => setPreviews((s) => s.filter((_, j) => j !== i))} className="absolute -top-1 -end-1 rounded-full bg-destructive p-1 text-destructive-foreground"><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {images.length === 0 && <div className="col-span-full text-center text-sm text-muted-foreground">{t("common.empty")}</div>}
        {images.map((img) => (
          <div key={img.id} className="rounded-md border p-2">
            <div className="relative">
              <img src={img.url} alt={img.alt_text_fr ?? img.alt_text ?? ""} className="aspect-square w-full rounded object-cover" />
              {img.is_primary && <Badge className="absolute start-1 top-1">{t("images.primary")}</Badge>}
            </div>
            <div className="mt-2 grid gap-2">
              <div className="grid grid-cols-3 gap-1">
                <Input placeholder="ALT FR" defaultValue={img.alt_text_fr ?? ""} onBlur={(e) => e.target.value !== (img.alt_text_fr ?? "") && updateAlt.mutate({ id: img.id, patch: { alt_text_fr: e.target.value } })} />
                <Input placeholder="ALT AR" dir="rtl" defaultValue={img.alt_text_ar ?? ""} onBlur={(e) => e.target.value !== (img.alt_text_ar ?? "") && updateAlt.mutate({ id: img.id, patch: { alt_text_ar: e.target.value } })} />
                <Input placeholder="ALT EN" defaultValue={img.alt_text_en ?? ""} onBlur={(e) => e.target.value !== (img.alt_text_en ?? "") && updateAlt.mutate({ id: img.id, patch: { alt_text_en: e.target.value } })} />
              </div>
              <div className="flex items-center justify-between">
                <Button size="sm" variant={img.is_primary ? "secondary" : "outline"} disabled={img.is_primary} onClick={() => setPrimary.mutate(img.id)}>
                  <Star className="me-1 h-3 w-3" /> {t("images.makePrimary")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(img)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}