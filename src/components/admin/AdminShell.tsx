import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Tags,
  Boxes,
  Warehouse,
  ShoppingCart,
  PhoneCall,
  Users,
  Bell,
  LogOut,
  Menu,
  Factory,
  PlusCircle,
} from "lucide-react";
import { useAuth, AppRole } from "@/lib/auth";
import { useI18n, Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  roles?: AppRole[]; // if undefined => any staff
  group: "main" | "catalog" | "stock" | "sales" | "admin";
}

const NAV: NavItem[] = [
  { to: "/admin", labelKey: "nav.dashboard", icon: LayoutDashboard, group: "main" },
  { to: "/admin/products", labelKey: "nav.products", icon: Package, group: "catalog", roles: ["super_admin", "commercial_admin", "stock_manager"] },
  { to: "/admin/categories", labelKey: "nav.categories", icon: Tags, group: "catalog", roles: ["super_admin", "commercial_admin"] },
  { to: "/admin/inventory", labelKey: "nav.inventory", icon: Boxes, group: "stock", roles: ["super_admin", "stock_manager", "logistics"] },
  { to: "/admin/locations", labelKey: "nav.locations", icon: Warehouse, group: "stock", roles: ["super_admin", "stock_manager"] },
  { to: "/admin/depots", labelKey: "nav.depots", icon: Factory, group: "stock", roles: ["super_admin", "stock_manager", "commercial_admin"] },
  { to: "/admin/orders/new", labelKey: "nav.newOrder", icon: PlusCircle, group: "sales", roles: ["super_admin", "commercial_admin", "confirmation_agent"] },
  { to: "/admin/orders", labelKey: "nav.orders", icon: ShoppingCart, group: "sales", roles: ["super_admin", "commercial_admin", "confirmation_agent", "logistics", "accountant"] },
  { to: "/admin/confirmation", labelKey: "nav.confirmation", icon: PhoneCall, group: "sales", roles: ["super_admin", "commercial_admin", "confirmation_agent"] },
  { to: "/admin/customers", labelKey: "nav.customers", icon: Users, group: "sales", roles: ["super_admin", "commercial_admin", "confirmation_agent"] },
];

const GROUPS: { id: NavItem["group"]; labelKey: string }[] = [
  { id: "main", labelKey: "nav.dashboard" },
  { id: "catalog", labelKey: "nav.catalog" },
  { id: "stock", labelKey: "nav.stock" },
  { id: "sales", labelKey: "nav.sales" },
  { id: "admin", labelKey: "nav.admin" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { t, locale, setLocale, dir } = useI18n();
  const { user, roles, isStaff, hasAnyRole, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visible = NAV.filter((n) => !n.roles || hasAnyRole(n.roles) || roles.includes("super_admin"));

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="flex min-h-screen w-full bg-muted/30" dir={dir}>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 z-40 w-64 flex-col border-border bg-sidebar text-sidebar-foreground transition-transform md:static md:flex",
          dir === "rtl" ? "right-0 border-l" : "left-0 border-r",
          mobileOpen ? "flex translate-x-0" : "hidden md:flex",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold">B</div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{t("app.name")}</span>
            <span className="text-xs text-muted-foreground">{t("app.backoffice")}</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {GROUPS.map((g) => {
            const items = visible.filter((v) => v.group === g.id);
            if (items.length === 0) return null;
            return (
              <div key={g.id}>
                <div className="px-2 pb-1 text-xs font-medium uppercase text-muted-foreground">
                  {t(g.labelKey)}
                </div>
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active =
                      item.to === "/admin"
                        ? location.pathname === "/admin"
                        : location.pathname.startsWith(item.to);
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                            active
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "hover:bg-sidebar-accent/60",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{t(item.labelKey)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3 text-xs text-muted-foreground">
          {roles.length > 0 ? roles.join(", ") : isStaff ? "staff" : "customer"}
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background px-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />

          {/* Language */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="uppercase">
                {locale}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("settings.language")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(["fr", "ar"] as Locale[]).map((l) => (
                <DropdownMenuItem key={l} onClick={() => setLocale(l)}>
                  {l === "fr" ? "Français" : "العربية"}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>{t("common.notifications")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                {t("common.noNotifications")}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="max-w-[180px] truncate">
                {user?.email}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="me-2 h-4 w-4" />
                {t("auth.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}