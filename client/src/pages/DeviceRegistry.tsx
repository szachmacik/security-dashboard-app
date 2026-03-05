import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Monitor, Plus, RefreshCw, Trash2, WifiOff, Shield, Cpu, HardDrive,
  Smartphone, Usb, Server, Search, Download, CheckCircle, AlertTriangle,
  Clock, MapPin, SortAsc, SortDesc, Eye
} from "lucide-react";
import { useState, useMemo } from "react";

const deviceTypeIcons: Record<string, React.ElementType> = {
  laptop: Monitor, phone: Smartphone, tablet: Smartphone, server: Server,
  raspberry_pi: Cpu, usb_drive: Usb, other: HardDrive,
};

const isolationColors: Record<string, string> = {
  air_gapped: "text-green-400 bg-green-400/10 border-green-400/30",
  faraday: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  offline: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  online: "text-red-400 bg-red-400/10 border-red-400/30",
};

const isolationLabels: Record<string, string> = {
  air_gapped: "AIR-GAP", faraday: "FARADAY", offline: "OFFLINE", online: "ONLINE",
};

// Risk score calculation based on isolation status and verification
function getRiskScore(device: { isolationStatus: string; isVerified: boolean; lastSync: Date | null }): number {
  let risk = 0;
  if (device.isolationStatus === "online") risk += 60;
  else if (device.isolationStatus === "offline") risk += 30;
  else if (device.isolationStatus === "faraday") risk += 10;
  else risk += 0; // air_gapped
  if (!device.isVerified) risk += 25;
  const daysSinceSync = device.lastSync
    ? Math.floor((Date.now() - new Date(device.lastSync).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  if (daysSinceSync > 30) risk += 15;
  else if (daysSinceSync > 7) risk += 5;
  return Math.min(100, risk);
}

function RiskBadge({ score }: { score: number }) {
  const color = score >= 70 ? "text-red-400 border-red-400/30 bg-red-400/10"
    : score >= 40 ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"
    : "text-green-400 border-green-400/30 bg-green-400/10";
  const label = score >= 70 ? "WYSOKIE" : score >= 40 ? "ŚREDNIE" : "NISKIE";
  return (
    <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${color}`}>
      RYZYKO: {label}
    </span>
  );
}

function AddDeviceDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", type: "laptop", location: "", isolationStatus: "offline", notes: "",
    os: "", encryptionType: ""
  });
  const createMutation = trpc.devices.create.useMutation({
    onSuccess: () => {
      toast.success("Urządzenie dodane");
      setOpen(false);
      onSuccess();
      setForm({ name: "", type: "laptop", location: "", isolationStatus: "offline", notes: "", os: "", encryptionType: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 font-mono text-xs"><Plus className="w-4 h-4" />Dodaj Urządzenie</Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader><DialogTitle className="font-mono">NOWE URZĄDZENIE</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-mono text-muted-foreground">NAZWA</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="np. Laptop Offline #1" className="mt-1 bg-input font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono text-muted-foreground">TYP</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1 bg-input font-mono text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {["laptop", "phone", "tablet", "server", "raspberry_pi", "usb_drive", "other"].map(t => (
                    <SelectItem key={t} value={t} className="font-mono text-xs">{t.replace(/_/g, " ").toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-mono text-muted-foreground">IZOLACJA</Label>
              <Select value={form.isolationStatus} onValueChange={v => setForm(f => ({ ...f, isolationStatus: v }))}>
                <SelectTrigger className="mt-1 bg-input font-mono text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="air_gapped" className="font-mono text-xs text-green-400">AIR-GAP</SelectItem>
                  <SelectItem value="faraday" className="font-mono text-xs text-blue-400">FARADAY</SelectItem>
                  <SelectItem value="offline" className="font-mono text-xs text-yellow-400">OFFLINE</SelectItem>
                  <SelectItem value="online" className="font-mono text-xs text-red-400">ONLINE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono text-muted-foreground">SYSTEM OPERACYJNY</Label>
              <Input value={form.os} onChange={e => setForm(f => ({ ...f, os: e.target.value }))} placeholder="np. Tails, Qubes OS" className="mt-1 bg-input font-mono text-xs" />
            </div>
            <div>
              <Label className="text-xs font-mono text-muted-foreground">SZYFROWANIE</Label>
              <Input value={form.encryptionType} onChange={e => setForm(f => ({ ...f, encryptionType: e.target.value }))} placeholder="np. LUKS, VeraCrypt" className="mt-1 bg-input font-mono text-xs" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-mono text-muted-foreground">LOKALIZACJA</Label>
            <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="np. Bunkier / Sejf / Szuflada" className="mt-1 bg-input font-mono" />
          </div>
          <div>
            <Label className="text-xs font-mono text-muted-foreground">NOTATKI</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Dodatkowe informacje..." className="mt-1 bg-input font-mono text-sm resize-none" rows={3} />
          </div>
          <Button
            onClick={() => createMutation.mutate({ name: form.name, type: form.type as any, location: form.location, isolationStatus: form.isolationStatus as any, notes: form.notes })}
            disabled={!form.name || createMutation.isPending}
            className="w-full font-mono"
          >
            {createMutation.isPending ? "DODAWANIE..." : "DODAJ URZĄDZENIE"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeviceDetailDialog({ device }: { device: any }) {
  const [open, setOpen] = useState(false);
  const risk = getRiskScore(device);
  const Icon = deviceTypeIcons[device.type] || HardDrive;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <Eye className="w-3.5 h-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2">
            <Icon className="w-4 h-4" />{device.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-mono px-2 py-0.5 rounded border ${isolationColors[device.isolationStatus]}`}>
              {isolationLabels[device.isolationStatus]}
            </span>
            <RiskBadge score={risk} />
            {device.isVerified && (
              <span className="text-xs font-mono px-2 py-0.5 rounded border text-green-400 border-green-400/30 bg-green-400/10 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />ZWERYFIKOWANE
              </span>
            )}
          </div>
          <div className="space-y-2">
            {[
              { label: "Typ", value: device.type.replace(/_/g, " ").toUpperCase() },
              { label: "Lokalizacja", value: device.location || "—" },
              { label: "Ostatnia sync", value: device.lastSync ? new Date(device.lastSync).toLocaleString("pl-PL") : "Nigdy" },
              { label: "Dodano", value: new Date(device.createdAt).toLocaleDateString("pl-PL") },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground font-mono text-xs">{label}:</span>
                <span className="text-foreground font-mono text-xs">{value}</span>
              </div>
            ))}
          </div>
          {device.notes && (
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs font-mono text-muted-foreground mb-1">NOTATKI:</p>
              <p className="text-xs text-foreground">{device.notes}</p>
            </div>
          )}
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-xs font-mono text-muted-foreground mb-2">OCENA RYZYKA: {risk}/100</p>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${risk >= 70 ? "bg-red-400" : risk >= 40 ? "bg-yellow-400" : "bg-green-400"}`}
                style={{ width: `${risk}%` }}
              />
            </div>
            <div className="mt-2 space-y-1">
              {device.isolationStatus === "online" && <p className="text-xs text-red-400">⚠ Urządzenie online — wysokie ryzyko</p>}
              {!device.isVerified && <p className="text-xs text-yellow-400">⚠ Urządzenie niezweryfikowane</p>}
              {!device.lastSync && <p className="text-xs text-yellow-400">⚠ Brak historii synchronizacji</p>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DeviceRegistry() {
  const utils = trpc.useUtils();
  const { data: devices = [], isLoading } = trpc.devices.list.useQuery();
  const deleteMutation = trpc.devices.delete.useMutation({
    onSuccess: () => { toast.success("Urządzenie usunięte"); utils.devices.list.invalidate(); },
  });
  const syncMutation = trpc.devices.syncNow.useMutation({
    onSuccess: () => { toast.success("Synchronizacja oznaczona"); utils.devices.list.invalidate(); },
  });
  const updateMutation = trpc.devices.update.useMutation({
    onSuccess: () => { toast.success("Status zaktualizowany"); utils.devices.list.invalidate(); },
  });

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "risk" | "sync">("risk");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let list = filter === "all" ? devices : devices.filter(d => d.isolationStatus === filter);
    if (search) list = list.filter(d =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.location || "").toLowerCase().includes(search.toLowerCase())
    );
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "risk") cmp = getRiskScore(a) - getRiskScore(b);
      else if (sortBy === "sync") {
        const aTime = a.lastSync ? new Date(a.lastSync).getTime() : 0;
        const bTime = b.lastSync ? new Date(b.lastSync).getTime() : 0;
        cmp = aTime - bTime;
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [devices, filter, search, sortBy, sortAsc]);

  const stats = {
    total: devices.length,
    airGapped: devices.filter(d => d.isolationStatus === "air_gapped").length,
    faraday: devices.filter(d => d.isolationStatus === "faraday").length,
    offline: devices.filter(d => d.isolationStatus === "offline").length,
    online: devices.filter(d => d.isolationStatus === "online").length,
    highRisk: devices.filter(d => getRiskScore(d) >= 70).length,
  };

  const exportDevices = () => {
    const lines = ["# REJESTR URZĄDZEŃ", `# Data: ${new Date().toLocaleDateString("pl-PL")}`, ""];
    devices.forEach(d => {
      const risk = getRiskScore(d);
      lines.push(`## ${d.name}`);
      lines.push(`- Typ: ${d.type}`);
      lines.push(`- Izolacja: ${d.isolationStatus}`);
      lines.push(`- Lokalizacja: ${d.location || "—"}`);
      lines.push(`- Ryzyko: ${risk}/100`);
      lines.push(`- Zweryfikowane: ${d.isVerified ? "Tak" : "Nie"}`);
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `device-registry-${new Date().toISOString().slice(0, 10)}.md`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Rejestr wyeksportowany");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground tracking-wide">REJESTR URZĄDZEŃ</h1>
          <p className="text-sm text-muted-foreground mt-1">Zarządzanie urządzeniami offline i ich statusem izolacji</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2 font-mono text-xs" onClick={exportDevices}>
            <Download className="w-3.5 h-3.5" />Eksportuj
          </Button>
          <AddDeviceDialog onSuccess={() => utils.devices.list.invalidate()} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: "Wszystkie", value: stats.total, key: "all", color: "text-foreground" },
          { label: "Air-Gap", value: stats.airGapped, key: "air_gapped", color: "text-green-400" },
          { label: "Faraday", value: stats.faraday, key: "faraday", color: "text-blue-400" },
          { label: "Offline", value: stats.offline, key: "offline", color: "text-yellow-400" },
          { label: "Online", value: stats.online, key: "online", color: "text-red-400" },
          { label: "Wysokie ryzyko", value: stats.highRisk, key: "__risk__", color: "text-red-400" },
        ].map(s => (
          <button key={s.key} onClick={() => s.key !== "__risk__" && setFilter(s.key)}
            className={`bg-card border rounded-lg p-3 text-center transition-all ${filter === s.key ? "border-primary" : "border-border hover:border-border/80"} ${s.key === "__risk__" ? "cursor-default" : "cursor-pointer"}`}>
            <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Search & Sort */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj urządzenia lub lokalizacji..."
            className="pl-9 bg-input font-mono text-xs h-9"
          />
        </div>
        <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
          <span>Sortuj:</span>
          {[
            { key: "risk", label: "Ryzyko" },
            { key: "name", label: "Nazwa" },
            { key: "sync", label: "Sync" },
          ].map(s => (
            <button key={s.key} onClick={() => { if (sortBy === s.key) setSortAsc(!sortAsc); else { setSortBy(s.key as any); setSortAsc(false); } }}
              className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${sortBy === s.key ? "bg-primary/20 text-primary" : "hover:text-foreground"}`}>
              {s.label}
              {sortBy === s.key && (sortAsc ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
            </button>
          ))}
        </div>
      </div>

      {/* Device List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Monitor className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">{search ? "Brak wyników dla szukanej frazy" : "Brak urządzeń w tej kategorii"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(device => {
            const Icon = deviceTypeIcons[device.type] || HardDrive;
            const risk = getRiskScore(device);
            return (
              <div key={device.id} className={`bg-card border rounded-xl p-5 space-y-4 hover:border-primary/30 transition-colors ${risk >= 70 ? "border-red-400/30" : "border-border"}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${risk >= 70 ? "bg-red-400/10" : "bg-muted"}`}>
                      <Icon className={`w-5 h-5 ${risk >= 70 ? "text-red-400" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground font-mono text-sm">{device.name}</h3>
                      <p className="text-xs text-muted-foreground">{device.type.replace(/_/g, " ").toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <DeviceDetailDialog device={device} />
                    <span className={`text-xs font-mono px-2 py-0.5 rounded border ${isolationColors[device.isolationStatus]}`}>
                      {isolationLabels[device.isolationStatus]}
                    </span>
                  </div>
                </div>

                {/* Risk bar */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-muted-foreground font-mono">Ryzyko</span>
                    <span className={`text-xs font-mono ${risk >= 70 ? "text-red-400" : risk >= 40 ? "text-yellow-400" : "text-green-400"}`}>{risk}/100</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${risk >= 70 ? "bg-red-400" : risk >= 40 ? "bg-yellow-400" : "bg-green-400"}`}
                      style={{ width: `${risk}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  {device.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-foreground font-mono">{device.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {device.lastSync ? `Sync: ${new Date(device.lastSync).toLocaleDateString("pl-PL")}` : "Brak synchronizacji"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {device.isVerified
                      ? <CheckCircle className="w-3 h-3 text-green-400" />
                      : <AlertTriangle className="w-3 h-3 text-yellow-400" />
                    }
                    <span className={device.isVerified ? "text-green-400" : "text-yellow-400"}>
                      {device.isVerified ? "ZWERYFIKOWANE" : "NIEZWERYFIKOWANE"}
                    </span>
                  </div>
                </div>

                {device.notes && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 font-mono truncate">{device.notes}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 text-xs font-mono gap-1.5"
                    onClick={() => syncMutation.mutate({ id: device.id })}>
                    <RefreshCw className="w-3 h-3" />Sync
                  </Button>
                  <Select value={device.isolationStatus} onValueChange={v => updateMutation.mutate({ id: device.id, isolationStatus: v as any })}>
                    <SelectTrigger className="flex-1 text-xs font-mono bg-input h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="air_gapped" className="text-xs text-green-400">AIR-GAP</SelectItem>
                      <SelectItem value="faraday" className="text-xs text-blue-400">FARADAY</SelectItem>
                      <SelectItem value="offline" className="text-xs text-yellow-400">OFFLINE</SelectItem>
                      <SelectItem value="online" className="text-xs text-red-400">ONLINE</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                    onClick={() => { if (confirm(`Usunąć ${device.name}?`)) deleteMutation.mutate({ id: device.id }); }}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
