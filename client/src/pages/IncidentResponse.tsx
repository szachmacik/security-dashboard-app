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
import {
  AlertTriangle, Plus, CheckCircle2, Clock, Search,
  Flame, Shield, Eye, X, ChevronDown, ChevronUp, FileText
} from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  info: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-500/20 text-red-400 border-red-500/30",
  investigating: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  contained: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  resolved: "bg-green-500/20 text-green-400 border-green-500/30",
  closed: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <Flame className="w-3 h-3" />,
  investigating: <Search className="w-3 h-3" />,
  contained: <Shield className="w-3 h-3" />,
  resolved: <CheckCircle2 className="w-3 h-3" />,
  closed: <X className="w-3 h-3" />,
};

const CATEGORIES = [
  { value: "physical_breach", label: "Naruszenie fizyczne" },
  { value: "network_intrusion", label: "Intruzja sieciowa" },
  { value: "device_compromise", label: "Kompromitacja urządzenia" },
  { value: "data_leak", label: "Wyciek danych" },
  { value: "social_engineering", label: "Inżynieria społeczna" },
  { value: "malware", label: "Złośliwe oprogramowanie" },
  { value: "unauthorized_access", label: "Nieautoryzowany dostęp" },
  { value: "other", label: "Inne" },
];

type Incident = {
  id: number;
  title: string;
  description?: string | null;
  severity: string;
  status: string;
  category: string;
  affectedDevices?: string | null;
  mitigationSteps?: string | null;
  timeline?: string | null;
  reportedBy?: string | null;
  createdAt: Date;
  resolvedAt?: Date | null;
};

function IncidentCard({ incident, onRefresh }: { incident: Incident; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editStatus, setEditStatus] = useState(incident.status);
  const [mitigationNote, setMitigationNote] = useState(incident.mitigationSteps || "");

  const updateMutation = trpc.incidents.update.useMutation({ onSuccess: onRefresh });
  const resolveMutation = trpc.incidents.resolve.useMutation({
    onSuccess: () => { toast.success("Incydent rozwiązany"); onRefresh(); }
  });
  const deleteMutation = trpc.incidents.delete.useMutation({
    onSuccess: () => { toast.success("Incydent usunięty"); onRefresh(); }
  });

  const handleStatusChange = (status: string) => {
    setEditStatus(status);
    updateMutation.mutate({ id: incident.id, status: status as "open" | "investigating" | "contained" | "resolved" | "closed" });
    toast.success(`Status zmieniony na: ${status}`);
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 hover:border-slate-600/50 transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${incident.severity === "critical" ? "text-red-400" : incident.severity === "high" ? "text-orange-400" : "text-yellow-400"}`} />
            <span className="font-mono font-semibold text-slate-100 truncate">{incident.title}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={`text-xs border ${SEVERITY_COLORS[incident.severity] || SEVERITY_COLORS.info}`}>
              {incident.severity.toUpperCase()}
            </Badge>
            <Badge className={`text-xs border flex items-center gap-1 ${STATUS_COLORS[incident.status] || STATUS_COLORS.open}`}>
              {STATUS_ICONS[incident.status]}
              {incident.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-slate-500 font-mono">
            {CATEGORIES.find(c => c.value === incident.category)?.label || incident.category}
          </span>
          <span className="text-xs text-slate-600">•</span>
          <span className="text-xs text-slate-500 font-mono">
            {new Date(incident.createdAt).toLocaleDateString("pl-PL")}
          </span>
          {incident.reportedBy && (
            <>
              <span className="text-xs text-slate-600">•</span>
              <span className="text-xs text-slate-500">Zgłosił: {incident.reportedBy}</span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {incident.description && (
          <p className="text-sm text-slate-400 mb-3">{incident.description}</p>
        )}

        {/* Quick actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={editStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-7 w-40 text-xs bg-slate-800 border-slate-700 font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {["open", "investigating", "contained", "resolved", "closed"].map(s => (
                <SelectItem key={s} value={s} className="text-xs font-mono">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {incident.status !== "resolved" && incident.status !== "closed" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
              onClick={() => resolveMutation.mutate({ id: incident.id, mitigationSteps: mitigationNote })}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" /> Rozwiąż
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-slate-400 hover:text-slate-200 ml-auto"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Szczegóły
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={() => deleteMutation.mutate({ id: incident.id })}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-4 space-y-3 border-t border-slate-700/50 pt-3">
            {incident.affectedDevices && (
              <div>
                <p className="text-xs text-slate-500 font-mono mb-1">DOTKNIĘTE URZĄDZENIA</p>
                <p className="text-sm text-slate-300">{incident.affectedDevices}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 font-mono mb-1">KROKI MITYGACJI</p>
              <Textarea
                value={mitigationNote}
                onChange={e => setMitigationNote(e.target.value)}
                onBlur={() => updateMutation.mutate({ id: incident.id, mitigationSteps: mitigationNote })}
                placeholder="Opisz podjęte kroki mitygacji..."
                className="text-xs bg-slate-800 border-slate-700 text-slate-300 min-h-[60px] font-mono"
              />
            </div>
            {incident.timeline && (
              <div>
                <p className="text-xs text-slate-500 font-mono mb-1">TIMELINE</p>
                <p className="text-sm text-slate-300 whitespace-pre-wrap font-mono">{incident.timeline}</p>
              </div>
            )}
            {incident.resolvedAt && (
              <p className="text-xs text-green-400 font-mono">
                ✓ Rozwiązano: {new Date(incident.resolvedAt).toLocaleString("pl-PL")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateIncidentDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    severity: "medium" as "critical" | "high" | "medium" | "low" | "info",
    category: "other" as string,
    affectedDevices: "",
    mitigationSteps: "",
    reportedBy: "",
  });

  const createMutation = trpc.incidents.create.useMutation({
    onSuccess: () => {
      toast.success("Incydent zgłoszony!");
      setOpen(false);
      setForm({ title: "", description: "", severity: "medium", category: "other", affectedDevices: "", mitigationSteps: "", reportedBy: "" });
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-red-600 hover:bg-red-700 text-white font-mono">
          <Plus className="w-4 h-4 mr-2" /> ZGŁOŚ INCYDENT
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-100 font-mono flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" /> Nowy Incydent Bezpieczeństwa
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-slate-400 text-xs font-mono">TYTUŁ *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-slate-100 font-mono mt-1"
              placeholder="Krótki opis incydentu" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-400 text-xs font-mono">POZIOM ZAGROŻENIA</Label>
              <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v as typeof form.severity }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 font-mono mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {["critical", "high", "medium", "low", "info"].map(s => (
                    <SelectItem key={s} value={s} className="font-mono text-slate-200">{s.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400 text-xs font-mono">KATEGORIA</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 font-mono mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value} className="text-slate-200">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-slate-400 text-xs font-mono">OPIS</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-slate-100 font-mono mt-1 min-h-[80px]"
              placeholder="Szczegółowy opis incydentu..." />
          </div>
          <div>
            <Label className="text-slate-400 text-xs font-mono">DOTKNIĘTE URZĄDZENIA</Label>
            <Input value={form.affectedDevices} onChange={e => setForm(f => ({ ...f, affectedDevices: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-slate-100 font-mono mt-1"
              placeholder="np. Laptop-01, Phone-02" />
          </div>
          <div>
            <Label className="text-slate-400 text-xs font-mono">ZGŁASZAJĄCY</Label>
            <Input value={form.reportedBy} onChange={e => setForm(f => ({ ...f, reportedBy: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-slate-100 font-mono mt-1"
              placeholder="Imię/pseudonim" />
          </div>
          <Button
            className="w-full bg-red-600 hover:bg-red-700 font-mono"
            onClick={() => createMutation.mutate({ ...form, category: form.category as "physical_breach" | "network_intrusion" | "device_compromise" | "data_leak" | "social_engineering" | "malware" | "unauthorized_access" | "other" })}
            disabled={!form.title || createMutation.isPending}
          >
            {createMutation.isPending ? "ZGŁASZANIE..." : "ZGŁOŚ INCYDENT"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function IncidentResponse() {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { data: incidents = [], refetch } = trpc.incidents.list.useQuery();

  const filtered = incidents.filter(i => {
    const matchFilter = filter === "all" || i.status === filter || i.severity === filter;
    const matchSearch = !search || i.title.toLowerCase().includes(search.toLowerCase()) ||
      (i.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
    return matchFilter && matchSearch;
  });

  const openCount = incidents.filter(i => i.status === "open").length;
  const criticalCount = incidents.filter(i => i.severity === "critical" && i.status !== "closed").length;
  const investigatingCount = incidents.filter(i => i.status === "investigating").length;
  const resolvedCount = incidents.filter(i => i.status === "resolved" || i.status === "closed").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            INCIDENT RESPONSE
          </h1>
          <p className="text-slate-400 text-sm mt-1">Zarządzanie incydentami bezpieczeństwa i reagowanie na zagrożenia</p>
        </div>
        <CreateIncidentDialog onCreated={refetch} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "OTWARTE", value: openCount, color: "text-red-400", icon: <Flame className="w-4 h-4" /> },
          { label: "KRYTYCZNE", value: criticalCount, color: "text-orange-400", icon: <AlertTriangle className="w-4 h-4" /> },
          { label: "W TRAKCIE", value: investigatingCount, color: "text-yellow-400", icon: <Eye className="w-4 h-4" /> },
          { label: "ROZWIĄZANE", value: resolvedCount, color: "text-green-400", icon: <CheckCircle2 className="w-4 h-4" /> },
        ].map(stat => (
          <Card key={stat.label} className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4 flex items-center gap-3">
              <span className={stat.color}>{stat.icon}</span>
              <div>
                <p className={`text-2xl font-mono font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500 font-mono">{stat.label}</p>
              </div>
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
            placeholder="Szukaj incydentów..."
            className="pl-9 bg-slate-900 border-slate-700 text-slate-100 font-mono"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "open", "investigating", "contained", "resolved", "critical", "high"].map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              className={`font-mono text-xs ${filter === f ? "bg-cyan-600 hover:bg-cyan-700" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}
              onClick={() => setFilter(f)}
            >
              {f.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Incident List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-mono">
            {incidents.length === 0
              ? "Brak zarejestrowanych incydentów"
              : "Brak wyników dla wybranych filtrów"}
          </p>
          {incidents.length === 0 && (
            <p className="text-xs mt-2 text-slate-600">Kliknij "ZGŁOŚ INCYDENT" aby dodać pierwszy wpis</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(incident => (
            <IncidentCard key={incident.id} incident={incident} onRefresh={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}
