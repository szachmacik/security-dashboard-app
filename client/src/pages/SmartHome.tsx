import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Zap, Plus, Trash2, Power, Wifi, WifiOff, Settings, Radio, ToggleLeft, ToggleRight } from "lucide-react";
import { useState } from "react";

const protocolColors: Record<string, string> = {
  zigbee: "text-blue-400", zwave: "text-purple-400", wifi: "text-yellow-400",
  mqtt: "text-green-400", other: "text-muted-foreground",
};

const deviceTypeIcons: Record<string, string> = {
  socket: "🔌", relay: "⚡", sensor: "📡", switch: "🔘",
  camera: "📷", lock: "🔒", other: "📦",
};

function AddDeviceDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", protocol: "zigbee", type: "socket", location: "", automationRule: "" });
  const createMutation = trpc.smartHome.create.useMutation({
    onSuccess: () => { toast.success("Urządzenie dodane"); setOpen(false); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 font-mono text-xs"><Plus className="w-4 h-4" />Dodaj Urządzenie</Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader><DialogTitle className="font-mono">NOWE URZĄDZENIE SMART HOME</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div><Label className="text-xs font-mono text-muted-foreground">NAZWA</Label>
            <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="np. Gniazdko Serwer AI" className="mt-1 bg-input font-mono" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs font-mono text-muted-foreground">PROTOKÓŁ</Label>
              <Select value={form.protocol} onValueChange={v => setForm(f => ({...f, protocol: v}))}>
                <SelectTrigger className="mt-1 bg-input font-mono text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {["zigbee","zwave","wifi","mqtt","other"].map(p => <SelectItem key={p} value={p} className="font-mono text-xs">{p.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div><Label className="text-xs font-mono text-muted-foreground">TYP</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({...f, type: v}))}>
                <SelectTrigger className="mt-1 bg-input font-mono text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {["socket","relay","sensor","switch","camera","lock","other"].map(t => <SelectItem key={t} value={t} className="font-mono text-xs">{deviceTypeIcons[t]} {t.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select></div>
          </div>
          <div><Label className="text-xs font-mono text-muted-foreground">LOKALIZACJA</Label>
            <Input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="np. Biuro / Serwerownia" className="mt-1 bg-input font-mono" /></div>
          <div><Label className="text-xs font-mono text-muted-foreground">REGUŁA AUTOMATYZACJI</Label>
            <Textarea value={form.automationRule} onChange={e => setForm(f => ({...f, automationRule: e.target.value}))}
              placeholder="np. Wyłącz o 23:00, Włącz gdy ruch wykryty..." className="mt-1 bg-input font-mono text-sm resize-none" rows={2} /></div>
          <Button onClick={() => createMutation.mutate({ name: form.name, protocol: form.protocol as any, type: form.type as any, location: form.location, automationRule: form.automationRule })}
            disabled={!form.name || createMutation.isPending} className="w-full font-mono">
            {createMutation.isPending ? "DODAWANIE..." : "DODAJ URZĄDZENIE"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SmartHome() {
  const utils = trpc.useUtils();
  const { data: devices = [] } = trpc.smartHome.list.useQuery();
  const toggleMutation = trpc.smartHome.toggle.useMutation({
    onMutate: async ({ id, isPowered }) => {
      await utils.smartHome.list.cancel();
      const prev = utils.smartHome.list.getData();
      utils.smartHome.list.setData(undefined, old => old?.map(d => d.id === id ? { ...d, isPowered } : d));
      return { prev };
    },
    onError: (_, __, ctx) => utils.smartHome.list.setData(undefined, ctx?.prev),
    onSettled: () => utils.smartHome.list.invalidate(),
  });
  const updateMutation = trpc.smartHome.update.useMutation({
    onSuccess: () => utils.smartHome.list.invalidate(),
  });
  const deleteMutation = trpc.smartHome.delete.useMutation({
    onSuccess: () => { toast.success("Urządzenie usunięte"); utils.smartHome.list.invalidate(); },
  });

  const onlineDevices = devices.filter(d => d.isOnline).length;
  const poweredDevices = devices.filter(d => d.isPowered).length;
  const automatedDevices = devices.filter(d => d.automationEnabled).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground tracking-wide">SMART HOME</h1>
          <p className="text-sm text-muted-foreground mt-1">Zarządzanie urządzeniami Zigbee/Z-Wave i automatyzacją</p>
        </div>
        <AddDeviceDialog onSuccess={() => utils.smartHome.list.invalidate()} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-mono text-green-400">{onlineDevices}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">ONLINE</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-mono text-yellow-400">{poweredDevices}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">ZASILONE</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-mono text-blue-400">{automatedDevices}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">AUTOMATYZACJA</p>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-4">
        <p className="text-xs font-mono text-yellow-400 mb-2">⚠ ZASADY BEZPIECZEŃSTWA SMART HOME</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-muted-foreground">
          <span>• Używaj lokalnego huba (Home Assistant) bez chmury</span>
          <span>• Oddzielna sieć VLAN dla urządzeń IoT</span>
          <span>• Wyłącz zdalne zarządzanie producenta</span>
          <span>• Aktualizuj firmware regularnie</span>
        </div>
      </div>

      {/* Devices Grid */}
      {devices.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">Brak urządzeń Smart Home</p>
          <p className="text-xs text-muted-foreground mt-1">Dodaj gniazdka, przekaźniki i czujniki</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {devices.map(device => (
            <div key={device.id} className={`bg-card border rounded-xl p-5 space-y-4 transition-all ${device.isPowered ? "border-primary/30" : "border-border"}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`text-2xl`}>{deviceTypeIcons[device.type] || "📦"}</div>
                  <div>
                    <h3 className="font-medium text-foreground font-mono text-sm">{device.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-mono ${protocolColors[device.protocol]}`}>{device.protocol.toUpperCase()}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{device.location || "—"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {device.isOnline
                    ? <Wifi className="w-3 h-3 text-green-400" />
                    : <WifiOff className="w-3 h-3 text-muted-foreground" />}
                </div>
              </div>

              {device.automationRule && (
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground font-mono">⚡ {device.automationRule}</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Zasilanie:</span>
                  <button onClick={() => toggleMutation.mutate({ id: device.id, isPowered: !device.isPowered })}
                    className="transition-colors">
                    {device.isPowered
                      ? <ToggleRight className="w-6 h-6 text-primary" />
                      : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
                  </button>
                  <span className={`text-xs font-mono ${device.isPowered ? "text-primary" : "text-muted-foreground"}`}>
                    {device.isPowered ? "WŁ" : "WYŁ"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateMutation.mutate({ id: device.id, automationEnabled: !device.automationEnabled })}
                    className={`text-xs font-mono px-2 py-1 rounded border transition-all ${device.automationEnabled ? "text-blue-400 border-blue-400/30 bg-blue-400/10" : "text-muted-foreground border-border"}`}>
                    AUTO
                  </button>
                  <button onClick={() => { if (confirm(`Usunąć ${device.name}?`)) deleteMutation.mutate({ id: device.id }); }}
                    className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
