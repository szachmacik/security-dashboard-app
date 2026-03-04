import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import {
  Activity,
  BookOpen,
  Calculator,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Download,
  Home,
  Lock,
  LogOut,
  Monitor,
  QrCode,
  Shield,
  ShieldAlert,
  User,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const navItems = [
  { path: "/", icon: Home, label: "Dashboard", description: "Przegląd statusu" },
  { path: "/devices", icon: Monitor, label: "Urządzenia", description: "Rejestr offline" },
  { path: "/qr-transfer", icon: QrCode, label: "QR Transfer", description: "Optyczny most danych" },
  { path: "/opsec", icon: CheckSquare, label: "OPSEC Checklist", description: "Lista kontrolna" },
  { path: "/smart-home", icon: Zap, label: "Smart Home", description: "Zigbee/Z-Wave" },
  { path: "/protocols", icon: BookOpen, label: "Protokoły", description: "Biblioteka metod" },
  { path: "/audits", icon: Activity, label: "Harmonogram", description: "Audyty i weryfikacje" },
  { path: "/calculator", icon: Calculator, label: "Kalkulator", description: "Wydajność transferu" },
  { path: "/physical", icon: Shield, label: "Fizyczne", description: "Zabezpieczenia sprzętowe" },
  { path: "/config", icon: Download, label: "Eksport/Import", description: "Konfiguracja" },
];

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth();

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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-sidebar transition-all duration-300 shrink-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center border-b border-border p-4", collapsed ? "justify-center" : "gap-3")}>
          <ShieldAlert className="w-6 h-6 text-primary shrink-0" />
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-foreground font-mono tracking-wider">CYBER BUNKER</p>
              <p className="text-xs text-muted-foreground">Security Dashboard</p>
            </div>
          )}
        </div>

        {/* Security Status Bar */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-primary pulse-green" />
              <span className="text-primary font-mono">SYSTEM SECURE</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md cursor-pointer transition-all duration-150 group",
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
                  {!collapsed && (
                    <div className="min-w-0">
                      <p className="text-xs font-medium font-mono truncate">{item.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User & Collapse */}
        <div className="border-t border-border p-3 space-y-2">
          {!collapsed && user && (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <User className="w-3 h-3 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{user.name || "Operator"}</p>
                <p className="text-xs text-muted-foreground truncate">{user.role}</p>
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
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
