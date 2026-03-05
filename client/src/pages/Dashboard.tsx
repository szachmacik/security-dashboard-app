import { trpc } from "@/lib/trpc";
import { Activity, AlertTriangle, BookOpen, CheckCircle, Clock, Key, Monitor, Network, QrCode, Shield, ShieldAlert, TrendingUp, Wifi, WifiOff, Zap } from "lucide-react";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
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
  const utils = trpc.useUtils();
  const { data: devices = [] } = trpc.devices.list.useQuery();
  const { data: opsecItems = [], isSuccess: opsecLoaded } = trpc.opsec.list.useQuery();
  const { data: audits = [] } = trpc.audits.list.useQuery();
  const { data: smartDevices = [] } = trpc.smartHome.list.useQuery();
  const { data: protocols = [], isSuccess: protocolsLoaded } = trpc.protocols.list.useQuery();
  const { data: incidents = [] } = trpc.incidents.list.useQuery();
  const { data: threats = [] } = trpc.threats.list.useQuery();
  const { data: activityLog = [] } = trpc.stats.activityLog.useQuery({ limit: 10 });

  const seedMutation = trpc.opsec.seed.useMutation({
    onSuccess: (res: any) => {
      if (res?.seeded) {
        utils.opsec.list.invalidate();
        toast.success(`Załadowano domyślną listę OPSEC (${res.count} elementów)`);
      }
    },
  });
  const seedProtocolsMutation = trpc.protocols.seedBuiltIn.useMutation({
    onSuccess: () => utils.protocols.list.invalidate(),
  });

  useEffect(() => {
    if (opsecLoaded && opsecItems.length === 0 && !seedMutation.isPending) {
      seedMutation.mutate();
    }
  }, [opsecLoaded]);

  useEffect(() => {
    if (protocolsLoaded && protocols.length === 0 && !seedProtocolsMutation.isPending) {
      seedProtocolsMutation.mutate();
    }
  }, [protocolsLoaded]);

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

    const openIncidents = incidents.filter(i => i.status === "open" || i.status === "investigating").length;
    const criticalIncidents = incidents.filter(i => i.severity === "critical" && (i.status === "open" || i.status === "investigating")).length;
    const activeThreats = threats.filter(t => t.status === "active").length;
    const criticalThreats = threats.filter(t => t.severity === "critical" && t.status === "active").length;

    // Enhanced security score
    if (criticalIncidents > 0) score -= criticalIncidents * 5;
    if (criticalThreats > 0) score -= criticalThreats * 3;
    if (activeThreats === 0) score += 5;
    if (openIncidents === 0) score += 5;
    score = Math.min(100, Math.max(0, Math.round(score)));

    return { airGapped, faraday, offline, online, totalOpsec, completedOpsec, criticalPending, pendingAudits, overdueAudits, smartOnline, score, openIncidents, criticalIncidents, activeThreats, criticalThreats };
  }, [devices, opsecItems, audits, smartDevices, incidents, threats]);

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
          <StatCard icon={Shield} label="Protokoły" value={protocols.length || 6} sub="Wbudowanych aktywnych" color="purple" href="/protocols" />
          <StatCard icon={AlertTriangle} label="Otwarte Incydenty" value={stats.openIncidents} sub={`${stats.criticalIncidents} krytycznych`} color={stats.criticalIncidents > 0 ? "red" : stats.openIncidents > 0 ? "yellow" : "green"} href="/incidents" />
          <StatCard icon={ShieldAlert} label="Aktywne Zagrożenia" value={stats.activeThreats} sub={`${stats.criticalThreats} krytycznych`} color={stats.criticalThreats > 0 ? "red" : stats.activeThreats > 0 ? "yellow" : "green"} href="/threats" />
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

        {/* Activity Log */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-mono font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> AKTYWNOŚĆ
            </h2>
          </div>
          {activityLog.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Brak aktywności</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activityLog.map((log: any) => (
                <div key={log.id} className="flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    log.severity === "critical" ? "bg-red-400" :
                    log.severity === "error" ? "bg-orange-400" :
                    log.severity === "warning" ? "bg-yellow-400" : "bg-green-400"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground truncate">{log.details}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {new Date(log.createdAt).toLocaleString("pl-PL", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-mono font-semibold text-foreground mb-4">SZYBKIE AKCJE</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/qr-transfer", icon: QrCode, label: "QR Transfer", color: "border-primary/30 hover:bg-primary/10" },
              { href: "/opsec", icon: CheckCircle, label: "OPSEC", color: "border-green-400/30 hover:bg-green-400/10" },
              { href: "/incidents", icon: AlertTriangle, label: "Incydenty", color: "border-red-400/30 hover:bg-red-400/10" },
              { href: "/threats", icon: ShieldAlert, label: "Zagrożenia", color: "border-orange-400/30 hover:bg-orange-400/10" },
              { href: "/passwords", icon: Key, label: "Hasła", color: "border-yellow-400/30 hover:bg-yellow-400/10" },
              { href: "/network", icon: Network, label: "Ekspozycja", color: "border-cyan-400/30 hover:bg-cyan-400/10" },
              { href: "/audits", icon: Activity, label: "Audyty", color: "border-blue-400/30 hover:bg-blue-400/10" },
              { href: "/config", icon: Shield, label: "Eksport", color: "border-purple-400/30 hover:bg-purple-400/10" },
            ].map(action => (
              <Link key={action.href} href={action.href}>
                <div className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${action.color}`}>
                  <action.icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-foreground font-mono truncate">{action.label}</span>
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
