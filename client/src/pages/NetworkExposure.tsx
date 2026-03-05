import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wifi, WifiOff, Globe, Server, AlertTriangle, CheckCircle2,
  XCircle, Info, Shield, Eye, EyeOff, Network, Lock, Unlock,
  Radio, Bluetooth, Smartphone, Router
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortInfo {
  port: number;
  service: string;
  risk: "critical" | "high" | "medium" | "low" | "info";
  description: string;
  recommendation: string;
}

interface NetworkProfile {
  name: string;
  description: string;
  exposureScore: number;
  risks: string[];
  mitigations: string[];
  icon: React.ReactNode;
}

// ─── Port Database ────────────────────────────────────────────────────────────

const KNOWN_PORTS: PortInfo[] = [
  { port: 21, service: "FTP", risk: "critical", description: "Przesyłanie plików bez szyfrowania", recommendation: "Wyłącz FTP, użyj SFTP (port 22)" },
  { port: 22, service: "SSH", risk: "medium", description: "Bezpieczny dostęp zdalny", recommendation: "Ogranicz dostęp do znanych IP, użyj kluczy zamiast haseł" },
  { port: 23, service: "Telnet", risk: "critical", description: "Nieszyfrowany dostęp zdalny", recommendation: "Wyłącz natychmiast, użyj SSH" },
  { port: 25, service: "SMTP", risk: "high", description: "Serwer poczty — może być nadużywany do spamu", recommendation: "Ogranicz do autoryzowanych klientów, użyj TLS" },
  { port: 53, service: "DNS", risk: "medium", description: "Serwer nazw domenowych", recommendation: "Ogranicz do lokalnej sieci, włącz DNSSEC" },
  { port: 80, service: "HTTP", risk: "high", description: "Nieszyfrowany ruch webowy", recommendation: "Przekieruj na HTTPS (443), wyłącz HTTP" },
  { port: 135, service: "RPC", risk: "critical", description: "Windows RPC — wektor ataków", recommendation: "Zablokuj na firewallu, ogranicz do sieci lokalnej" },
  { port: 139, service: "NetBIOS", risk: "critical", description: "Stary protokół Windows — podatny na ataki", recommendation: "Wyłącz NetBIOS, użyj SMB3" },
  { port: 143, service: "IMAP", risk: "medium", description: "Poczta bez szyfrowania", recommendation: "Użyj IMAPS (993)" },
  { port: 443, service: "HTTPS", risk: "low", description: "Szyfrowany ruch webowy", recommendation: "Upewnij się o aktualnym certyfikacie TLS 1.3" },
  { port: 445, service: "SMB", risk: "critical", description: "Udostępnianie plików Windows — EternalBlue", recommendation: "Zablokuj na zewnątrz, wyłącz SMBv1" },
  { port: 1194, service: "OpenVPN", risk: "low", description: "VPN — bezpieczny tunel", recommendation: "Upewnij się o aktualnej wersji i silnych kluczach" },
  { port: 1433, service: "MSSQL", risk: "critical", description: "Baza danych Microsoft SQL", recommendation: "Nigdy nie wystawiaj na internet, firewall" },
  { port: 3306, service: "MySQL", risk: "critical", description: "Baza danych MySQL/MariaDB", recommendation: "Tylko localhost lub VPN, silne hasło root" },
  { port: 3389, service: "RDP", risk: "critical", description: "Pulpit zdalny Windows — BlueKeep", recommendation: "Wyłącz lub ogranicz do VPN, włącz NLA" },
  { port: 4444, service: "Metasploit", risk: "critical", description: "Domyślny port Metasploit — potencjalny backdoor", recommendation: "Zablokuj natychmiast, sprawdź system" },
  { port: 5432, service: "PostgreSQL", risk: "critical", description: "Baza danych PostgreSQL", recommendation: "Tylko localhost lub VPN" },
  { port: 5900, service: "VNC", risk: "critical", description: "Pulpit zdalny VNC — słabe szyfrowanie", recommendation: "Wyłącz lub tuneluj przez SSH" },
  { port: 6379, service: "Redis", risk: "critical", description: "Baza Redis — często bez auth", recommendation: "Bind do localhost, ustaw hasło, firewall" },
  { port: 8080, service: "HTTP Alt", risk: "high", description: "Alternatywny port HTTP", recommendation: "Ogranicz dostęp, użyj HTTPS" },
  { port: 8443, service: "HTTPS Alt", risk: "low", description: "Alternatywny port HTTPS", recommendation: "Sprawdź certyfikat TLS" },
  { port: 9200, service: "Elasticsearch", risk: "critical", description: "Elasticsearch — często bez auth", recommendation: "Nigdy nie wystawiaj na internet" },
  { port: 27017, service: "MongoDB", risk: "critical", description: "MongoDB — często bez auth", recommendation: "Włącz auth, ogranicz do localhost" },
];

// ─── Network Profiles ─────────────────────────────────────────────────────────

const NETWORK_PROFILES: NetworkProfile[] = [
  {
    name: "Air-Gap (Idealny)",
    description: "Urządzenie całkowicie odizolowane — brak połączeń sieciowych",
    exposureScore: 0,
    risks: ["Brak ryzyka sieciowego"],
    mitigations: ["Fizyczna izolacja zachowana", "Transfer tylko przez QR/optyczny"],
    icon: <WifiOff className="w-5 h-5 text-green-400" />,
  },
  {
    name: "Faraday Box",
    description: "Urządzenie w klatce Faradaya — blokada EM",
    exposureScore: 5,
    risks: ["Ryzyko przy wyjęciu z klatki", "Side-channel przez zasilanie"],
    mitigations: ["Klatka Faradaya blokuje WiFi/GSM/BT", "Weryfikuj szczelność regularnie"],
    icon: <Shield className="w-5 h-5 text-cyan-400" />,
  },
  {
    name: "Offline (Bez sieci)",
    description: "Urządzenie bez połączenia sieciowego, ale poza klatką",
    exposureScore: 15,
    risks: ["Ryzyko side-channel (EM, akustyczne)", "Ryzyko fizycznego dostępu", "USB jako wektor ataku"],
    mitigations: ["Wyłącz WiFi/BT w BIOS", "Fizyczna kontrola dostępu", "USB Rubber Ducky protection"],
    icon: <Lock className="w-5 h-5 text-blue-400" />,
  },
  {
    name: "VPN (Chroniony)",
    description: "Połączenie przez VPN z kontrolowanym ruchem",
    exposureScore: 35,
    risks: ["VPN provider może logować ruch", "DNS leak", "WebRTC leak IP", "Kompromitacja serwera VPN"],
    mitigations: ["Użyj self-hosted VPN (WireGuard)", "DNS-over-HTTPS/TLS", "Wyłącz WebRTC w przeglądarce", "Kill switch VPN"],
    icon: <Network className="w-5 h-5 text-yellow-400" />,
  },
  {
    name: "LAN (Sieć lokalna)",
    description: "Podłączony do sieci lokalnej bez internetu",
    exposureScore: 45,
    risks: ["Ataki z sieci lokalnej (lateral movement)", "ARP spoofing", "Rogue DHCP", "Insider threat"],
    mitigations: ["Segmentacja VLAN", "802.1X auth", "Firewall lokalny", "IDS/IPS"],
    icon: <Router className="w-5 h-5 text-orange-400" />,
  },
  {
    name: "Internet (Pełna ekspozycja)",
    description: "Bezpośrednie połączenie z internetem",
    exposureScore: 85,
    risks: ["Skanowanie portów (Shodan)", "Brute force SSH/RDP", "Exploity 0-day", "DDoS", "MITM"],
    mitigations: ["Firewall z whitelist", "Fail2ban", "IDS/IPS", "Regularne aktualizacje", "Monitoring"],
    icon: <Globe className="w-5 h-5 text-red-400" />,
  },
];

// ─── Wireless Threats ─────────────────────────────────────────────────────────

const WIRELESS_THREATS = [
  { name: "WiFi (2.4GHz/5GHz)", risk: "high", icon: <Wifi className="w-4 h-4" />, threats: ["Evil Twin AP", "KRACK (WPA2)", "Deauth attack", "Wardriving"], mitigation: "Wyłącz WiFi gdy nieużywane, użyj WPA3" },
  { name: "Bluetooth", risk: "high", icon: <Bluetooth className="w-4 h-4" />, threats: ["BlueBorne exploit", "BIAS attack", "Bluesnarfing", "Bluebugging"], mitigation: "Wyłącz BT gdy nieużywane, nie paruj z nieznanymi urządzeniami" },
  { name: "NFC", risk: "medium", icon: <Radio className="w-4 h-4" />, threats: ["Relay attack", "Skimming", "Malicious tag"], mitigation: "Wyłącz NFC gdy nieużywane, etui blokujące NFC" },
  { name: "GSM/LTE", risk: "high", icon: <Smartphone className="w-4 h-4" />, threats: ["IMSI Catcher (Stingray)", "SS7 exploit", "SIM swap", "Baseband exploit"], mitigation: "Tryb samolotowy gdy nieużywane, telefon offline jako standard" },
  { name: "USB", risk: "critical", icon: <Server className="w-4 h-4" />, threats: ["BadUSB", "USB Rubber Ducky", "Juice Jacking", "HID attack"], mitigation: "Blokuj nieznane USB, używaj USB condom, wyłącz USB w BIOS" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function NetworkExposure() {
  const [portInput, setPortInput] = useState("");
  const [checkedPorts, setCheckedPorts] = useState<PortInfo[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<NetworkProfile | null>(null);
  const [customRisks, setCustomRisks] = useState<{ item: string; enabled: boolean }[]>([
    { item: "WiFi włączone", enabled: false },
    { item: "Bluetooth włączone", enabled: false },
    { item: "NFC włączone", enabled: false },
    { item: "GSM/LTE aktywne", enabled: false },
    { item: "Kamera podłączona", enabled: false },
    { item: "Mikrofon podłączony", enabled: false },
    { item: "USB niezablokowane", enabled: false },
    { item: "Brak szyfrowania dysku", enabled: false },
    { item: "Brak VPN", enabled: false },
    { item: "Otwarte porty na firewall", enabled: false },
    { item: "Brak aktualizacji systemu", enabled: false },
    { item: "Publiczna sieć WiFi", enabled: false },
  ]);

  const riskScore = useMemo(() => {
    const activeRisks = customRisks.filter(r => r.enabled).length;
    return Math.min(100, activeRisks * 9);
  }, [customRisks]);

  const riskLevel = riskScore >= 70 ? "KRYTYCZNE" : riskScore >= 50 ? "WYSOKIE" : riskScore >= 30 ? "ŚREDNIE" : riskScore >= 10 ? "NISKIE" : "MINIMALNE";
  const riskColor = riskScore >= 70 ? "text-red-400" : riskScore >= 50 ? "text-orange-400" : riskScore >= 30 ? "text-yellow-400" : "text-green-400";

  const checkPort = () => {
    const port = parseInt(portInput.trim());
    if (isNaN(port) || port < 1 || port > 65535) return;
    const known = KNOWN_PORTS.find(p => p.port === port);
    const info: PortInfo = known || {
      port,
      service: "Nieznana usługa",
      risk: "medium",
      description: "Port nie jest w bazie danych — wymaga manualnej analizy",
      recommendation: "Sprawdź co nasłuchuje na tym porcie: netstat -tlnp | grep :" + port,
    };
    if (!checkedPorts.find(p => p.port === port)) {
      setCheckedPorts(prev => [...prev, info]);
    }
    setPortInput("");
  };

  const RISK_COLORS: Record<string, string> = {
    critical: "text-red-400 border-red-500/30 bg-red-500/5",
    high: "text-orange-400 border-orange-500/30 bg-orange-500/5",
    medium: "text-yellow-400 border-yellow-500/30 bg-yellow-500/5",
    low: "text-green-400 border-green-500/30 bg-green-500/5",
    info: "text-blue-400 border-blue-500/30 bg-blue-500/5",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-mono font-bold text-slate-100 flex items-center gap-2">
          <Network className="w-6 h-6 text-cyan-400" />
          NETWORK EXPOSURE ANALYZER
        </h1>
        <p className="text-slate-400 text-sm mt-1">Analiza ekspozycji sieciowej, portów i wektorów ataku bezprzewodowego</p>
      </div>

      <Tabs defaultValue="exposure" className="space-y-4">
        <TabsList className="bg-slate-900 border border-slate-700">
          <TabsTrigger value="exposure" className="font-mono data-[state=active]:bg-slate-700">EKSPOZYCJA</TabsTrigger>
          <TabsTrigger value="ports" className="font-mono data-[state=active]:bg-slate-700">PORTY</TabsTrigger>
          <TabsTrigger value="wireless" className="font-mono data-[state=active]:bg-slate-700">BEZPRZEWODOWE</TabsTrigger>
          <TabsTrigger value="profiles" className="font-mono data-[state=active]:bg-slate-700">PROFILE SIECI</TabsTrigger>
        </TabsList>

        {/* ─── EXPOSURE TAB ─── */}
        <TabsContent value="exposure" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Risk Score */}
            <Card className="bg-slate-900/50 border-slate-700/50 md:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm font-mono text-slate-400">WSKAŹNIK EKSPOZYCJI</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-3">
                <div className={`text-5xl font-mono font-bold ${riskColor}`}>{riskScore}</div>
                <div className={`text-sm font-mono font-bold ${riskColor}`}>{riskLevel}</div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      riskScore >= 70 ? "bg-red-500" : riskScore >= 50 ? "bg-orange-500" : riskScore >= 30 ? "bg-yellow-500" : "bg-green-500"
                    }`}
                    style={{ width: `${riskScore}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  {customRisks.filter(r => r.enabled).length} / {customRisks.length} czynników ryzyka aktywnych
                </p>
              </CardContent>
            </Card>

            {/* Risk Checklist */}
            <Card className="bg-slate-900/50 border-slate-700/50 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-mono text-slate-400">CZYNNIKI RYZYKA — ZAZNACZ AKTYWNE</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {customRisks.map((risk, i) => (
                    <label
                      key={i}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-colors ${
                        risk.enabled
                          ? "border-red-500/40 bg-red-500/10"
                          : "border-slate-700/50 hover:border-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={risk.enabled}
                        onChange={e => setCustomRisks(prev =>
                          prev.map((r, j) => j === i ? { ...r, enabled: e.target.checked } : r)
                        )}
                        className="accent-red-500"
                      />
                      <span className={`text-xs font-mono ${risk.enabled ? "text-red-300" : "text-slate-400"}`}>
                        {risk.item}
                      </span>
                      {risk.enabled
                        ? <XCircle className="w-3 h-3 text-red-400 ml-auto flex-shrink-0" />
                        : <CheckCircle2 className="w-3 h-3 text-green-400 ml-auto flex-shrink-0" />
                      }
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          {customRisks.filter(r => r.enabled).length > 0 && (
            <Card className="bg-red-500/5 border-red-500/20">
              <CardHeader>
                <CardTitle className="text-sm font-mono text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> AKTYWNE ZAGROŻENIA — WYMAGANE DZIAŁANIE
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {customRisks.filter(r => r.enabled).map((risk, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs font-mono text-slate-300">
                      <span className="text-red-400 flex-shrink-0">!</span>
                      <span>{risk.item} — wyłącz lub zabezpiecz przed użyciem urządzenia</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── PORTS TAB ─── */}
        <TabsContent value="ports" className="space-y-4">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-sm font-mono text-slate-400">SPRAWDŹ PORT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={portInput}
                  onChange={e => setPortInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && checkPort()}
                  placeholder="Numer portu (1-65535)..."
                  className="bg-slate-800 border-slate-700 text-slate-100 font-mono"
                  min={1}
                  max={65535}
                />
                <Button onClick={checkPort} className="bg-cyan-600 hover:bg-cyan-700 font-mono">
                  SPRAWDŹ
                </Button>
              </div>

              {checkedPorts.length > 0 && (
                <div className="space-y-2">
                  {checkedPorts.map((port, i) => (
                    <div key={i} className={`rounded-lg border p-3 ${RISK_COLORS[port.risk]}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-sm">:{port.port} — {port.service}</span>
                        <Badge className={`text-xs font-mono ${RISK_COLORS[port.risk]}`}>
                          {port.risk.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 mb-1">{port.description}</p>
                      <p className="text-xs text-slate-300 flex items-start gap-1">
                        <span className="text-cyan-400 flex-shrink-0">→</span> {port.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Known Dangerous Ports */}
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-sm font-mono text-slate-400">BAZA NIEBEZPIECZNYCH PORTÓW</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {KNOWN_PORTS.filter(p => p.risk === "critical" || p.risk === "high").map((port, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 border-b border-slate-800/50 text-xs font-mono">
                    <span className={`w-16 text-right flex-shrink-0 ${RISK_COLORS[port.risk].split(" ")[0]}`}>
                      :{port.port}
                    </span>
                    <span className="w-24 text-slate-300 flex-shrink-0">{port.service}</span>
                    <span className="text-slate-500 flex-1 truncate">{port.description}</span>
                    <Badge className={`text-xs ${RISK_COLORS[port.risk]} flex-shrink-0`}>
                      {port.risk}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── WIRELESS TAB ─── */}
        <TabsContent value="wireless" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {WIRELESS_THREATS.map((threat, i) => (
              <Card key={i} className={`border ${RISK_COLORS[threat.risk]}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-mono flex items-center gap-2">
                    <span className={RISK_COLORS[threat.risk].split(" ")[0]}>{threat.icon}</span>
                    {threat.name}
                    <Badge className={`ml-auto text-xs ${RISK_COLORS[threat.risk]}`}>
                      {threat.risk.toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-xs font-mono text-slate-500 mb-1">ZAGROŻENIA:</p>
                    <div className="flex flex-wrap gap-1">
                      {threat.threats.map((t, j) => (
                        <span key={j} className="text-xs font-mono text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-start gap-1 text-xs font-mono text-slate-300">
                    <span className="text-cyan-400 flex-shrink-0">→</span>
                    {threat.mitigation}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-cyan-500/5 border-cyan-500/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-mono text-cyan-400 font-bold">ZASADA MINIMALNEJ EKSPOZYCJI</p>
                <p className="text-xs text-slate-400 mt-1">
                  Wyłącz wszystkie interfejsy bezprzewodowe gdy nie są aktywnie używane. Telefon offline (bez SIM, WiFi off, BT off)
                  to standard operacyjny dla urządzeń przechowujących wrażliwe dane. Każdy aktywny interfejs to potencjalny wektor ataku.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── PROFILES TAB ─── */}
        <TabsContent value="profiles" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {NETWORK_PROFILES.map((profile, i) => (
              <Card
                key={i}
                className={`bg-slate-900/50 border-slate-700/50 cursor-pointer transition-all hover:border-slate-500 ${
                  selectedProfile?.name === profile.name ? "border-cyan-500/50 bg-cyan-500/5" : ""
                }`}
                onClick={() => setSelectedProfile(selectedProfile?.name === profile.name ? null : profile)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-mono flex items-center gap-2">
                    {profile.icon}
                    {profile.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-slate-400">{profile.description}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-500">EKSPOZYCJA</span>
                      <span className={profile.exposureScore >= 60 ? "text-red-400" : profile.exposureScore >= 30 ? "text-yellow-400" : "text-green-400"}>
                        {profile.exposureScore}/100
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          profile.exposureScore >= 60 ? "bg-red-500" : profile.exposureScore >= 30 ? "bg-yellow-500" : "bg-green-500"
                        }`}
                        style={{ width: `${profile.exposureScore}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedProfile && (
            <Card className="bg-slate-900/50 border-cyan-500/30">
              <CardHeader>
                <CardTitle className="text-sm font-mono text-cyan-400 flex items-center gap-2">
                  {selectedProfile.icon} {selectedProfile.name} — SZCZEGÓŁY
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-mono text-red-400 mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> RYZYKA
                    </p>
                    <ul className="space-y-1">
                      {selectedProfile.risks.map((r, i) => (
                        <li key={i} className="text-xs text-slate-400 font-mono flex items-start gap-1">
                          <span className="text-red-400 flex-shrink-0">▸</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-green-400 mb-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> MITYGACJE
                    </p>
                    <ul className="space-y-1">
                      {selectedProfile.mitigations.map((m, i) => (
                        <li key={i} className="text-xs text-slate-400 font-mono flex items-start gap-1">
                          <span className="text-green-400 flex-shrink-0">▸</span> {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
