import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Monitor, Plus, RefreshCw, Trash2, Edit, WifiOff, Shield, Cpu, HardDrive, Smartphone, Usb, Server } from "lucide-react";
import { useState } from "react";

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

function AddDeviceDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "laptop", location: "", isolationStatus: "offline", notes: "" });
  const createMutation = trpc.devices.create.useMutation({
    onSuccess: () => { toast.success("Urządzenie dodane"); setOpen(false); onSuccess(); setForm({ name: "", type: "laptop", location: "", isolationStatus: "offline", notes: "" }); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 font-mono text-xs"><Plus className="w-4 h-4" />Dodaj Urządzenie</Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader><DialogTitle className="font-mono">NOWE URZĄDZENIE</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div><Label className="text-xs font-mono text-muted-foreground">NAZWA</Label>
            <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="np. Laptop Offline #1" className="mt-1 bg-input font-mono" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs font-mono text-muted-foreground">TYP</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({...f, type: v}))}>
                <SelectTrigger className="mt-1 bg-input font-mono text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {["laptop","phone","tablet","server","raspberry_pi","usb_drive","other"].map(t => <SelectItem key={t} value={t} className="font-mono text-xs">{t.replace("_"," ").toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div><Label className="text-xs font-mono text-muted-foreground">IZOLACJA</Label>
              <Select value={form.isolationStatus} onValueChange={v => setForm(f => ({...f, isolationStatus: v}))}>
                <SelectTrigger className="mt-1 bg-input font-mono text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="air_gapped" className="font-mono text-xs text-green-400">AIR-GAP</SelectItem>
                  <SelectItem value="faraday" className="font-mono text-xs text-blue-400">FARADAY</SelectItem>
                  <SelectItem value="offline" className="font-mono text-xs text-yellow-400">OFFLINE</SelectItem>
                  <SelectItem value="online" className="font-mono text-xs text-red-400">ONLINE</SelectItem>
                </SelectContent>
              </Select></div>
          </div>
          <div><Label className="text-xs font-mono text-muted-foreground">LOKALIZACJA</Label>
            <Input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="np. Bunkier / Sejf / Szuflada" className="mt-1 bg-input font-mono" /></div>
          <div><Label className="text-xs font-mono text-muted-foreground">NOTATKI</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Dodatkowe informacje..." className="mt-1 bg-input font-mono text-sm resize-none" rows={3} /></div>
          <Button onClick={() => createMutation.mutate({ name: form.name, type: form.type as any, location: form.location, isolationStatus: form.isolationStatus as any, notes: form.notes })} disabled={!form.name || createMutation.isPending} className="w-full font-mono">
            {createMutation.isPending ? "DODAWANIE..." : "DODAJ URZĄDZENIE"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DeviceRegistry() {
  const { data: devices = [], refetch } = trpc.devices.list.useQuery();
  const utils = trpc.useUtils();
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

  const filtered = filter === "all" ? devices : devices.filter(d => d.isolationStatus === filter);

  const stats = {
    total: devices.length,
    airGapped: devices.filter(d => d.isolationStatus === "air_gapped").length,
    faraday: devices.filter(d => d.isolationStatus === "faraday").length,
    offline: devices.filter(d => d.isolationStatus === "offline").length,
    online: devices.filter(d => d.isolationStatus === "online").length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground tracking-wide">REJESTR URZĄDZEŃ</h1>
          <p className="text-sm text-muted-foreground mt-1">Zarządzanie urządzeniami offline i ich statusem izolacji</p>
        </div>
        <AddDeviceDialog onSuccess={() => utils.devices.list.invalidate()} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Wszystkie", value: stats.total, key: "all", color: "text-foreground" },
          { label: "Air-Gap", value: stats.airGapped, key: "air_gapped", color: "text-green-400" },
          { label: "Faraday", value: stats.faraday, key: "faraday", color: "text-blue-400" },
          { label: "Offline", value: stats.offline, key: "offline", color: "text-yellow-400" },
          { label: "Online", value: stats.online, key: "online", color: "text-red-400" },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className={`bg-card border rounded-lg p-3 text-center transition-all ${filter === s.key ? "border-primary" : "border-border hover:border-border/80"}`}>
            <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Device List */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Monitor className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">Brak urządzeń w tej kategorii</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(device => {
            const Icon = deviceTypeIcons[device.type] || HardDrive;
            return (
              <div key={device.id} className="bg-card border border-border rounded-xl p-5 space-y-4 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground font-mono text-sm">{device.name}</h3>
                      <p className="text-xs text-muted-foreground">{device.type.replace("_", " ").toUpperCase()}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded border ${isolationColors[device.isolationStatus]}`}>
                    {isolationLabels[device.isolationStatus]}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lokalizacja:</span>
                    <span className="text-foreground font-mono">{device.location || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ostatnia sync:</span>
                    <span className="text-foreground font-mono">{device.lastSync ? new Date(device.lastSync).toLocaleDateString("pl-PL") : "Nigdy"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={device.isActive ? "text-green-400" : "text-red-400"}>{device.isActive ? "AKTYWNE" : "NIEAKTYWNE"}</span>
                  </div>
                </div>

                {device.notes && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 font-mono">{device.notes}</p>
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
