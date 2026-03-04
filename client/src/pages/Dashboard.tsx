import { trpc } from "@/lib/trpc";
import { Activity, AlertTriangle, BookOpen, CheckCircle, Monitor, QrCode, Shield, ShieldAlert, TrendingUp, Wifi, WifiOff, Zap } from "lucide-react";
import { useMemo } from "react";
import { Link } from "wouter";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    air_gapped: "text-green-400 bg-green-400/10 border-green-400/30",
    faraday: "text-blue-400 bg-blue-400/10 border-blue-400/30",
    offline: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
    online: "text-red-400 bg-red-400/10 border-red-400/30",
  };
  const labels: Record<string, string> = {
    air_gapped: "AIR-GAP",
    faraday: "FARADAY",
    offline: "OFFLINE",
    online: "ONLINE",
  };
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-mono ${colors[status] || "text-muted-foreground"}`}>
      {labels[status] || status.toUpperCase()}
    </span>
  );
}

function SecurityScore({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-400" : score >= 60 ? "text-yellow-400" : "text-red-400";
  const ring = score >= 80 ? "stroke-green-400" : score >= 60 ? "stroke-yellow-400" : "stroke-red-400";
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" className="text-border" />
        <circle cx="50" cy="50" r="45" fill="none" strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={ring} style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold font-mono ${color}`}>{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: devices = [] } = trpc.devices.list.useQuery();
  const { data: opsecItems = [] } = trpc.opsec.list.useQuery();
  const { data: audits = [] } = trpc.audits.list.useQuery();
  const { data: smartDevices = [] } = trpc.smartHome.list.useQuery();

  const stats = useMemo(() => {
    const airGapped = devices.filter(d => d.isolationStatus === "air_gapped").length;
    const faraday = devices.filter(d => d.isolationStatus === "faraday").length;
    const offline = devices.filter(d => d.isolationStatus === "offline").length;
    const online = devices.filter(d => d.isolationStatus === "online").length;
    const totalOpsec = opsecItems.length;
    const completedOpsec = opsecItems.filter(i => i.isCompleted).length;
    const criticalPending = opsecItems.filter(i => !i.isCompleted && i.priority === "critical").length;
    const pendingAudits = audits.filter(a => a.status === "pending").length;
    const overdueAudits = audits.filter(a => a.status === "overdue").length;
    const smartOnline = smartDevices.filter(d => d.isOnline).length;

    // Security score calculation
    let score = 50;
    if (totalOpsec > 0) score += (completedOpsec / totalOpsec) * 30;
    if (airGapped + faraday > 0) score += 10;
    if (criticalPending === 0) score += 10;
    if (overdueAudits === 0) score += 5;
    score = Math.min(100, Math.round(score));

    return { airGapped, faraday, offline, online, totalOpsec, completedOpsec, criticalPending, pendingAudits, overdueAudits, smartOnline, score };
  }, [devices, opsecItems, audits, smartDevices]);

  const recentAudits = audits.slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground tracking-wide">SECURITY OVERVIEW</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString("pl-PL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-primary pulse-green" />
          <span className="text-xs font-mono text-primary">SYSTEM AKTYWNY</span>
        </div>
      </div>

      {/* Top row: Score + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Security Score */}
        <div className="lg:col-span-1 bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center space-y-3">
          <p className="text-xs font-mono text-muted-foreground tracking-widest">SECURITY SCORE</p>
          <SecurityScore score={stats.score} />
          <p className="text-xs text-muted-foreground text-center">
            {stats.score >= 80 ? "Dobry poziom bezpieczeństwa" : stats.score >= 60 ? "Wymaga uwagi" : "Krytyczne luki!"}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard icon={Monitor} label="Urządzenia Air-Gap" value={stats.airGapped} sub={`${stats.faraday} Faraday, ${stats.offline} Offline`} color="green" href="/devices" />
          <StatCard icon={WifiOff} label="Urządzenia Online" value={stats.online} sub={`${devices.length} łącznie`} color={stats.online > 0 ? "yellow" : "green"} href="/devices" />
          <StatCard icon={CheckCircle} label="OPSEC Ukończone" value={`${stats.completedOpsec}/${stats.totalOpsec}`} sub={`${stats.criticalPending} krytycznych oczekuje`} color={stats.criticalPending > 0 ? "red" : "green"} href="/opsec" />
          <StatCard icon={AlertTriangle} label="Zaległe Audyty" value={stats.overdueAudits} sub={`${stats.pendingAudits} zaplanowanych`} color={stats.overdueAudits > 0 ? "red" : "green"} href="/audits" />
          <StatCard icon={Zap} label="Smart Home" value={stats.smartOnline} sub={`${smartDevices.length} urządzeń łącznie`} color="blue" href="/smart-home" />
          <StatCard icon={Shield} label="Protokoły" value="6" sub="Wbudowanych aktywnych" color="purple" href="/protocols" />
        </div>
      </div>

      {/* Device Status + OPSEC Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Devices */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-mono font-semibold text-foreground">URZĄDZENIA</h2>
            <Link href="/devices">
              <span className="text-xs text-primary hover:underline cursor-pointer font-mono">Zarządzaj →</span>
            </Link>
          </div>
          {devices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Monitor className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Brak zarejestrowanych urządzeń</p>
              <Link href="/devices">
                <span className="text-xs text-primary cursor-pointer hover:underline">Dodaj urządzenie →</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {devices.slice(0, 6).map(device => (
                <div key={device.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${device.isolationStatus === "air_gapped" ? "bg-green-400" : device.isolationStatus === "faraday" ? "bg-blue-400" : device.isolationStatus === "offline" ? "bg-yellow-400" : "bg-red-400"}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{device.name}</p>
                      <p className="text-xs text-muted-foreground">{device.location || "Brak lokalizacji"}</p>
                    </div>
                  </div>
                  <StatusBadge status={device.isolationStatus} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* OPSEC Progress */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-mono font-semibold text-foreground">OPSEC CHECKLIST</h2>
            <Link href="/opsec">
              <span className="text-xs text-primary hover:underline cursor-pointer font-mono">Szczegóły →</span>
            </Link>
          </div>
          {opsecItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Brak elementów checklisty</p>
              <Link href="/opsec">
                <span className="text-xs text-primary cursor-pointer hover:underline">Załaduj domyślne →</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {["physical", "network", "cryptographic", "opsec", "smart_home"].map(cat => {
                const catItems = opsecItems.filter(i => i.category === cat);
                const done = catItems.filter(i => i.isCompleted).length;
                const pct = catItems.length > 0 ? (done / catItems.length) * 100 : 0;
                const labels: Record<string, string> = { physical: "Fizyczne", network: "Sieciowe", cryptographic: "Kryptograficzne", opsec: "OPSEC", smart_home: "Smart Home" };
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground font-mono">{labels[cat]}</span>
                      <span className="text-foreground">{done}/{catItems.length}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-green-400" : pct >= 60 ? "bg-yellow-400" : "bg-red-400"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Audits + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Audits */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-mono font-semibold text-foreground">OSTATNIE AUDYTY</h2>
            <Link href="/audits">
              <span className="text-xs text-primary hover:underline cursor-pointer font-mono">Harmonogram →</span>
            </Link>
          </div>
          {recentAudits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Brak zaplanowanych audytów</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentAudits.map(audit => (
                <div key={audit.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm text-foreground">{audit.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(audit.scheduledAt).toLocaleDateString("pl-PL")}</p>
                  </div>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                    audit.status === "completed" ? "text-green-400 border-green-400/30 bg-green-400/10" :
                    audit.status === "overdue" ? "text-red-400 border-red-400/30 bg-red-400/10" :
                    "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"
                  }`}>
                    {audit.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-mono font-semibold text-foreground mb-4">SZYBKIE AKCJE</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/qr-transfer", icon: QrCode, label: "Nowy QR Transfer", color: "border-primary/30 hover:bg-primary/10" },
              { href: "/opsec", icon: CheckCircle, label: "Sprawdź OPSEC", color: "border-green-400/30 hover:bg-green-400/10" },
              { href: "/audits", icon: Activity, label: "Zaplanuj Audyt", color: "border-yellow-400/30 hover:bg-yellow-400/10" },
              { href: "/protocols", icon: BookOpen, label: "Protokoły", color: "border-blue-400/30 hover:bg-blue-400/10" },
              { href: "/devices", icon: Monitor, label: "Dodaj Urządzenie", color: "border-purple-400/30 hover:bg-purple-400/10" },
              { href: "/config", icon: Shield, label: "Eksportuj Config", color: "border-orange-400/30 hover:bg-orange-400/10" },
            ].map(action => (
              <Link key={action.href} href={action.href}>
                <div className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${action.color}`}>
                  <action.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-foreground font-mono">{action.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color, href }: {
  icon: React.ElementType; label: string; value: string | number; sub: string; color: string; href: string;
}) {
  const colors: Record<string, string> = {
    green: "text-green-400 bg-green-400/10 border-green-400/20",
    red: "text-red-400 bg-red-400/10 border-red-400/20",
    yellow: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    blue: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    purple: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  };
  return (
    <Link href={href}>
      <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg border ${colors[color]}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <p className="text-2xl font-bold font-mono text-foreground">{value}</p>
        <p className="text-xs font-mono text-muted-foreground mt-0.5">{label}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">{sub}</p>
      </div>
    </Link>
  );
}
