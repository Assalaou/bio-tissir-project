import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { t, locale, setLocale, dir } = useI18n();
  const { session, isStaff, signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (session) {
      if (isStaff) navigate({ to: "/admin" });
      else navigate({ to: "/account" });
    }
  }, [loading, session, isStaff, navigate]);

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(email, password);
      toast.success(t("auth.signin"));
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    } finally {
      setBusy(false);
    }
  };

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signUp(email, password, displayName, phone);
      toast.success(t("auth.signup"));
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4" dir={dir}>
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("app.name")}</h1>
            <p className="text-sm text-muted-foreground">{t("app.backoffice")}</p>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant={locale === "fr" ? "default" : "outline"} onClick={() => setLocale("fr")}>FR</Button>
            <Button size="sm" variant={locale === "ar" ? "default" : "outline"} onClick={() => setLocale("ar")}>ع</Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{tab === "signin" ? t("auth.signin") : t("auth.signup")}</CardTitle>
            <CardDescription>{t("auth.staffPortal")} / {t("auth.customerPortal")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t("auth.signin")}</TabsTrigger>
                <TabsTrigger value="signup">{t("auth.signup")}</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={onSignIn} className="space-y-3 pt-3">
                  <div className="space-y-1">
                    <Label>{t("auth.email")}</Label>
                    <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("auth.password")}</Label>
                    <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {t("auth.signinCta")}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={onSignUp} className="space-y-3 pt-3">
                  <div className="space-y-1">
                    <Label>{t("auth.displayName")}</Label>
                    <Input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("auth.phone")}</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("auth.email")}</Label>
                    <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("auth.password")}</Label>
                    <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {t("auth.signupCta")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}