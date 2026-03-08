import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import {
  Network, Upload, AlertTriangle, CheckCircle, Eye, Search,
  Download, RefreshCw, Info, Shield, Zap, Globe, Activity
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  ip: string;
  timestamp: Date | null;
  method: string;
  path: string;
  status: number;
  bytes: number;
  userAgent: string;
  referer: string;
  raw: string;
}

interface AnomalyFlag {
  type: "brute_force" | "port_scan" | "unusual_hours" | "high_volume" | "suspicious_path" | "error_flood";
  severity: "critical" | "high" | "medium" | "low";
  ip: string;
  description: string;
  count: number;
}

interface IPStats {
  ip: string;
  count: number;
  methods: Record<string, number>;
  statuses: Record<string, number>;
  paths: string[];
  firstSeen: Date | null;
  lastSeen: Date | null;
  bytes: number;
  anomalies: AnomalyFlag[];
  riskScore: number;
}

// ─── Log Parsers ──────────────────────────────────────────────────────────────

// Nginx/Apache Combined Log Format
// 192.168.1.1 - - [10/Oct/2000:13:55:36 -0700] "GET /index.html HTTP/1.1" 200 2326 "http://ref.com" "Mozilla/5.0"
const NGINX_REGEX = /^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"(\w+)\s+(\S+)\s+\S+"\s+(\d+)\s+(\d+)(?:\s+"([^"]*)"\s+"([^"]*)")?/;

// iptables/ufw log
// Mar  8 10:23:45 hostname kernel: [UFW BLOCK] IN=eth0 OUT= MAC=... SRC=1.2.3.4 DST=5.6.7.8 ... PROTO=TCP SPT=12345 DPT=22
const IPTABLES_REGEX = /SRC=(\S+).*?DPT=(\d+).*?PROTO=(\w+)/;

// syslog auth.log
// Mar  8 10:23:45 hostname sshd[1234]: Failed password for root from 1.2.3.4 port 12345 ssh2
const SSHD_REGEX = /(\w+\s+\d+\s+\d+:\d+:\d+).*?from\s+(\d+\.\d+\.\d+\.\d+)\s+port\s+(\d+)/;

function parseLogLine(line: string): LogEntry | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  // Try Nginx/Apache combined
  const nginxMatch = trimmed.match(NGINX_REGEX);
  if (nginxMatch) {
    const [, ip, timeStr, method, path, status, bytes, referer = "", ua = ""] = nginxMatch;
    let timestamp: Date | null = null;
    try {
      // Parse: 10/Oct/2000:13:55:36 -0700
      const cleaned = timeStr.replace(/(\d+)\/(\w+)\/(\d+):/, "$1 $2 $3 ");
      timestamp = new Date(cleaned);
      if (isNaN(timestamp.getTime())) timestamp = null;
    } catch { timestamp = null; }
    return { ip, timestamp, method, path, status: parseInt(status), bytes: parseInt(bytes), userAgent: ua, referer, raw: trimmed };
  }

  // Try iptables
  const iptMatch = trimmed.match(IPTABLES_REGEX);
  if (iptMatch) {
    const [, ip, dpt, proto] = iptMatch;
    return { ip, timestamp: null, method: proto, path: `:${dpt}`, status: 0, bytes: 0, userAgent: "iptables", referer: "", raw: trimmed };
  }

  // Try sshd
  const sshdMatch = trimmed.match(SSHD_REGEX);
  if (sshdMatch) {
    const [, timeStr, ip, port] = sshdMatch;
    let timestamp: Date | null = null;
    try { timestamp = new Date(`${timeStr} ${new Date().getFullYear()}`); } catch { timestamp = null; }
    const isFailure = trimmed.includes("Failed") || trimmed.includes("Invalid") || trimmed.includes("error");
    return { ip, timestamp, method: "SSH", path: `:${port}`, status: isFailure ? 401 : 200, bytes: 0, userAgent: "sshd", referer: "", raw: trimmed };
  }

  // Generic IP extraction
  const ipMatch = trimmed.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
  if (ipMatch) {
    return { ip: ipMatch[1], timestamp: null, method: "UNKNOWN", path: "/", status: 0, bytes: 0, userAgent: "", referer: "", raw: trimmed };
  }

  return null;
}

function detectAnomalies(entries: LogEntry[]): AnomalyFlag[] {
  const anomalies: AnomalyFlag[] = [];
  const ipGroups: Record<string, LogEntry[]> = {};

  for (const e of entries) {
    if (!ipGroups[e.ip]) ipGroups[e.ip] = [];
    ipGroups[e.ip].push(e);
  }

  for (const [ip, logs] of Object.entries(ipGroups)) {
    // Brute force: >20 auth failures
    const authFails = logs.filter(l => l.status === 401 || l.status === 403 || l.path.includes("login") || l.path.includes("admin")).length;
    if (authFails > 20) {
      anomalies.push({ type: "brute_force", severity: "critical", ip, description: `${authFails} prób autoryzacji z jednego IP`, count: authFails });
    }

    // High volume: >500 requests
    if (logs.length > 500) {
      anomalies.push({ type: "high_volume", severity: "high", ip, description: `${logs.length} żądań z jednego IP`, count: logs.length });
    }

    // Error flood: >50 5xx errors
    const serverErrors = logs.filter(l => l.status >= 500).length;
    if (serverErrors > 50) {
      anomalies.push({ type: "error_flood", severity: "high", ip, description: `${serverErrors} błędów 5xx`, count: serverErrors });
    }

    // Suspicious paths
    const suspiciousPaths = logs.filter(l =>
      /\/(wp-admin|phpmyadmin|\.env|\.git|admin|passwd|shadow|etc\/|proc\/|shell|cmd|exec|eval)/i.test(l.path)
    ).length;
    if (suspiciousPaths > 0) {
      anomalies.push({ type: "suspicious_path", severity: "high", ip, description: `${suspiciousPaths} żądań do podejrzanych ścieżek`, count: suspiciousPaths });
    }

    // Unusual hours (2-5 AM)
    const nightRequests = logs.filter(l => {
      if (!l.timestamp) return false;
      const h = l.timestamp.getHours();
      return h >= 2 && h <= 5;
    }).length;
    if (nightRequests > 50) {
      anomalies.push({ type: "unusual_hours", severity: "medium", ip, description: `${nightRequests} żądań w godzinach 2-5 AM`, count: nightRequests });
    }

    // Port scan: many different ports
    const portsArr = logs.map(l => l.path).filter(p => p.startsWith(":"));
    const ports = new Set(portsArr);
    if (ports.size > 10) {
      anomalies.push({ type: "port_scan", severity: "critical", ip, description: `Skanowanie ${ports.size} portów`, count: ports.size });
    }
  }

  return anomalies;
}

function buildIPStats(entries: LogEntry[], anomalies: AnomalyFlag[]): IPStats[] {
  const ipGroups: Record<string, LogEntry[]> = {};
  for (const e of entries) {
    if (!ipGroups[e.ip]) ipGroups[e.ip] = [];
    ipGroups[e.ip].push(e);
  }

  return Object.entries(ipGroups).map(([ip, logs]) => {
    const methods: Record<string, number> = {};
    const statuses: Record<string, number> = {};
    let totalBytes = 0;
    let firstSeen: Date | null = null;
    let lastSeen: Date | null = null;

    for (const l of logs) {
      methods[l.method] = (methods[l.method] || 0) + 1;
      const statusKey = `${Math.floor(l.status / 100)}xx`;
      statuses[statusKey] = (statuses[statusKey] || 0) + 1;
      totalBytes += l.bytes;
      if (l.timestamp) {
        if (!firstSeen || l.timestamp < firstSeen) firstSeen = l.timestamp;
        if (!lastSeen || l.timestamp > lastSeen) lastSeen = l.timestamp;
      }
    }

    const ipAnomalies = anomalies.filter(a => a.ip === ip);
    let riskScore = 0;
    for (const a of ipAnomalies) {
      riskScore += a.severity === "critical" ? 40 : a.severity === "high" ? 25 : a.severity === "medium" ? 15 : 5;
    }
    riskScore = Math.min(100, riskScore);

    const pathSet = new Set(logs.map(l => l.path));
    const uniquePaths = Array.from(pathSet).slice(0, 10);

    return { ip, count: logs.length, methods, statuses, paths: uniquePaths, firstSeen, lastSeen, bytes: totalBytes, anomalies: ipAnomalies, riskScore };
  }).sort((a, b) => b.count - a.count);
}

// ─── Sample Log Generator ─────────────────────────────────────────────────────

const SAMPLE_LOG = `192.168.1.100 - - [08/Mar/2026:10:23:45 +0100] "GET /index.html HTTP/1.1" 200 2326 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
10.0.0.5 - - [08/Mar/2026:10:24:01 +0100] "POST /api/login HTTP/1.1" 401 512 "-" "python-requests/2.28.0"
10.0.0.5 - - [08/Mar/2026:10:24:02 +0100] "POST /api/login HTTP/1.1" 401 512 "-" "python-requests/2.28.0"
10.0.0.5 - - [08/Mar/2026:10:24:03 +0100] "POST /api/login HTTP/1.1" 401 512 "-" "python-requests/2.28.0"
10.0.0.5 - - [08/Mar/2026:10:24:04 +0100] "POST /api/login HTTP/1.1" 401 512 "-" "python-requests/2.28.0"
10.0.0.5 - - [08/Mar/2026:10:24:05 +0100] "POST /api/login HTTP/1.1" 401 512 "-" "python-requests/2.28.0"
10.0.0.5 - - [08/Mar/2026:10:24:06 +0100] "POST /api/login HTTP/1.1" 401 512 "-" "python-requests/2.28.0"
10.0.0.5 - - [08/Mar/2026:10:24:07 +0100] "POST /api/login HTTP/1.1" 401 512 "-" "python-requests/2.28.0"
10.0.0.5 - - [08/Mar/2026:10:24:08 +0100] "POST /api/login HTTP/1.1" 401 512 "-" "python-requests/2.28.0"
10.0.0.5 - - [08/Mar/2026:10:24:09 +0100] "POST /api/login HTTP/1.1" 401 512 "-" "python-requests/2.28.0"
10.0.0.5 - - [08/Mar/2026:10:24:10 +0100] "POST /api/login HTTP/1.1" 401 512 "-" "python-requests/2.28.0"
10.0.0.5 - - [08/Mar/2026:10:24:11 +0100] "POST /api/login HTTP/1.1" 401 512 "-" "python-requests/2.28.0"
10.0.0.5 - - [08/Mar/2026:10:24:12 +0100] "POST /api/login HTTP/1.1" 401 512 "-" "python-requests/2.28.0"
10.0.0.5 - - [08/Mar/2026:10:24:13 +0100] "POST /api/login HTTP/1.1" 401 512 "-" "python-requests/2.28.0"
10.0.0.5 - - [08/Mar/2026:10:24:14 +0100] "POST /api/login HTTP/1.1" 401 512 "-" "python-requests/2.28.0"
10.0.0.5 - - [08/Mar/2026:10:24:15 +0100] "POST /api/login HTTP/1.1" 401 512 "-" "python-requests/2.28.0"
10.0.0.5 - - [08/Mar/2026:10:24:16 +0100] "POST /api/login HTTP/1.1" 401 512 "-" "python-requests/2.28.0"
10.0.0.5 - - [08/Mar/2026:10:24:17 +0100] "POST /api/login HTTP/1.1" 401 512 "-" "python-requests/2.28.0"
10.0.0.5 - - [08/Mar/2026:10:24:18 +0100] "POST /api/login HTTP/1.1" 401 512 "-" "python-requests/2.28.0"
10.0.0.5 - - [08/Mar/2026:10:24:19 +0100] "POST /api/login HTTP/1.1" 401 512 "-" "python-requests/2.28.0"
10.0.0.5 - - [08/Mar/2026:10:24:20 +0100] "POST /api/login HTTP/1.1" 401 512 "-" "python-requests/2.28.0"
172.16.0.99 - - [08/Mar/2026:03:15:00 +0100] "GET /wp-admin/admin-ajax.php HTTP/1.1" 404 1024 "-" "Googlebot/2.1"
172.16.0.99 - - [08/Mar/2026:03:16:00 +0100] "GET /.env HTTP/1.1" 403 256 "-" "curl/7.68.0"
172.16.0.99 - - [08/Mar/2026:03:17:00 +0100] "GET /phpmyadmin/ HTTP/1.1" 404 512 "-" "curl/7.68.0"
192.168.1.200 - - [08/Mar/2026:14:30:00 +0100] "GET /dashboard HTTP/1.1" 200 8192 "https://mysite.com" "Mozilla/5.0"
192.168.1.200 - - [08/Mar/2026:14:31:00 +0100] "GET /api/data HTTP/1.1" 200 4096 "https://mysite.com" "Mozilla/5.0"
192.168.1.200 - - [08/Mar/2026:14:32:00 +0100] "POST /api/save HTTP/1.1" 201 256 "https://mysite.com" "Mozilla/5.0"`;

// ─── Colors ───────────────────────────────────────────────────────────────────

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NetworkScanner() {
  const [rawLog, setRawLog] = useState("");
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [ipStats, setIPStats] = useState<IPStats[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyFlag[]>([]);
  const [parsed, setParsed] = useState(false);
  const [searchIP, setSearchIP] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const parseLog = useCallback(() => {
    if (!rawLog.trim()) { toast.error("Wklej logi do analizy"); return; }
    const lines = rawLog.split("\n");
    const parsed: LogEntry[] = [];
    let failed = 0;
    for (const line of lines) {
      const entry = parseLogLine(line);
      if (entry) parsed.push(entry);
      else if (line.trim()) failed++;
    }
    if (parsed.length === 0) { toast.error("Nie rozpoznano żadnych wpisów logów"); return; }
    const detectedAnomalies = detectAnomalies(parsed);
    const stats = buildIPStats(parsed, detectedAnomalies);
    setEntries(parsed);
    setAnomalies(detectedAnomalies);
    setIPStats(stats);
    setParsed(true);
    toast.success(`Przeanalizowano ${parsed.length} wpisów, ${failed} pominięto. Wykryto ${detectedAnomalies.length} anomalii.`);
  }, [rawLog]);

  const loadSample = () => {
    setRawLog(SAMPLE_LOG);
    toast.info("Załadowano przykładowe logi Nginx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Plik zbyt duży (maks. 10 MB)"); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      setRawLog(ev.target?.result as string || "");
      toast.success(`Załadowano plik: ${file.name}`);
    };
    reader.readAsText(file);
  };

  const exportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      totalEntries: entries.length,
      uniqueIPs: ipStats.length,
      anomalies: anomalies.length,
      topIPs: ipStats.slice(0, 10),
      anomalyDetails: anomalies,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `network-scan-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Raport wyeksportowany");
  };

  // Chart data
  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      const key = `${Math.floor(e.status / 100)}xx`;
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [entries]);

  const methodChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      counts[e.method] = (counts[e.method] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [entries]);

  const topIPsChartData = useMemo(() =>
    ipStats.slice(0, 10).map(s => ({ ip: s.ip.split(".").slice(-2).join("."), count: s.count, risk: s.riskScore })),
    [ipStats]
  );

  const filteredStats = useMemo(() =>
    searchIP ? ipStats.filter(s => s.ip.includes(searchIP)) : ipStats,
    [ipStats, searchIP]
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono flex items-center gap-2">
            <Network className="w-6 h-6 text-primary" />
            Network Scanner
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pasywna analiza logów sieciowych — Nginx, Apache, iptables, sshd. Wykrywanie anomalii i ataków.
          </p>
        </div>
        {parsed && (
          <Button variant="outline" size="sm" onClick={exportReport} className="border-border">
            <Download className="w-4 h-4 mr-2" /> Eksportuj raport
          </Button>
        )}
      </div>

      {/* Input section */}
      {!parsed ? (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Wczytaj logi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-400 font-mono">
                Obsługiwane formaty: <strong>Nginx/Apache Combined Log</strong>, <strong>iptables/ufw</strong>, <strong>sshd auth.log</strong>. Logi przetwarzane są lokalnie — żadne dane nie są wysyłane na serwer.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadSample} className="border-border">
                <Eye className="w-4 h-4 mr-2" /> Przykładowe logi
              </Button>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" className="border-border" asChild>
                  <span><Upload className="w-4 h-4 mr-2" /> Wczytaj plik</span>
                </Button>
                <input type="file" accept=".log,.txt,.access" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground font-mono mb-1 block">Wklej logi (maks. 10 MB)</Label>
              <Textarea
                value={rawLog}
                onChange={e => setRawLog(e.target.value)}
                placeholder="192.168.1.1 - - [08/Mar/2026:10:23:45 +0100] &quot;GET /index.html HTTP/1.1&quot; 200 2326..."
                className="bg-background border-border font-mono text-xs min-h-[200px] resize-none"
              />
              <div className="text-xs text-muted-foreground font-mono mt-1">{rawLog.split("\n").length} linii</div>
            </div>

            <Button onClick={parseLog} className="w-full bg-primary text-primary-foreground">
              <Activity className="w-4 h-4 mr-2" /> Analizuj logi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Wpisy logów", value: entries.length.toLocaleString(), icon: Activity, color: "text-blue-400" },
              { label: "Unikalne IP", value: ipStats.length, icon: Globe, color: "text-green-400" },
              { label: "Anomalie", value: anomalies.length, icon: AlertTriangle, color: anomalies.length > 0 ? "text-red-400" : "text-green-400" },
              { label: "Krytyczne", value: anomalies.filter(a => a.severity === "critical").length, icon: Zap, color: "text-orange-400" },
            ].map(s => (
              <Card key={s.label} className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <s.icon className={`w-8 h-8 ${s.color}`} />
                  <div>
                    <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setParsed(false); setRawLog(""); }} className="border-border">
              <RefreshCw className="w-4 h-4 mr-2" /> Nowa analiza
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="overview" className="font-mono text-xs">Przegląd</TabsTrigger>
              <TabsTrigger value="anomalies" className="font-mono text-xs">
                Anomalie {anomalies.length > 0 && <Badge className="ml-1 bg-red-500/20 text-red-400 border-red-500/30 text-xs">{anomalies.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="ips" className="font-mono text-xs">Adresy IP</TabsTrigger>
              <TabsTrigger value="raw" className="font-mono text-xs">Surowe dane</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-mono text-muted-foreground uppercase">Top 10 IP (liczba żądań)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={topIPsChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" tick={{ fill: "#888", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                        <YAxis dataKey="ip" type="category" tick={{ fill: "#888", fontSize: 9, fontFamily: "JetBrains Mono" }} width={80} />
                        <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", fontFamily: "JetBrains Mono", fontSize: 11 }} />
                        <Bar dataKey="count" fill="#22c55e" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-mono text-muted-foreground uppercase">Kody statusu HTTP</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={statusChartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {statusChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", fontFamily: "JetBrains Mono", fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-mono text-muted-foreground uppercase">Metody HTTP</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={methodChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                        <YAxis tick={{ fill: "#888", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                        <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", fontFamily: "JetBrains Mono", fontSize: 11 }} />
                        <Bar dataKey="value" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-mono text-muted-foreground uppercase">Risk Score — Top IP</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={topIPsChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="ip" tick={{ fill: "#888", fontSize: 9, fontFamily: "JetBrains Mono" }} />
                        <YAxis domain={[0, 100]} tick={{ fill: "#888", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                        <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", fontFamily: "JetBrains Mono", fontSize: 11 }} />
                        <Bar dataKey="risk" fill="#ef4444" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Anomalies */}
            <TabsContent value="anomalies" className="mt-4 space-y-3">
              {anomalies.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-muted-foreground font-mono">Nie wykryto anomalii w analizowanych logach</p>
                </div>
              ) : (
                anomalies.map((a, i) => (
                  <Card key={i} className={`bg-card border ${a.severity === "critical" ? "border-red-500/50" : a.severity === "high" ? "border-orange-500/50" : "border-border"}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${a.severity === "critical" ? "text-red-400" : a.severity === "high" ? "text-orange-400" : "text-yellow-400"}`} />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={`text-xs border ${SEVERITY_COLORS[a.severity]}`}>{a.severity.toUpperCase()}</Badge>
                              <Badge className="text-xs border border-border bg-background text-muted-foreground font-mono">{a.type.replace("_", " ")}</Badge>
                            </div>
                            <p className="text-sm text-foreground font-mono">{a.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">IP: <span className="text-primary">{a.ip}</span> · Liczba: <span className="text-foreground">{a.count}</span></p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-muted-foreground font-mono">Risk</div>
                          <div className={`text-lg font-bold font-mono ${a.severity === "critical" ? "text-red-400" : a.severity === "high" ? "text-orange-400" : "text-yellow-400"}`}>
                            {a.severity === "critical" ? "HIGH" : a.severity === "high" ? "MED" : "LOW"}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* IP Details */}
            <TabsContent value="ips" className="mt-4 space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={searchIP} onChange={e => setSearchIP(e.target.value)} placeholder="Filtruj po IP..." className="pl-9 bg-background border-border font-mono text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                {filteredStats.slice(0, 50).map(s => (
                  <Card key={s.ip} className={`bg-card border ${s.riskScore >= 40 ? "border-red-500/40" : s.riskScore >= 20 ? "border-orange-500/40" : "border-border"}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${s.riskScore >= 40 ? "bg-red-400" : s.riskScore >= 20 ? "bg-orange-400" : "bg-green-400"}`} />
                          <div className="min-w-0">
                            <div className="font-mono text-sm text-primary font-bold">{s.ip}</div>
                            <div className="text-xs text-muted-foreground font-mono truncate">
                              {Object.entries(s.methods).map(([m, c]) => `${m}:${c}`).join(" · ")}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-sm font-bold font-mono text-foreground">{s.count.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">żądań</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-bold font-mono ${s.riskScore >= 40 ? "text-red-400" : s.riskScore >= 20 ? "text-orange-400" : "text-green-400"}`}>{s.riskScore}</div>
                            <div className="text-xs text-muted-foreground">risk</div>
                          </div>
                          {s.anomalies.length > 0 && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">{s.anomalies.length} anomalii</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredStats.length > 50 && (
                  <p className="text-xs text-muted-foreground font-mono text-center">Pokazano 50 z {filteredStats.length} adresów IP</p>
                )}
              </div>
            </TabsContent>

            {/* Raw entries */}
            <TabsContent value="raw" className="mt-4">
              <Card className="bg-card border-border">
                <CardContent className="p-0">
                  <div className="overflow-auto max-h-[500px]">
                    <table className="w-full text-xs font-mono">
                      <thead className="sticky top-0 bg-card border-b border-border">
                        <tr>
                          <th className="text-left p-2 text-muted-foreground">IP</th>
                          <th className="text-left p-2 text-muted-foreground">Metoda</th>
                          <th className="text-left p-2 text-muted-foreground">Ścieżka</th>
                          <th className="text-left p-2 text-muted-foreground">Status</th>
                          <th className="text-left p-2 text-muted-foreground">Bajty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.slice(0, 200).map((e, i) => (
                          <tr key={i} className={`border-b border-border/30 ${e.status >= 400 ? "bg-red-500/5" : ""}`}>
                            <td className="p-2 text-primary">{e.ip}</td>
                            <td className="p-2 text-blue-400">{e.method}</td>
                            <td className="p-2 text-foreground truncate max-w-[200px]">{e.path}</td>
                            <td className={`p-2 font-bold ${e.status >= 500 ? "text-red-400" : e.status >= 400 ? "text-orange-400" : e.status >= 300 ? "text-yellow-400" : "text-green-400"}`}>{e.status || "-"}</td>
                            <td className="p-2 text-muted-foreground">{e.bytes > 0 ? e.bytes.toLocaleString() : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {entries.length > 200 && (
                      <p className="text-xs text-muted-foreground font-mono text-center p-3">Pokazano 200 z {entries.length} wpisów</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
