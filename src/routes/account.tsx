import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/account")({
  component: AccountPage,
});

function AccountPage() {
  const { t, dir } = useI18n();
  const { session, loading, signOut, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen p-8" dir={dir}>
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">{t("auth.welcome")}</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        <p className="text-sm">
          Le storefront client sera disponible prochainement. / واجهة المتجر قادمة قريباً.
        </p>
        <Button variant="outline" onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}>
          {t("auth.signOut")}
        </Button>
      </div>
    </div>
  );
}