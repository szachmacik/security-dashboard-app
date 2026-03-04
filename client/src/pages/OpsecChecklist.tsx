import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle, Circle, Plus, RefreshCw, Trash2, AlertTriangle, Shield, Wifi, Lock, Zap, Filter } from "lucide-react";
import { useState } from "react";

const categories = [
  { key: "physical", label: "Fizyczne", icon: Shield, color: "text-orange-400" },
  { key: "network", label: "Sieciowe", icon: Wifi, color: "text-blue-400" },
  { key: "cryptographic", label: "Kryptograficzne", icon: Lock, color: "text-purple-400" },
  { key: "opsec", label: "OPSEC", icon: AlertTriangle, color: "text-yellow-400" },
  { key: "smart_home", label: "Smart Home", icon: Zap, color: "text-green-400" },
];

const priorities = [
  { key: "critical", label: "KRYTYCZNY", color: "text-red-400 bg-red-400/10 border-red-400/30" },
  { key: "high", label: "WYSOKI", color: "text-orange-400 bg-orange-400/10 border-orange-400/30" },
  { key: "medium", label: "ŚREDNI", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  { key: "low", label: "NISKI", color: "text-green-400 bg-green-400/10 border-green-400/30" },
];

function AddItemDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "physical", title: "", description: "", priority: "high", notes: "" });
  const createMutation = trpc.opsec.create.useMutation({
    onSuccess: () => { toast.success("Element dodany"); setOpen(false); onSuccess(); setForm({ category: "physical", title: "", description: "", priority: "high", notes: "" }); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 font-mono text-xs"><Plus className="w-4 h-4" />Dodaj Element</Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader><DialogTitle className="font-mono">NOWY ELEMENT OPSEC</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs font-mono text-muted-foreground">KATEGORIA</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({...f, category: v}))}>
                <SelectTrigger className="mt-1 bg-input font-mono text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {categories.map(c => <SelectItem key={c.key} value={c.key} className="font-mono text-xs">{c.label}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div><Label className="text-xs font-mono text-muted-foreground">PRIORYTET</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({...f, priority: v}))}>
                <SelectTrigger className="mt-1 bg-input font-mono text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {priorities.map(p => <SelectItem key={p.key} value={p.key} className="font-mono text-xs">{p.label}</SelectItem>)}
                </SelectContent>
              </Select></div>
          </div>
          <div><Label className="text-xs font-mono text-muted-foreground">TYTUŁ</Label>
            <Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Opis zabezpieczenia..." className="mt-1 bg-input font-mono" /></div>
          <div><Label className="text-xs font-mono text-muted-foreground">OPIS</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Szczegółowy opis..." className="mt-1 bg-input font-mono text-sm resize-none" rows={3} /></div>
          <Button onClick={() => createMutation.mutate({ category: form.category as any, title: form.title, description: form.description, priority: form.priority as any, notes: form.notes })}
            disabled={!form.title || createMutation.isPending} className="w-full font-mono">
            {createMutation.isPending ? "DODAWANIE..." : "DODAJ ELEMENT"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function OpsecChecklist() {
  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.opsec.list.useQuery();
  const toggleMutation = trpc.opsec.toggle.useMutation({
    onMutate: async ({ id, isCompleted }) => {
      await utils.opsec.list.cancel();
      const prev = utils.opsec.list.getData();
      utils.opsec.list.setData(undefined, old => old?.map(i => i.id === id ? { ...i, isCompleted } : i));
      return { prev };
    },
    onError: (_, __, ctx) => { utils.opsec.list.setData(undefined, ctx?.prev); },
    onSettled: () => utils.opsec.list.invalidate(),
  });
  const deleteMutation = trpc.opsec.delete.useMutation({
    onSuccess: () => { toast.success("Usunięto"); utils.opsec.list.invalidate(); },
  });
  const seedMutation = trpc.opsec.seed.useMutation({
    onSuccess: (r) => { toast.success(r.message); utils.opsec.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const [activeCategory, setActiveCategory] = useState("all");
  const [showCompleted, setShowCompleted] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState("all");

  const filtered = items.filter(item => {
    if (activeCategory !== "all" && item.category !== activeCategory) return false;
    if (!showCompleted && item.isCompleted) return false;
    if (priorityFilter !== "all" && item.priority !== priorityFilter) return false;
    return true;
  });

  const totalItems = items.length;
  const completedItems = items.filter(i => i.isCompleted).length;
  const completionPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const criticalPending = items.filter(i => !i.isCompleted && i.priority === "critical").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground tracking-wide">OPSEC CHECKLIST</h1>
          <p className="text-sm text-muted-foreground mt-1">Interaktywna lista kontrolna zabezpieczeń operacyjnych</p>
        </div>
        <div className="flex gap-2">
          {items.length === 0 && (
            <Button size="sm" variant="outline" className="gap-2 font-mono text-xs" onClick={() => seedMutation.mutate()}>
              <RefreshCw className="w-4 h-4" />Załaduj Domyślne
            </Button>
          )}
          <AddItemDialog onSuccess={() => utils.opsec.list.invalidate()} />
        </div>
      </div>

      {/* Progress */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-mono text-foreground">{completedItems} / {totalItems} ukończonych</p>
            {criticalPending > 0 && (
              <p className="text-xs text-red-400 mt-0.5">⚠ {criticalPending} krytycznych oczekuje</p>
            )}
          </div>
          <span className={`text-2xl font-bold font-mono ${completionPct >= 80 ? "text-green-400" : completionPct >= 50 ? "text-yellow-400" : "text-red-400"}`}>{completionPct}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${completionPct >= 80 ? "bg-green-400" : completionPct >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
            style={{ width: `${completionPct}%` }} />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setActiveCategory("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${activeCategory === "all" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
          Wszystkie ({items.length})
        </button>
        {categories.map(cat => {
          const catItems = items.filter(i => i.category === cat.key);
          const catDone = catItems.filter(i => i.isCompleted).length;
          return (
            <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${activeCategory === cat.key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
              <cat.icon className="w-3 h-3" />
              {cat.label} ({catDone}/{catItems.length})
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-mono">Priorytet:</span>
        </div>
        {["all", "critical", "high", "medium", "low"].map(p => (
          <button key={p} onClick={() => setPriorityFilter(p)}
            className={`px-2 py-1 rounded text-xs font-mono transition-all ${priorityFilter === p ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"}`}>
            {p === "all" ? "Wszystkie" : p.toUpperCase()}
          </button>
        ))}
        <button onClick={() => setShowCompleted(!showCompleted)}
          className={`ml-auto px-3 py-1 rounded-lg text-xs font-mono transition-all ${showCompleted ? "bg-card border border-border text-muted-foreground" : "bg-primary/20 text-primary border border-primary/30"}`}>
          {showCompleted ? "Ukryj ukończone" : "Pokaż ukończone"}
        </button>
      </div>

      {/* Items */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Ładowanie...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">Brak elementów w tej kategorii</p>
          {items.length === 0 && (
            <Button className="mt-4 font-mono" onClick={() => seedMutation.mutate()}>
              Załaduj domyślną checklistę
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const cat = categories.find(c => c.key === item.category);
            const pri = priorities.find(p => p.key === item.priority);
            return (
              <div key={item.id} className={`bg-card border rounded-xl p-4 transition-all ${item.isCompleted ? "border-border/50 opacity-60" : "border-border hover:border-primary/30"}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleMutation.mutate({ id: item.id, isCompleted: !item.isCompleted })}
                    className="mt-0.5 shrink-0 transition-colors">
                    {item.isCompleted
                      ? <CheckCircle className="w-5 h-5 text-primary" />
                      : <Circle className="w-5 h-5 text-muted-foreground hover:text-primary" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-medium font-mono ${item.isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {item.title}
                      </p>
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${pri?.color}`}>{pri?.label}</span>
                      {cat && (
                        <span className={`text-xs font-mono flex items-center gap-1 ${cat.color}`}>
                          <cat.icon className="w-3 h-3" />{cat.label}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                    )}
                    {item.completedAt && (
                      <p className="text-xs text-primary mt-1">✓ Ukończono: {new Date(item.completedAt).toLocaleDateString("pl-PL")}</p>
                    )}
                  </div>
                  <button onClick={() => { if (confirm("Usunąć element?")) deleteMutation.mutate({ id: item.id }); }}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
