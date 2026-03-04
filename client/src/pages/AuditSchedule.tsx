import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Activity, Plus, CheckCircle, Clock, AlertTriangle, Calendar, Trash2, XCircle } from "lucide-react";
import { useState } from "react";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "OCZEKUJE", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30", icon: Clock },
  completed: { label: "UKOŃCZONY", color: "text-green-400 bg-green-400/10 border-green-400/30", icon: CheckCircle },
  overdue: { label: "ZALEGŁY", color: "text-red-400 bg-red-400/10 border-red-400/30", icon: AlertTriangle },
  cancelled: { label: "ANULOWANY", color: "text-muted-foreground bg-muted/50 border-border", icon: XCircle },
};

const recurrenceLabels: Record<string, string> = {
  once: "Jednorazowy", daily: "Codziennie", weekly: "Co tydzień", monthly: "Co miesiąc",
};

function AddAuditDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", scheduledAt: "", recurrence: "once", severity: "medium" });
  const createMutation = trpc.audits.create.useMutation({
    onSuccess: () => { toast.success("Audyt zaplanowany"); setOpen(false); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 font-mono text-xs"><Plus className="w-4 h-4" />Zaplanuj Audyt</Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader><DialogTitle className="font-mono">NOWY AUDYT BEZPIECZEŃSTWA</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div><Label className="text-xs font-mono text-muted-foreground">TYTUŁ AUDYTU</Label>
            <Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="np. Miesięczny przegląd OPSEC" className="mt-1 bg-input font-mono" /></div>
          <div><Label className="text-xs font-mono text-muted-foreground">OPIS</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Co należy sprawdzić..." className="mt-1 bg-input font-mono text-sm resize-none" rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs font-mono text-muted-foreground">DATA I GODZINA</Label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({...f, scheduledAt: e.target.value}))} className="mt-1 bg-input font-mono text-xs" /></div>
            <div><Label className="text-xs font-mono text-muted-foreground">POWTARZANIE</Label>
              <Select value={form.recurrence} onValueChange={v => setForm(f => ({...f, recurrence: v}))}>
                <SelectTrigger className="mt-1 bg-input font-mono text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {Object.entries(recurrenceLabels).map(([k, v]) => <SelectItem key={k} value={k} className="font-mono text-xs">{v}</SelectItem>)}
                </SelectContent>
              </Select></div>
          </div>
          <div><Label className="text-xs font-mono text-muted-foreground">WAŻNOŚĆ</Label>
            <Select value={form.severity} onValueChange={v => setForm(f => ({...f, severity: v}))}>
              <SelectTrigger className="mt-1 bg-input font-mono text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {["critical","high","medium","low","info"].map(s => <SelectItem key={s} value={s} className="font-mono text-xs">{s.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select></div>
          <Button onClick={() => createMutation.mutate({ title: form.title, description: form.description, scheduledAt: new Date(form.scheduledAt), recurrence: form.recurrence as any, severity: form.severity as any })}
            disabled={!form.title || !form.scheduledAt || createMutation.isPending} className="w-full font-mono">
            {createMutation.isPending ? "PLANOWANIE..." : "ZAPLANUJ AUDYT"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AuditSchedule() {
  const utils = trpc.useUtils();
  const { data: audits = [] } = trpc.audits.list.useQuery();
  const completeMutation = trpc.audits.complete.useMutation({
    onSuccess: () => { toast.success("Audyt oznaczony jako ukończony"); utils.audits.list.invalidate(); },
  });
  const deleteMutation = trpc.audits.delete.useMutation({
    onSuccess: () => { toast.success("Audyt usunięty"); utils.audits.list.invalidate(); },
  });

  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = statusFilter === "all" ? audits : audits.filter(a => a.status === statusFilter);

  const stats = {
    pending: audits.filter(a => a.status === "pending").length,
    completed: audits.filter(a => a.status === "completed").length,
    overdue: audits.filter(a => a.status === "overdue").length,
  };

  // Upcoming audits (next 7 days)
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcoming = audits.filter(a => {
    const d = new Date(a.scheduledAt);
    return a.status === "pending" && d >= now && d <= nextWeek;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground tracking-wide">HARMONOGRAM AUDYTÓW</h1>
          <p className="text-sm text-muted-foreground mt-1">Planowanie i śledzenie weryfikacji bezpieczeństwa</p>
        </div>
        <AddAuditDialog onSuccess={() => utils.audits.list.invalidate()} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
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
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="bg-blue-400/5 border border-blue-400/20 rounded-xl p-4">
          <p className="text-xs font-mono text-blue-400 mb-3">📅 NADCHODZĄCE (7 DNI)</p>
          <div className="space-y-2">
            {upcoming.map(a => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground font-mono">{a.title}</span>
                <span className="text-blue-400 text-xs">{new Date(a.scheduledAt).toLocaleDateString("pl-PL", { weekday: "short", day: "numeric", month: "short" })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "pending", "completed", "overdue", "cancelled"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
            {s === "all" ? `Wszystkie (${audits.length})` : statusConfig[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Audit List */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">Brak audytów w tej kategorii</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(audit => {
            const sc = statusConfig[audit.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            const isOverdue = audit.status === "pending" && new Date(audit.scheduledAt) < new Date();
            return (
              <div key={audit.id} className={`bg-card border rounded-xl p-5 transition-all ${isOverdue ? "border-red-400/30" : "border-border hover:border-primary/30"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <StatusIcon className={`w-5 h-5 mt-0.5 shrink-0 ${sc.color.split(" ")[0]}`} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-foreground font-mono text-sm">{audit.title}</h3>
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${sc.color}`}>{sc.label}</span>
                        {audit.severity && (
                          <span className={`text-xs font-mono ${audit.severity === "critical" ? "text-red-400" : audit.severity === "high" ? "text-orange-400" : "text-muted-foreground"}`}>
                            {audit.severity.toUpperCase()}
                          </span>
                        )}
                      </div>
                      {audit.description && <p className="text-xs text-muted-foreground mt-1">{audit.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(audit.scheduledAt).toLocaleDateString("pl-PL", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        <span>{recurrenceLabels[audit.recurrence]}</span>
                      </div>
                      {audit.findings && (
                        <div className="mt-2 bg-muted/30 rounded p-2">
                          <p className="text-xs text-muted-foreground font-mono">Wyniki: {audit.findings}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {audit.status === "pending" && (
                      <Button size="sm" variant="outline" className="text-xs font-mono gap-1.5 text-green-400 border-green-400/30 hover:bg-green-400/10"
                        onClick={() => completeMutation.mutate({ id: audit.id, findings: "Audyt ukończony" })}>
                        <CheckCircle className="w-3 h-3" />Ukończ
                      </Button>
                    )}
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
