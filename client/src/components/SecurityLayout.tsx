import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertTriangle,
  Binary,
  BookOpen,
  Calculator,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Download,
  EyeOff,
  FileText,
  BarChart2,
  Home,
  Key,
  Lock,
  LogOut,
  Menu,
  Monitor,
  Network,
  QrCode,
  Radar,
  Shield,
  ShieldAlert,
  User,
  X,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";

const navGroups = [
  {
    label: "PRZEGLĄD",
    items: [
      { path: "/", icon: Home, label: "Dashboard", description: "Status bezpieczeństwa" },
    ],
  },
  {
    label: "URZĄDZENIA",
    items: [
      { path: "/devices", icon: Monitor, label: "Urządzenia", description: "Rejestr offline" },
      { path: "/smart-home", icon: Zap, label: "Smart Home", description: "Zigbee/Z-Wave" },
    ],
  },
  {
    label: "TRANSFER DANYCH",
    items: [
      { path: "/qr-transfer", icon: QrCode, label: "QR Transfer", description: "Optyczny most danych" },
      { path: "/calculator", icon: Calculator, label: "Kalkulator", description: "Wydajność transferu" },
    ],
  },
  {
    label: "BEZPIECZEŃSTWO",
    items: [
      { path: "/opsec", icon: CheckSquare, label: "OPSEC Checklist", description: "Lista kontrolna" },
      { path: "/incidents", icon: AlertTriangle, label: "Incydenty", description: "Reagowanie na zagrożenia", badge: "incidents" },
      { path: "/threats", icon: Radar, label: "Wskaźniki", description: "IOC, TTP, podatności" },
      { path: "/passwords", icon: Key, label: "Hasła & Klucze", description: "Ocena siły i generator" },
      { path: "/network", icon: Network, label: "Ekspozycja", description: "Analiza sieci i portów" },
    ],
  },
  {
    label: "WIEDZA",
    items: [
      { path: "/protocols", icon: BookOpen, label: "Protokoły", description: "Biblioteka metod" },
      { path: "/physical", icon: Shield, label: "Fizyczne", description: "Zabezpieczenia sprzętowe" },
      { path: "/audits", icon: Activity, label: "Harmonogram", description: "Audyty i weryfikacje" },
      { path: "/entropy", icon: Binary, label: "Entropia", description: "Analiza entropii Shannona" },
      { path: "/osint", icon: EyeOff, label: "OSINT Defense", description: "Ochrona przed wywiadem" },
    ],
  },
  {
    label: "DANE",
    items: [
      { path: "/notes", icon: FileText, label: "Secure Notes", description: "Zaszyfrowane notatki" },
      { path: "/reports", icon: BarChart2, label: "Raporty & Trendy", description: "Historia i analizy" },
      { path: "/config", icon: Download, label: "Eksport/Import", description: "Konfiguracja" },
    ],
  },
];

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth();

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location]);

  // Fetch open incident count for badge
  const { data: incidentStats } = trpc.incidents.list.useQuery(
    undefined,
    { enabled: isAuthenticated, refetchInterval: 30_000 }
  );
  const openIncidents = incidentStats?.filter(i => i.status === "open" || i.status === "investigating").length ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-primary font-mono text-sm tracking-widest">INITIALIZING SECURE ENVIRONMENT...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-sm mx-auto p-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <ShieldAlert className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-mono tracking-wide">CYBER BUNKER</h1>
          <p className="text-muted-foreground text-sm">Security Dashboard — Autoryzacja wymagana</p>
          <div className="border border-border rounded-lg p-4 bg-card text-left space-y-2">
            <p className="text-xs text-muted-foreground font-mono">SYSTEM STATUS</p>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-foreground">Dostęp nieautoryzowany</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Lock className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Wymagane uwierzytelnienie</span>
            </div>
          </div>
          <a
            href={getLoginUrl()}
            className="block w-full py-3 px-6 bg-primary text-primary-foreground rounded-lg font-mono text-sm font-medium hover:opacity-90 transition-opacity text-center"
          >
            AUTORYZUJ DOSTĘP
          </a>
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className={cn("flex items-center border-b border-border p-4 shrink-0", collapsed ? "justify-center" : "gap-3")}>
        <ShieldAlert className="w-6 h-6 text-primary shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground font-mono tracking-wider">CYBER BUNKER</p>
            <p className="text-xs text-muted-foreground">Security Dashboard</p>
          </div>
        )}
      </div>

      {/* Security Status Bar */}
      {!collapsed && (
        <div className="px-4 py-2.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary font-mono">SYSTEM SECURE</span>
            {openIncidents > 0 && (
              <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full font-mono">
                {openIncidents} OPEN
              </span>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-1">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-4 pt-3 pb-1 text-xs font-mono text-muted-foreground/60 tracking-widest">{group.label}</p>
            )}
            {group.items.map((item) => {
              const isActive = location === item.path;
              const badgeCount = item.badge === "incidents" ? openIncidents : 0;
              return (
                <Link key={item.path} href={item.path}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md cursor-pointer transition-all duration-150 group relative",
                      isActive
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
                    {!collapsed && (
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium font-mono truncate">{item.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      </div>
                    )}
                    {!collapsed && badgeCount > 0 && (
                      <span className="shrink-0 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full font-mono min-w-5 text-center">
                        {badgeCount}
                      </span>
                    )}
                    {collapsed && badgeCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User & Collapse */}
      <div className="border-t border-border p-3 space-y-2 shrink-0">
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <User className="w-3 h-3 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{user.name || "Operator"}</p>
              <p className="text-xs text-muted-foreground truncate font-mono">{user.role?.toUpperCase()}</p>
            </div>
          </div>
        )}
        <div className="flex gap-1">
          {!collapsed && (
            <button
              onClick={logout}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors flex-1"
            >
              <LogOut className="w-3 h-3" />
              <span className="font-mono">Wyloguj</span>
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors hidden lg:flex"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-border bg-sidebar transition-all duration-300 shrink-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-72 border-r border-border bg-sidebar transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="absolute top-4 right-4">
          <button onClick={() => setMobileOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent">
            <X className="w-4 h-4" />
          </button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-sidebar shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent">
            <Menu className="w-5 h-5" />
          </button>
          <ShieldAlert className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold text-foreground font-mono tracking-wider">CYBER BUNKER</span>
          {openIncidents > 0 && (
            <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full font-mono">
              {openIncidents} OPEN
            </span>
          )}
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
