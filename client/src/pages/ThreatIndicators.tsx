import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Radar, Plus, Shield, AlertTriangle, Eye, CheckCircle2, X, Search, Activity } from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-red-500/20 text-red-400 border-red-500/30",
  monitoring: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  mitigated: "bg-green-500/20 text-green-400 border-green-500/30",
  false_positive: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const TYPE_LABELS: Record<string, string> = {
  ioc: "IOC",
  ttp: "TTP",
  vulnerability: "Podatność",
  risk_factor: "Czynnik ryzyka",
  anomaly: "Anomalia",
};

const BUILT_IN_THREATS = [
  { type: "risk_factor" as const, title: "Urządzenie online w sieci operacyjnej", description: "Urządzenie operacyjne podłączone do internetu zwiększa powierzchnię ataku. Zalecana izolacja air-gap.", severity: "high" as const, source: "OPSEC Best Practices" },
  { type: "vulnerability" as const, title: "Brak szyfrowania dysku", description: "Urządzenie bez pełnego szyfrowania dysku (FDE) jest podatne na kradzież danych przy fizycznym dostępie.", severity: "critical" as const, source: "NIST SP 800-111" },
  { type: "ttp" as const, title: "Atak TEMPEST (emisja EM)", description: "Przechwytywanie danych poprzez emisję elektromagnetyczną urządzeń. Mitygacja: klatka Faradaya, ekranowanie.", severity: "medium" as const, source: "NSA TEMPEST Standards" },
  { type: "ttp" as const, title: "Cold Boot Attack", description: "Odczyt zawartości RAM po nagłym wyłączeniu. Mitygacja: szyfrowanie pamięci, szybkie czyszczenie RAM.", severity: "high" as const, source: "Princeton University Research" },
  { type: "risk_factor" as const, title: "Metadane w plikach", description: "Pliki Office/PDF/EXIF zawierają metadane ujawniające informacje o autorze, lokalizacji, urządzeniu.", severity: "medium" as const, source: "OPSEC Guidelines" },
  { type: "vulnerability" as const, title: "Niezaszyfrowane kopie zapasowe", description: "Kopie zapasowe przechowywane bez szyfrowania stanowią punkt wycieku danych.", severity: "high" as const, source: "ISO 27001" },
  { type: "anomaly" as const, title: "Nieznane urządzenie w sieci", description: "Wykryto urządzenie nieznane w rejestrze. Może wskazywać na nieautoryzowany dostęp.", severity: "critical" as const, source: "Network Monitoring" },
  { type: "risk_factor" as const, title: "Słabe hasła / brak 2FA", description: "Konta bez silnych haseł i uwierzytelniania dwuskładnikowego są podatne na brute-force i phishing.", severity: "critical" as const, source: "OWASP Top 10" },
];

type Threat = {
  id: number;
  type: string;
  title: string;
  description?: string | null;
  severity: string;
  status: string;
  source?: string | null;
  mitigationNote?: string | null;
  createdAt: Date;
};

function ThreatCard({ threat, onRefresh }: { threat: Threat; onRefresh: () => void }) {
  const [mitigationNote, setMitigationNote] = useState(threat.mitigationNote || "");
  const [showMitigation, setShowMitigation] = useState(false);

  const mitigateMutation = trpc.threats.mitigate.useMutation({
    onSuccess: () => { toast.success("Zagrożenie złagodzone"); onRefresh(); }
  });
  const updateMutation = trpc.threats.update.useMutation({ onSuccess: onRefresh });
  const deleteMutation = trpc.threats.delete.useMutation({
    onSuccess: () => { toast.success("Usunięto"); onRefresh(); }
  });

  return (
    <Card className={`bg-slate-900/50 border-slate-700/50 hover:border-slate-600/50 transition-all ${threat.status === "active" && threat.severity === "critical" ? "border-l-2 border-l-red-500" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className="text-xs font-mono border-slate-600 text-slate-400">
                {TYPE_LABELS[threat.type] || threat.type}
              </Badge>
              <Badge className={`text-xs border ${SEVERITY_COLORS[threat.severity] || ""}`}>
                {threat.severity.toUpperCase()}
              </Badge>
              <Badge className={`text-xs border ${STATUS_COLORS[threat.status] || ""}`}>
                {threat.status === "active" ? "AKTYWNE" : threat.status === "mitigated" ? "ZŁAGODZONE" : threat.status === "monitoring" ? "MONITORING" : "FALSE POSITIVE"}
              </Badge>
            </div>
            <p className="font-mono font-semibold text-slate-100 text-sm">{threat.title}</p>
            {threat.description && (
              <p className="text-xs text-slate-400 mt-1">{threat.description}</p>
            )}
            {threat.source && (
              <p className="text-xs text-slate-600 mt-1 font-mono">Źródło: {threat.source}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {threat.status === "active" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                onClick={() => setShowMitigation(!showMitigation)}
              >
                <Shield className="w-3 h-3 mr-1" /> Złagodź
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                onClick={() => updateMutation.mutate({ id: threat.id, status: "monitoring" })}
              >
                <Eye className="w-3 h-3 mr-1" /> Monitoring
              </Button>
            </>
          )}
          {threat.status === "monitoring" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
              onClick={() => setShowMitigation(!showMitigation)}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" /> Złagodź
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-slate-500/30 text-slate-400 hover:bg-slate-500/10"
            onClick={() => updateMutation.mutate({ id: threat.id, status: "false_positive" })}
          >
            False Positive
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-auto"
            onClick={() => deleteMutation.mutate({ id: threat.id })}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>

        {/* Mitigation input */}
        {showMitigation && (
          <div className="mt-3 space-y-2">
            <Textarea
              value={mitigationNote}
              onChange={e => setMitigationNote(e.target.value)}
              placeholder="Opisz podjęte kroki mitygacji..."
              className="text-xs bg-slate-800 border-slate-700 text-slate-300 min-h-[60px] font-mono"
            />
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 font-mono text-xs"
              onClick={() => {
                mitigateMutation.mutate({ id: threat.id, note: mitigationNote });
                setShowMitigation(false);
              }}
            >
              Potwierdź mitygację
            </Button>
          </div>
        )}

        {threat.mitigationNote && threat.status === "mitigated" && (
          <div className="mt-2 p-2 bg-green-500/5 border border-green-500/20 rounded text-xs text-green-400 font-mono">
            ✓ {threat.mitigationNote}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddThreatDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "risk_factor" as "ioc" | "ttp" | "vulnerability" | "risk_factor" | "anomaly",
    severity: "medium" as "critical" | "high" | "medium" | "low",
    source: "",
  });

  const createMutation = trpc.threats.create.useMutation({
    onSuccess: () => {
      toast.success("Zagrożenie dodane");
      setOpen(false);
      setForm({ title: "", description: "", type: "risk_factor", severity: "medium", source: "" });
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-slate-100 font-mono">
          <Plus className="w-4 h-4 mr-2" /> DODAJ ZAGROŻENIE
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-100 font-mono flex items-center gap-2">
            <Radar className="w-5 h-5 text-orange-400" /> Nowy Wskaźnik Zagrożenia
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-slate-400 text-xs font-mono">TYTUŁ *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-slate-100 font-mono mt-1"
              placeholder="Nazwa zagrożenia" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-400 text-xs font-mono">TYP</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as typeof form.type }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 font-mono mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v} className="font-mono text-slate-200">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400 text-xs font-mono">POZIOM</Label>
              <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v as typeof form.severity }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 font-mono mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {["critical", "high", "medium", "low"].map(s => (
                    <SelectItem key={s} value={s} className="font-mono text-slate-200">{s.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-slate-400 text-xs font-mono">OPIS</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-slate-100 font-mono mt-1 min-h-[80px]"
              placeholder="Opis zagrożenia i potencjalny wpływ..." />
          </div>
          <div>
            <Label className="text-slate-400 text-xs font-mono">ŹRÓDŁO</Label>
            <Input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-slate-100 font-mono mt-1"
              placeholder="np. NIST, własna analiza, CVE-2024-..." />
          </div>
          <Button
            className="w-full bg-orange-600 hover:bg-orange-700 font-mono"
            onClick={() => createMutation.mutate(form)}
            disabled={!form.title || createMutation.isPending}
          >
            DODAJ ZAGROŻENIE
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ThreatIndicators() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { data: threats = [], refetch } = trpc.threats.list.useQuery();
  const createMutation = trpc.threats.create.useMutation({ onSuccess: () => refetch() });

  const filtered = threats.filter(t => {
    const matchFilter = filter === "all" || t.status === filter || t.severity === filter || t.type === filter;
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
    return matchFilter && matchSearch;
  });

  const activeCount = threats.filter(t => t.status === "active").length;
  const criticalCount = threats.filter(t => t.severity === "critical" && t.status === "active").length;
  const mitigatedCount = threats.filter(t => t.status === "mitigated").length;
  const monitoringCount = threats.filter(t => t.status === "monitoring").length;

  const handleSeedBuiltIn = () => {
    BUILT_IN_THREATS.forEach(t => createMutation.mutate(t));
    toast.success(`Załadowano ${BUILT_IN_THREATS.length} wbudowanych wskaźników zagrożeń`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-mono font-bold text-slate-100 flex items-center gap-2">
            <Radar className="w-6 h-6 text-orange-400" />
            THREAT INDICATORS
          </h1>
          <p className="text-slate-400 text-sm mt-1">IOC, TTP, podatności i czynniki ryzyka</p>
        </div>
        <div className="flex gap-2">
          {threats.length === 0 && (
            <Button
              variant="outline"
              className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 font-mono text-xs"
              onClick={handleSeedBuiltIn}
            >
              <Activity className="w-4 h-4 mr-2" /> ZAŁADUJ WBUDOWANE
            </Button>
          )}
          <AddThreatDialog onCreated={refetch} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "AKTYWNE", value: activeCount, color: "text-red-400" },
          { label: "KRYTYCZNE", value: criticalCount, color: "text-orange-400" },
          { label: "MONITORING", value: monitoringCount, color: "text-yellow-400" },
          { label: "ZŁAGODZONE", value: mitigatedCount, color: "text-green-400" },
        ].map(stat => (
          <Card key={stat.label} className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <p className={`text-2xl font-mono font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-500 font-mono">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj zagrożeń..."
            className="pl-9 bg-slate-900 border-slate-700 text-slate-100 font-mono"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "active", "monitoring", "mitigated", "critical", "high", "ioc", "vulnerability"].map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              className={`font-mono text-xs ${filter === f ? "bg-orange-600 hover:bg-orange-700" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}
              onClick={() => setFilter(f)}
            >
              {f.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Threat List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Radar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-mono">
            {threats.length === 0 ? "Brak wskaźników zagrożeń" : "Brak wyników"}
          </p>
          {threats.length === 0 && (
            <p className="text-xs mt-2 text-slate-600">Kliknij "ZAŁADUJ WBUDOWANE" aby dodać predefiniowane zagrożenia</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(threat => (
            <ThreatCard key={threat.id} threat={threat} onRefresh={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}
