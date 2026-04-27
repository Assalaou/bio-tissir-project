import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { StubPage } from "@/components/admin/StubPage";

export const Route = createFileRoute("/admin/products")({
  component: () => { const { t } = useI18n(); return <StubPage title={t("nav.products")} />; },
});