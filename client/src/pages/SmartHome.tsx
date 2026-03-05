import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Zap, Plus, Trash2, Wifi, WifiOff, ToggleLeft, ToggleRight,
  AlertTriangle, Shield, Power, Radio, Search, Download, Lock
} from "lucide-react";
import { useState, useMemo } from "react";

const protocolColors: Record<string, string> = {
  zigbee: "text-blue-400", zwave: "text-purple-400", wifi: "text-yellow-400",
  mqtt: "text-green-400", other: "text-muted-foreground",
};

const deviceTypeIcons: Record<string, string> = {
  socket: "🔌", relay: "⚡", sensor: "📡", switch: "🔘",
  camera: "📷", lock: "🔒", other: "📦",
};

const securityRiskByType: Record<string, { risk: string; color: string; tips: string[] }> = {
  camera: {
    risk: "WYSOKIE",
    color: "text-red-400",
    tips: ["Wyłącz zdalny dostęp producenta", "Używaj lokalnego NVR", "Zaszyfruj transmisję"],
  },
  lock: {
    risk: "WYSOKIE",
    color: "text-red-400",
    tips: ["Backup klucza fizycznego", "Wyłącz Bluetooth gdy nieużywany", "Loguj każde otwarcie"],
  },
  socket: {
    risk: "NISKIE",
    color: "text-green-400",
    tips: ["Monitoruj zużycie energii", "Ustaw harmonogram wyłączania"],
  },
  relay: {
    risk: "ŚREDNIE",
    color: "text-yellow-400",
    tips: ["Zabezpiecz dostęp fizyczny", "Ogranicz automatyzacje"],
  },
  sensor: {
    risk: "NISKIE",
    color: "text-green-400",
    tips: ["Sprawdzaj baterie co miesiąc", "Weryfikuj zasięg"],
  },
  switch: {
    risk: "NISKIE",
    color: "text-green-400",
    tips: ["Testuj failover regularnie"],
  },
  other: {
    risk: "NIEZNANE",
    color: "text-muted-foreground",
    tips: ["Oceń ryzyko ręcznie"],
  },
};

// Security scenarios - predefined automation rules
const SECURITY_SCENARIOS = [
  { name: "Tryb Nocny", rule: "Wyłącz wszystkie urządzenia o 23:00, włącz o 7:00", icon: "🌙" },
  { name: "Tryb Nieobecności", rule: "Wyłącz wszystko gdy brak ruchu przez 30 min", icon: "🏃" },
  { name: "Alarm Włamanie", rule: "Włącz wszystkie światła i alarm gdy wykryto ruch", icon: "🚨" },
  { name: "Kill Switch", rule: "Natychmiastowe wyłączenie wszystkich urządzeń", icon: "☠️" },
  { name: "Tryb Prywatny", rule: "Wyłącz kamery i mikrofony, zasłoń okna", icon: "🔒" },
  { name: "Tryb Pracy", rule: "Włącz oświetlenie biurowe, wyłącz kamery wewnętrzne", icon: "💼" },
];

function AddDeviceDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", protocol: "zigbee", type: "socket", location: "", automationRule: ""
  });
  const createMutation = trpc.smartHome.create.useMutation({
    onSuccess: () => {
      toast.success("Urządzenie dodane");
      setOpen(false);
      onSuccess();
      setForm({ name: "", protocol: "zigbee", type: "socket", location: "", automationRule: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const riskInfo = securityRiskByType[form.type];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 font-mono text-xs"><Plus className="w-4 h-4" />Dodaj Urządzenie</Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader><DialogTitle className="font-mono">NOWE URZĄDZENIE SMART HOME</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-mono text-muted-foreground">NAZWA URZĄDZENIA</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="np. Gniazdko Serwer AI" className="mt-1 bg-input font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono text-muted-foreground">PROTOKÓŁ</Label>
              <Select value={form.protocol} onValueChange={v => setForm(f => ({ ...f, protocol: v }))}>
                <SelectTrigger className="mt-1 bg-input font-mono text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {["zigbee", "zwave", "wifi", "mqtt", "other"].map(p => (
                    <SelectItem key={p} value={p} className={`font-mono text-xs ${protocolColors[p]}`}>{p.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-mono text-muted-foreground">TYP URZĄDZENIA</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1 bg-input font-mono text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {["socket", "relay", "sensor", "switch", "camera", "lock", "other"].map(t => (
                    <SelectItem key={t} value={t} className="font-mono text-xs">{deviceTypeIcons[t]} {t.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Security risk for selected type */}
          {riskInfo && (
            <div className={`rounded-lg p-3 bg-muted/20 border border-border`}>
              <p className="text-xs font-mono text-muted-foreground mb-1">
                Ryzyko bezpieczeństwa: <span className={riskInfo.color}>{riskInfo.risk}</span>
              </p>
              <div className="space-y-0.5">
                {riskInfo.tips.map(tip => (
                  <p key={tip} className="text-xs text-muted-foreground">• {tip}</p>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs font-mono text-muted-foreground">LOKALIZACJA</Label>
            <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="np. Biuro / Serwerownia" className="mt-1 bg-input font-mono" />
          </div>
          <div>
            <Label className="text-xs font-mono text-muted-foreground">REGUŁA AUTOMATYZACJI</Label>
            <div className="flex gap-1.5 flex-wrap mb-1.5 mt-1">
              {SECURITY_SCENARIOS.slice(0, 3).map(s => (
                <button key={s.name} onClick={() => setForm(f => ({ ...f, automationRule: s.rule }))}
                  className="text-xs font-mono px-2 py-1 rounded bg-muted/30 hover:bg-muted/60 border border-border text-muted-foreground hover:text-foreground transition-colors">
                  {s.icon} {s.name}
                </button>
              ))}
            </div>
            <Textarea value={form.automationRule} onChange={e => setForm(f => ({ ...f, automationRule: e.target.value }))}
              placeholder="np. Wyłącz o 23:00, Włącz gdy ruch wykryty..." className="bg-input font-mono text-sm resize-none" rows={2} />
          </div>
          <Button
            onClick={() => createMutation.mutate({ name: form.name, protocol: form.protocol as any, type: form.type as any, location: form.location, automationRule: form.automationRule })}
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

export default function SmartHome() {
  const utils = trpc.useUtils();
  const { data: devices = [], isLoading } = trpc.smartHome.list.useQuery();
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

  const [search, setSearch] = useState("");
  const [filterProtocol, setFilterProtocol] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [groupBy, setGroupBy] = useState<"none" | "location" | "protocol" | "type">("none");

  const filtered = useMemo(() => {
    return devices.filter(d => {
      if (filterProtocol !== "all" && d.protocol !== filterProtocol) return false;
      if (filterType !== "all" && d.type !== filterType) return false;
      if (search && !d.name.toLowerCase().includes(search.toLowerCase()) &&
        !(d.location || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [devices, filterProtocol, filterType, search]);

  // Group devices
  const grouped = useMemo(() => {
    if (groupBy === "none") return { "Wszystkie urządzenia": filtered };
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(d => {
      const key = groupBy === "location" ? (d.location || "Bez lokalizacji")
        : groupBy === "protocol" ? d.protocol.toUpperCase()
          : deviceTypeIcons[d.type] + " " + d.type.toUpperCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });
    return groups;
  }, [filtered, groupBy]);

  const stats = {
    total: devices.length,
    online: devices.filter(d => d.isOnline).length,
    powered: devices.filter(d => d.isPowered).length,
    automated: devices.filter(d => d.automationEnabled).length,
    highRisk: devices.filter(d => ["camera", "lock"].includes(d.type)).length,
  };

  // Kill switch - power off all
  const killSwitch = () => {
    if (!confirm("KILL SWITCH: Wyłączyć WSZYSTKIE urządzenia?")) return;
    devices.forEach(d => {
      if (d.isPowered) toggleMutation.mutate({ id: d.id, isPowered: false });
    });
    toast.success("Kill Switch aktywowany — wszystkie urządzenia wyłączone", { duration: 5000 });
  };

  const exportConfig = () => {
    const config = {
      exportDate: new Date().toISOString(),
      devices: devices.map(d => ({
        name: d.name, protocol: d.protocol, type: d.type,
        location: d.location, automationRule: d.automationRule,
        automationEnabled: d.automationEnabled,
      })),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `smarthome-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Konfiguracja wyeksportowana");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground tracking-wide">SMART HOME</h1>
          <p className="text-sm text-muted-foreground mt-1">Zarządzanie urządzeniami Zigbee/Z-Wave i automatyzacją</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {devices.length > 0 && (
            <>
              <Button size="sm" variant="outline" className="gap-2 font-mono text-xs" onClick={exportConfig}>
                <Download className="w-3.5 h-3.5" />Eksport
              </Button>
              <Button size="sm" variant="destructive" className="gap-2 font-mono text-xs" onClick={killSwitch}>
                <Power className="w-3.5 h-3.5" />Kill Switch
              </Button>
            </>
          )}
          <AddDeviceDialog onSuccess={() => utils.smartHome.list.invalidate()} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-mono text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">ŁĄCZNIE</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-mono text-green-400">{stats.online}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">ONLINE</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-mono text-yellow-400">{stats.powered}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">ZASILONE</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-mono text-blue-400">{stats.automated}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">AUTO</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-mono text-red-400">{stats.highRisk}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">WYSOKIE RYZYKO</p>
        </div>
      </div>

      {/* Security scenarios */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-mono text-muted-foreground mb-3 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />SCENARIUSZE BEZPIECZEŃSTWA
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SECURITY_SCENARIOS.map(s => (
            <button key={s.name}
              onClick={() => toast.info(`Scenariusz "${s.name}": ${s.rule}`, { duration: 5000 })}
              className="text-left p-3 rounded-lg bg-muted/20 hover:bg-muted/40 border border-border transition-colors">
              <p className="text-sm">{s.icon}</p>
              <p className="text-xs font-mono text-foreground mt-1">{s.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.rule}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Security notice */}
      <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-4">
        <p className="text-xs font-mono text-yellow-400 mb-2 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />ZASADY BEZPIECZEŃSTWA SMART HOME
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-muted-foreground">
          <span>• Używaj lokalnego huba (Home Assistant) bez chmury</span>
          <span>• Oddzielna sieć VLAN dla urządzeń IoT</span>
          <span>• Wyłącz zdalne zarządzanie producenta</span>
          <span>• Aktualizuj firmware regularnie</span>
          <span>• Monitoruj ruch sieciowy urządzeń IoT</span>
          <span>• Fizyczny Kill Switch dla krytycznych urządzeń</span>
        </div>
      </div>

      {/* Search & Filter */}
      {devices.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Szukaj urządzenia..." className="pl-9 bg-input font-mono text-xs h-9" />
          </div>
          <Select value={filterProtocol} onValueChange={setFilterProtocol}>
            <SelectTrigger className="w-32 bg-input font-mono text-xs h-9"><SelectValue placeholder="Protokół" /></SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all" className="font-mono text-xs">Wszystkie</SelectItem>
              {["zigbee", "zwave", "wifi", "mqtt", "other"].map(p => (
                <SelectItem key={p} value={p} className={`font-mono text-xs ${protocolColors[p]}`}>{p.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32 bg-input font-mono text-xs h-9"><SelectValue placeholder="Typ" /></SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all" className="font-mono text-xs">Wszystkie typy</SelectItem>
              {["socket", "relay", "sensor", "switch", "camera", "lock", "other"].map(t => (
                <SelectItem key={t} value={t} className="font-mono text-xs">{deviceTypeIcons[t]} {t.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
            <span>Grupuj:</span>
            {(["none", "location", "protocol", "type"] as const).map(g => (
              <button key={g} onClick={() => setGroupBy(g)}
                className={`px-2 py-1 rounded transition-colors ${groupBy === g ? "bg-primary/20 text-primary" : "hover:text-foreground"}`}>
                {g === "none" ? "Brak" : g === "location" ? "Lok." : g === "protocol" ? "Prot." : "Typ"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Device Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse space-y-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-muted rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">Brak urządzeń Smart Home</p>
          <p className="text-xs text-muted-foreground mt-1">Dodaj gniazdka, przekaźniki i czujniki</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([groupName, groupDevices]) => (
            <div key={groupName}>
              {groupBy !== "none" && (
                <h3 className="text-xs font-mono text-muted-foreground mb-3 flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5" />{groupName}
                  <span className="text-muted-foreground/50">({groupDevices.length})</span>
                </h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {groupDevices.map(device => {
                  const riskInfo = securityRiskByType[device.type];
                  return (
                    <div key={device.id} className={`bg-card border rounded-xl p-5 space-y-4 transition-all ${device.isPowered ? "border-primary/30" : "border-border hover:border-primary/20"}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{deviceTypeIcons[device.type] || "📦"}</div>
                          <div>
                            <h3 className="font-medium text-foreground font-mono text-sm">{device.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs font-mono ${protocolColors[device.protocol]}`}>{device.protocol.toUpperCase()}</span>
                              {device.location && (
                                <>
                                  <span className="text-xs text-muted-foreground">·</span>
                                  <span className="text-xs text-muted-foreground">{device.location}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {riskInfo && (
                            <span className={`text-xs font-mono ${riskInfo.color}`} title={`Ryzyko: ${riskInfo.risk}`}>
                              {riskInfo.risk === "WYSOKIE" ? "⚠" : "·"}
                            </span>
                          )}
                          {device.isOnline
                            ? <Wifi className="w-3.5 h-3.5 text-green-400" />
                            : <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                      </div>

                      {device.automationRule && (
                        <div className="bg-muted/30 rounded-lg p-2">
                          <p className="text-xs text-muted-foreground font-mono line-clamp-2">⚡ {device.automationRule}</p>
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
                          <button
                            onClick={() => updateMutation.mutate({ id: device.id, automationEnabled: !device.automationEnabled })}
                            className={`text-xs font-mono px-2 py-1 rounded border transition-all ${device.automationEnabled ? "text-blue-400 border-blue-400/30 bg-blue-400/10" : "text-muted-foreground border-border hover:border-primary/30"}`}
                            title="Automatyzacja">
                            AUTO
                          </button>
                          <button
                            onClick={() => { if (confirm(`Usunąć ${device.name}?`)) deleteMutation.mutate({ id: device.id }); }}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
