import { Shield, Usb, Zap, Lock, Eye, Radio, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from "lucide-react";
import { useState } from "react";

const physicalSystems = [
  {
    id: "kill_switch",
    name: "Kill Switch USB",
    icon: Usb,
    color: "text-red-400",
    borderColor: "border-red-400/30",
    riskLevel: "KRYTYCZNY",
    difficulty: "PODSTAWOWY",
    description: "Fizyczny klucz USB inicjujący natychmiastowe szyfrowanie i wyłączenie systemu przy odłączeniu. Ochrona przed nieautoryzowanym dostępem fizycznym.",
    howItWorks: "Klucz USB jest stale podłączony do komputera. Skrypt monitorujący (udev w Linux) wykrywa odłączenie i natychmiast inicjuje: 1) Szyfrowanie RAM (TRESOR/MemGuard), 2) Zamknięcie wszystkich sesji, 3) Wyłączenie systemu lub hibernację z szyfrowaniem.",
    implementation: [
      "Utwórz plik /etc/udev/rules.d/99-kill-switch.rules",
      'Dodaj regułę: ACTION=="remove", ATTRS{idVendor}=="XXXX", RUN+="/usr/local/bin/kill-switch.sh"',
      "Skrypt kill-switch.sh: sync && cryptsetup luksClose /dev/sda2 && poweroff",
      "Alternatywnie: USBKill (hardware) - generuje ładunek elektryczny niszczący dane",
      "Testuj regularnie w kontrolowanych warunkach",
      "Noś klucz zawsze przy sobie — oddzielony od komputera",
    ],
    requirements: ["USB drive (dedykowany klucz)", "Linux z udev lub Windows z AutoRun", "Skrypt kill-switch.sh z uprawnieniami root", "Opcjonalnie: USBKill hardware device"],
    warnings: ["Testuj PRZED wdrożeniem na produkcji", "Upewnij się że dane są zaszyfrowane przed wdrożeniem", "Fałszywe alarmy mogą spowodować utratę niezapisanych danych"],
  },
  {
    id: "faraday",
    name: "Klatka Faradaya",
    icon: Radio,
    color: "text-blue-400",
    borderColor: "border-blue-400/30",
    riskLevel: "NISKIE",
    difficulty: "PODSTAWOWY",
    description: "Metalowa obudowa blokująca sygnały elektromagnetyczne. Chroni przed zdalnym podsłuchem TEMPEST, atakami RF i nieautoryzowaną komunikacją bezprzewodową.",
    howItWorks: "Klatka Faradaya działa przez zasadę ekranowania elektromagnetycznego. Metalowa obudowa przewodzi prąd elektryczny i tworzy wewnętrzne pole elektryczne, które anuluje zewnętrzne pole EM. Skuteczna dla częstotliwości od 100MHz do 10GHz.",
    implementation: [
      "Użyj metalowego pojemnika (stal, aluminium, miedź) bez szczelin",
      "Szczeliny > 1/10 długości fali obniżają skuteczność",
      "Dla WiFi (2.4GHz): szczeliny max 1.25cm",
      "Dla 5G (28GHz): szczeliny max 1mm",
      "Testuj: umieść telefon w środku i zadzwoń — brak sygnału = sukces",
      "Dla laptopów: specjalne torby Faradaya lub metalowe skrzynki z uszczelkami",
      "Regularnie sprawdzaj integralność (brak szczelin, uszkodzeń)",
    ],
    requirements: ["Metalowy pojemnik lub torba Faradaya", "Uszczelki przewodzące dla pokryw", "Tester RF lub telefon do weryfikacji", "Opcjonalnie: miernik pola EM"],
    warnings: ["Klatka nie chroni przed atakami przez przewody (zasilanie, USB)", "Nie chroni przed atakami akustycznymi", "Wymaga regularnej weryfikacji integralności"],
  },
  {
    id: "laser_tripwire",
    name: "Laserowy Tripwire",
    icon: Eye,
    color: "text-green-400",
    borderColor: "border-green-400/30",
    riskLevel: "NISKIE",
    difficulty: "ZAAWANSOWANY",
    description: "System detekcji wtargnięcia oparty na wiązce laserowej. Przerwanie wiązki wyzwala alarm lub automatyczne działania ochronne.",
    howItWorks: "Laser (dioda laserowa 650nm) emituje wiązkę do fotodiody lub lustra. Przerwanie wiązki przez intruza generuje sygnał elektryczny. Raspberry Pi lub Arduino monitoruje sygnał i wyzwala akcje: alarm, powiadomienie, kill switch.",
    implementation: [
      "Komponenty: laser 5mW 650nm, fotodioda, Raspberry Pi Zero",
      "Podłącz fotodiodę do GPIO Raspberry Pi",
      "Skrypt Python: monitoruj GPIO, wyślij powiadomienie przy przerwaniu",
      "Integracja z Home Assistant przez MQTT",
      "Opcjonalnie: lustro do odbicia wiązki (trudniejsze do ominięcia)",
      "Zasilanie bateryjne dla niezależności od sieci",
      "Szyfruj komunikację z hubem Smart Home",
    ],
    requirements: ["Laser 5mW 650nm", "Fotodioda lub LDR", "Raspberry Pi Zero W lub Arduino", "Moduł WiFi/Zigbee do powiadomień", "Zasilanie bateryjne (18650)"],
    warnings: ["Unikaj bezpośredniego kontaktu wzrokowego z wiązką laserową", "Klasa 3B — wymaga oznaczeń ostrzegawczych", "Może być zakłócony przez silne oświetlenie zewnętrzne"],
  },
  {
    id: "magnetic_airgap",
    name: "Magnetyczny Air-Gap Detector",
    icon: Zap,
    color: "text-yellow-400",
    borderColor: "border-yellow-400/30",
    riskLevel: "NISKIE",
    difficulty: "ZAAWANSOWANY",
    description: "Detektor pola magnetycznego monitorujący obecność urządzeń elektronicznych w pobliżu. Wykrywa potencjalne ataki TEMPEST i nieautoryzowane urządzenia.",
    howItWorks: "Czujnik Hall lub magnetometr (HMC5883L) mierzy pole magnetyczne w otoczeniu. Anomalie wskazują na obecność aktywnych urządzeń elektronicznych (laptopy, telefony, dyski twarde). Raspberry Pi analizuje dane i generuje alerty przy wykryciu nieznanych źródeł EM.",
    implementation: [
      "Czujnik: HMC5883L lub MPU-9250 (magnetometr 3-osiowy)",
      "Podłącz przez I2C do Raspberry Pi",
      "Kalibruj baseline w czystym środowisku",
      "Skrypt Python: monitoruj odchylenia od baseline",
      "Alert gdy odchylenie > 50μT (obecność urządzenia)",
      "Loguj wszystkie anomalie z timestampem",
      "Integracja z OPSEC Dashboard przez API",
    ],
    requirements: ["Magnetometr HMC5883L lub MPU-9250", "Raspberry Pi lub Arduino", "Biblioteka Python dla I2C", "Kalibracja środowiska bazowego"],
    warnings: ["Wymaga kalibracji w docelowym środowisku", "Może generować fałszywe alarmy przy zmianach EM otoczenia", "Nie zastępuje fizycznej inspekcji pomieszczenia"],
  },
  {
    id: "tempest_shield",
    name: "TEMPEST Shielding",
    icon: Shield,
    color: "text-purple-400",
    borderColor: "border-purple-400/30",
    riskLevel: "NISKIE",
    difficulty: "EKSPERT",
    description: "Kompleksowe ekranowanie elektromagnetyczne pomieszczenia lub urządzenia zgodne ze standardem NATO TEMPEST. Zapobiega przechwyceniu emisji EM.",
    howItWorks: "TEMPEST (Telecommunications Electronics Material Protected from Emanating Spurious Transmissions) to standard NATO/NSA dla ekranowania EM. Urządzenia certyfikowane TEMPEST emitują minimalne promieniowanie EM, uniemożliwiając rekonstrukcję wyświetlanych danych lub przetwarzanych informacji.",
    implementation: [
      "Poziom 1 (DIY): Klatka Faradaya + ekranowane kable + filtr zasilania",
      "Poziom 2 (Profesjonalny): Ekranowane pomieszczenie (Faraday Room)",
      "Użyj kabli ekranowanych (STP zamiast UTP)",
      "Filtr zasilania EMI/RFI na wejściu zasilania",
      "Ekranowany monitor (starsze CRT emitują więcej niż LCD)",
      "Certyfikowane urządzenia TEMPEST (Zone B lub wyżej)",
      "Regularne testy emisji EM przez certyfikowane laboratorium",
    ],
    requirements: ["Ekranowane pomieszczenie lub klatka Faradaya", "Kable STP (Shielded Twisted Pair)", "Filtr EMI/RFI na zasilaniu", "Certyfikowane urządzenia TEMPEST (opcjonalnie)", "Miernik emisji EM do weryfikacji"],
    warnings: ["Pełna certyfikacja TEMPEST jest kosztowna (10k-100k USD)", "DIY TEMPEST zapewnia podstawową ochronę, nie certyfikowaną", "Wymaga regularnych audytów emisji EM"],
  },
  {
    id: "usb_condom",
    name: "USB Data Blocker",
    icon: Lock,
    color: "text-orange-400",
    borderColor: "border-orange-400/30",
    riskLevel: "NISKIE",
    difficulty: "PODSTAWOWY",
    description: "Adapter USB blokujący linie danych, przepuszczający tylko zasilanie. Ochrona przed atakami Juice Jacking i BadUSB przy ładowaniu z publicznych źródeł.",
    howItWorks: "USB Data Blocker (potocznie 'USB Condom') to adapter z usuniętymi lub przeciętymi liniami D+ i D-. Przepuszcza tylko +5V i GND (zasilanie). Uniemożliwia transfer danych w obu kierunkach, chroniąc przed złośliwymi ładowarkami i stacjami ładowania.",
    implementation: [
      "Kup gotowy USB Data Blocker (PortaPow, Privise, itp.)",
      "Alternatywnie: zmodyfikuj stary kabel USB (przeciąć D+/D-)",
      "Używaj zawsze przy ładowaniu z publicznych portów USB",
      "Dotyczy też portów w hotelach, samolotach, kawiarniach",
      "Dla urządzeń offline: używaj przy każdym podłączeniu nieznanego USB",
      "Weryfikuj autentyczność kupionego blockera (fałszywe produkty istnieją)",
    ],
    requirements: ["USB Data Blocker (gotowy produkt)", "Alternatywnie: kabel USB do modyfikacji", "Opcjonalnie: miernik prądu USB do weryfikacji"],
    warnings: ["Nie chroni przed atakami przez zasilanie (Power Analysis)", "Sprawdź czy blocker nie ma własnego mikrokontrolera (ryzyko BadUSB)", "Nie używaj do transferu danych — tylko do ładowania"],
  },
];

function SystemCard({ system }: { system: typeof physicalSystems[0] }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = system.icon;

  return (
    <div className={`bg-card border rounded-xl overflow-hidden transition-all ${expanded ? system.borderColor : "border-border hover:border-primary/30"}`}>
      <div className="p-5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg bg-muted shrink-0`}>
              <Icon className={`w-5 h-5 ${system.color}`} />
            </div>
            <div>
              <h3 className="font-medium text-foreground font-mono text-sm">{system.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-mono ${system.color}`}>{system.riskLevel}</span>
                <span className="text-muted-foreground text-xs">·</span>
                <span className="text-xs text-muted-foreground">{system.difficulty}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{system.description}</p>
            </div>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-3">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border space-y-4 p-5">
          {/* How it works */}
          <div>
            <p className="text-xs font-mono text-muted-foreground tracking-wider mb-2">JAK TO DZIAŁA</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{system.howItWorks}</p>
          </div>

          {/* Implementation */}
          <div>
            <p className="text-xs font-mono text-muted-foreground tracking-wider mb-2">IMPLEMENTACJA</p>
            <div className="bg-muted/20 rounded-lg p-4 space-y-1.5">
              {system.implementation.map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className={`font-mono shrink-0 ${system.color}`}>{String(i + 1).padStart(2, "0")}.</span>
                  <span className="text-muted-foreground font-mono">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Requirements */}
          <div>
            <p className="text-xs font-mono text-muted-foreground tracking-wider mb-2">WYMAGANIA</p>
            <div className="flex flex-wrap gap-2">
              {system.requirements.map((req, i) => (
                <span key={i} className="text-xs font-mono px-2 py-1 rounded bg-muted/40 text-muted-foreground border border-border/50">
                  {req}
                </span>
              ))}
            </div>
          </div>

          {/* Warnings */}
          <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
              <p className="text-xs font-mono text-yellow-400">OSTRZEŻENIA</p>
            </div>
            {system.warnings.map((w, i) => (
              <p key={i} className="text-xs text-muted-foreground">• {w}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PhysicalSecurity() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold font-mono text-foreground tracking-wide">ZABEZPIECZENIA FIZYCZNE</h1>
        <p className="text-sm text-muted-foreground mt-1">Dokumentacja systemów ochrony fizycznej i hardware security</p>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <p className="text-xs font-mono text-primary mb-2">🛡 ZASADA WARSTWOWA</p>
        <p className="text-xs text-muted-foreground">
          Bezpieczeństwo fizyczne jest fundamentem każdego systemu OPSEC. Nawet najlepsze szyfrowanie jest bezużyteczne,
          jeśli atakujący ma fizyczny dostęp do urządzenia. Implementuj zabezpieczenia warstwowo — każda warstwa
          utrudnia atak i daje czas na reakcję.
        </p>
      </div>

      <div className="space-y-3">
        {physicalSystems.map(system => (
          <SystemCard key={system.id} system={system} />
        ))}
      </div>
    </div>
  );
}
