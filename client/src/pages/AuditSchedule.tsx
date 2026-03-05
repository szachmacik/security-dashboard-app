import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Activity, Plus, CheckCircle, Clock, AlertTriangle, Calendar, Trash2, XCircle,
  Download, BarChart2, TrendingUp, FileText, Bell
} from "lucide-react";
import { useState, useMemo } from "react";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "OCZEKUJE", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30", icon: Clock },
  completed: { label: "UKOŃCZONY", color: "text-green-400 bg-green-400/10 border-green-400/30", icon: CheckCircle },
  overdue: { label: "ZALEGŁY", color: "text-red-400 bg-red-400/10 border-red-400/30", icon: AlertTriangle },
  cancelled: { label: "ANULOWANY", color: "text-muted-foreground bg-muted/50 border-border", icon: XCircle },
};

const severityConfig: Record<string, { label: string; color: string }> = {
  critical: { label: "KRYTYCZNY", color: "text-red-400" },
  high: { label: "WYSOKI", color: "text-orange-400" },
  medium: { label: "ŚREDNI", color: "text-yellow-400" },
  low: { label: "NISKI", color: "text-green-400" },
  info: { label: "INFO", color: "text-blue-400" },
};

const recurrenceLabels: Record<string, string> = {
  once: "Jednorazowy", daily: "Codziennie", weekly: "Co tydzień", monthly: "Co miesiąc",
};

function getDaysUntil(date: Date): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function AddAuditDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", scheduledAt: "", recurrence: "once", severity: "medium"
  });
  const createMutation = trpc.audits.create.useMutation({
    onSuccess: () => { toast.success("Audyt zaplanowany"); setOpen(false); onSuccess(); setForm({ title: "", description: "", scheduledAt: "", recurrence: "once", severity: "medium" }); },
    onError: (e) => toast.error(e.message),
  });

  // Quick templates
  const templates = [
    { title: "Miesięczny przegląd OPSEC", description: "Weryfikacja wszystkich punktów OPSEC checklist", severity: "high", recurrence: "monthly" },
    { title: "Weryfikacja urządzeń offline", description: "Sprawdzenie stanu izolacji i weryfikacji urządzeń", severity: "medium", recurrence: "weekly" },
    { title: "Audyt kluczy kryptograficznych", description: "Rotacja i weryfikacja kluczy GPG, SSH, VeraCrypt", severity: "critical", recurrence: "monthly" },
    { title: "Przegląd Smart Home", description: "Sprawdzenie automatyzacji i urządzeń Zigbee/Z-Wave", severity: "low", recurrence: "weekly" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 font-mono text-xs"><Plus className="w-4 h-4" />Zaplanuj Audyt</Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader><DialogTitle className="font-mono">NOWY AUDYT BEZPIECZEŃSTWA</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Quick templates */}
          <div>
            <Label className="text-xs font-mono text-muted-foreground">SZYBKIE SZABLONY</Label>
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              {templates.map(t => (
                <button key={t.title} onClick={() => setForm(f => ({ ...f, title: t.title, description: t.description, severity: t.severity, recurrence: t.recurrence }))}
                  className="text-left px-2 py-1.5 rounded bg-muted/30 hover:bg-muted/60 transition-colors border border-border text-xs font-mono text-muted-foreground hover:text-foreground truncate">
                  {t.title}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-mono text-muted-foreground">TYTUŁ AUDYTU</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="np. Miesięczny przegląd OPSEC" className="mt-1 bg-input font-mono" />
          </div>
          <div>
            <Label className="text-xs font-mono text-muted-foreground">OPIS / ZAKRES</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Co należy sprawdzić..." className="mt-1 bg-input font-mono text-sm resize-none" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono text-muted-foreground">DATA I GODZINA</Label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} className="mt-1 bg-input font-mono text-xs" />
            </div>
            <div>
              <Label className="text-xs font-mono text-muted-foreground">POWTARZANIE</Label>
              <Select value={form.recurrence} onValueChange={v => setForm(f => ({ ...f, recurrence: v }))}>
                <SelectTrigger className="mt-1 bg-input font-mono text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {Object.entries(recurrenceLabels).map(([k, v]) => <SelectItem key={k} value={k} className="font-mono text-xs">{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs font-mono text-muted-foreground">WAŻNOŚĆ</Label>
            <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
              <SelectTrigger className="mt-1 bg-input font-mono text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {Object.entries(severityConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k} className={`font-mono text-xs ${v.color}`}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => createMutation.mutate({ title: form.title, description: form.description, scheduledAt: new Date(form.scheduledAt), recurrence: form.recurrence as any, severity: form.severity as any })}
            disabled={!form.title || !form.scheduledAt || createMutation.isPending}
            className="w-full font-mono"
          >
            {createMutation.isPending ? "PLANOWANIE..." : "ZAPLANUJ AUDYT"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CompleteAuditDialog({ audit, onSuccess }: { audit: any; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [findings, setFindings] = useState("");
  const completeMutation = trpc.audits.complete.useMutation({
    onSuccess: () => { toast.success("Audyt ukończony"); setOpen(false); onSuccess(); setFindings(""); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-xs font-mono gap-1.5 text-green-400 border-green-400/30 hover:bg-green-400/10">
          <CheckCircle className="w-3 h-3" />Ukończ
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader><DialogTitle className="font-mono">UKOŃCZ AUDYT</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="bg-muted/20 rounded-lg p-3">
            <p className="text-sm font-mono text-foreground">{audit.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{audit.description}</p>
          </div>
          <div>
            <Label className="text-xs font-mono text-muted-foreground">WYNIKI I WNIOSKI</Label>
            <Textarea
              value={findings}
              onChange={e => setFindings(e.target.value)}
              placeholder="Opisz wyniki audytu, znalezione problemy i podjęte działania..."
              className="mt-1 bg-input font-mono text-sm resize-none"
              rows={5}
            />
          </div>
          <Button
            onClick={() => completeMutation.mutate({ id: audit.id, findings })}
            disabled={completeMutation.isPending}
            className="w-full font-mono"
          >
            {completeMutation.isPending ? "ZAPISYWANIE..." : "ZATWIERDŹ UKOŃCZENIE"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AuditSchedule() {
  const utils = trpc.useUtils();
  const { data: audits = [], isLoading } = trpc.audits.list.useQuery();
  const deleteMutation = trpc.audits.delete.useMutation({
    onSuccess: () => { toast.success("Audyt usunięty"); utils.audits.list.invalidate(); },
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"list" | "timeline">("list");

  const filtered = useMemo(() => {
    const list = statusFilter === "all" ? audits : audits.filter(a => a.status === statusFilter);
    return [...list].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [audits, statusFilter]);

  const stats = {
    pending: audits.filter(a => a.status === "pending").length,
    completed: audits.filter(a => a.status === "completed").length,
    overdue: audits.filter(a => a.status === "overdue").length,
    total: audits.length,
    completionRate: audits.length > 0 ? Math.round((audits.filter(a => a.status === "completed").length / audits.length) * 100) : 0,
  };

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcoming = audits.filter(a => {
    const d = new Date(a.scheduledAt);
    return a.status === "pending" && d >= now && d <= nextWeek;
  }).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const exportReport = () => {
    const lines = [
      "# RAPORT AUDYTÓW BEZPIECZEŃSTWA",
      `# Data: ${new Date().toLocaleDateString("pl-PL")}`,
      "",
      `## Podsumowanie`,
      `- Łącznie audytów: ${stats.total}`,
      `- Ukończonych: ${stats.completed}`,
      `- Oczekujących: ${stats.pending}`,
      `- Zaległych: ${stats.overdue}`,
      `- Wskaźnik ukończenia: ${stats.completionRate}%`,
      "",
      "## Historia Audytów",
    ];
    audits.forEach(a => {
      lines.push(`\n### ${a.title}`);
      lines.push(`- Status: ${a.status}`);
      lines.push(`- Ważność: ${a.severity}`);
      lines.push(`- Data: ${new Date(a.scheduledAt).toLocaleDateString("pl-PL")}`);
      lines.push(`- Powtarzanie: ${recurrenceLabels[a.recurrence]}`);
      if (a.findings) lines.push(`- Wyniki: ${a.findings}`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Raport wyeksportowany");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground tracking-wide">HARMONOGRAM AUDYTÓW</h1>
          <p className="text-sm text-muted-foreground mt-1">Planowanie i śledzenie weryfikacji bezpieczeństwa</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2 font-mono text-xs" onClick={exportReport}>
            <Download className="w-3.5 h-3.5" />Raport
          </Button>
          <AddAuditDialog onSuccess={() => utils.audits.list.invalidate()} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-mono text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">ŁĄCZNIE</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-mono text-yellow-400">{stats.pending}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">OCZEKUJE</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-mono text-green-400">{stats.completed}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">UKOŃCZONE</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-mono text-red-400">{stats.overdue}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">ZALEGŁE</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className={`text-2xl font-bold font-mono ${stats.completionRate >= 80 ? "text-green-400" : stats.completionRate >= 50 ? "text-yellow-400" : "text-red-400"}`}>
            {stats.completionRate}%
          </p>
          <p className="text-xs text-muted-foreground font-mono mt-1">UKOŃCZONO</p>
        </div>
      </div>

      {/* Completion bar */}
      {stats.total > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-muted-foreground flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" />WSKAŹNIK UKOŃCZENIA</span>
            <span className="text-xs font-mono text-foreground">{stats.completionRate}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${stats.completionRate >= 80 ? "bg-green-400" : stats.completionRate >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="bg-blue-400/5 border border-blue-400/20 rounded-xl p-4">
          <p className="text-xs font-mono text-blue-400 mb-3 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" />NADCHODZĄCE (7 DNI)
          </p>
          <div className="space-y-2">
            {upcoming.map(a => {
              const days = getDaysUntil(new Date(a.scheduledAt));
              return (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono ${severityConfig[a.severity as string]?.color || "text-muted-foreground"}`}>
                      {severityConfig[a.severity as string]?.label || a.severity}
                    </span>
                    <span className="text-foreground font-mono text-xs">{a.title}</span>
                  </div>
                  <span className={`text-xs font-mono ${days <= 1 ? "text-red-400" : days <= 3 ? "text-yellow-400" : "text-blue-400"}`}>
                    {days === 0 ? "Dziś" : days === 1 ? "Jutro" : `Za ${days} dni`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View toggle & Filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "completed", "overdue", "cancelled"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
              {s === "all" ? `Wszystkie (${audits.length})` : statusConfig[s]?.label || s}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setView("list")}
            className={`px-2 py-1 rounded text-xs font-mono transition-colors ${view === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            Lista
          </button>
          <button onClick={() => setView("timeline")}
            className={`px-2 py-1 rounded text-xs font-mono transition-colors ${view === "timeline" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            Oś czasu
          </button>
        </div>
      </div>

      {/* Audit List / Timeline */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">Brak audytów w tej kategorii</p>
          <p className="text-xs text-muted-foreground mt-1">Zaplanuj pierwszy audyt bezpieczeństwa</p>
        </div>
      ) : view === "timeline" ? (
        /* Timeline View */
        <div className="relative pl-6">
          <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />
          {filtered.map((audit, idx) => {
            const sc = statusConfig[audit.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            const isOverdue = audit.status === "pending" && new Date(audit.scheduledAt) < new Date();
            return (
              <div key={audit.id} className="relative mb-4">
                <div className={`absolute -left-4 w-4 h-4 rounded-full border-2 flex items-center justify-center ${isOverdue ? "bg-red-400/20 border-red-400" : audit.status === "completed" ? "bg-green-400/20 border-green-400" : "bg-yellow-400/20 border-yellow-400"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isOverdue ? "bg-red-400" : audit.status === "completed" ? "bg-green-400" : "bg-yellow-400"}`} />
                </div>
                <div className={`bg-card border rounded-xl p-4 ml-2 transition-all ${isOverdue ? "border-red-400/30" : "border-border hover:border-primary/30"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-foreground font-mono text-sm">{audit.title}</h3>
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${sc.color}`}>{sc.label}</span>
                        {audit.severity && (
                          <span className={`text-xs font-mono ${severityConfig[audit.severity as string]?.color || ""}`}>
                            {severityConfig[audit.severity as string]?.label || audit.severity}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(audit.scheduledAt).toLocaleDateString("pl-PL", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        {" · "}{recurrenceLabels[audit.recurrence]}
                      </p>
                      {audit.findings && (
                        <div className="mt-2 bg-muted/20 rounded p-2">
                          <p className="text-xs text-muted-foreground font-mono">📋 {audit.findings}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {audit.status === "pending" && <CompleteAuditDialog audit={audit} onSuccess={() => utils.audits.list.invalidate()} />}
                      <Button size="sm" variant="outline" className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => { if (confirm("Usunąć audyt?")) deleteMutation.mutate({ id: audit.id }); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {filtered.map(audit => {
            const sc = statusConfig[audit.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            const isOverdue = audit.status === "pending" && new Date(audit.scheduledAt) < new Date();
            const days = getDaysUntil(new Date(audit.scheduledAt));
            return (
              <div key={audit.id} className={`bg-card border rounded-xl p-5 transition-all ${isOverdue ? "border-red-400/30" : "border-border hover:border-primary/30"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <StatusIcon className={`w-5 h-5 mt-0.5 shrink-0 ${sc.color.split(" ")[0]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-foreground font-mono text-sm">{audit.title}</h3>
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${sc.color}`}>{sc.label}</span>
                        {audit.severity && (
                          <span className={`text-xs font-mono ${severityConfig[audit.severity as string]?.color || ""}`}>
                            {severityConfig[audit.severity as string]?.label || audit.severity}
                          </span>
                        )}
                      </div>
                      {audit.description && <p className="text-xs text-muted-foreground mt-1 truncate">{audit.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(audit.scheduledAt).toLocaleDateString("pl-PL", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span>{recurrenceLabels[audit.recurrence]}</span>
                        {audit.status === "pending" && (
                          <span className={`font-mono ${days < 0 ? "text-red-400" : days <= 3 ? "text-yellow-400" : "text-muted-foreground"}`}>
                            {days < 0 ? `${Math.abs(days)} dni temu` : days === 0 ? "Dziś" : `Za ${days} dni`}
                          </span>
                        )}
                      </div>
                      {audit.findings && (
                        <div className="mt-2 bg-muted/30 rounded p-2">
                          <p className="text-xs text-muted-foreground font-mono flex items-start gap-1">
                            <FileText className="w-3 h-3 mt-0.5 shrink-0" />{audit.findings}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {audit.status === "pending" && <CompleteAuditDialog audit={audit} onSuccess={() => utils.audits.list.invalidate()} />}
                    <Button size="sm" variant="outline" className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => { if (confirm("Usunąć audyt?")) deleteMutation.mutate({ id: audit.id }); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
