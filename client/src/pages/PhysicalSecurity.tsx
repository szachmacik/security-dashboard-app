import {
  Shield, Usb, Zap, Lock, Eye, Radio, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, Download, Search, Filter, Cpu, Mic, HardDrive
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const physicalSystems = [
  {
    id: "kill_switch",
    name: "Kill Switch USB",
    icon: Usb,
    color: "text-red-400",
    bg: "bg-red-400/10",
    borderColor: "border-red-400/30",
    category: "Ochrona danych",
    riskLevel: "KRYTYCZNY",
    difficulty: "PODSTAWOWY",
    priority: 1,
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
    checklist: ["Zainstalowany udev rule", "Skrypt kill-switch.sh przetestowany", "Klucz USB zarejestrowany (idVendor)", "Dane zaszyfrowane (LUKS/VeraCrypt)", "Testowy restart przeprowadzony"],
  },
  {
    id: "faraday",
    name: "Klatka Faradaya",
    icon: Radio,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    borderColor: "border-blue-400/30",
    category: "Ekranowanie EM",
    riskLevel: "NISKIE",
    difficulty: "PODSTAWOWY",
    priority: 2,
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
    checklist: ["Pojemnik/torba Faradaya zakupiona", "Test telefonem przeprowadzony (brak sygnału)", "Szczeliny uszczelnione", "Regularna inspekcja zaplanowana"],
  },
  {
    id: "laser_tripwire",
    name: "Laserowy Tripwire",
    icon: Eye,
    color: "text-green-400",
    bg: "bg-green-400/10",
    borderColor: "border-green-400/30",
    category: "Detekcja wtargnięcia",
    riskLevel: "NISKIE",
    difficulty: "ZAAWANSOWANY",
    priority: 3,
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
    checklist: ["Komponenty zakupione", "Raspberry Pi skonfigurowane", "Skrypt Python napisany i przetestowany", "Integracja MQTT działa", "Zasilanie bateryjne podłączone", "Test alarmu przeprowadzony"],
  },
  {
    id: "magnetic_airgap",
    name: "Magnetyczny Air-Gap Detector",
    icon: Zap,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    borderColor: "border-yellow-400/30",
    category: "Detekcja EM",
    riskLevel: "NISKIE",
    difficulty: "ZAAWANSOWANY",
    priority: 4,
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
    checklist: ["Magnetometr zakupiony", "I2C skonfigurowane", "Baseline skalibrowany", "Skrypt monitorujący działa", "Logi anomalii skonfigurowane"],
  },
  {
    id: "tempest_shield",
    name: "TEMPEST Shielding",
    icon: Shield,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    borderColor: "border-purple-400/30",
    category: "Ekranowanie EM",
    riskLevel: "NISKIE",
    difficulty: "EKSPERT",
    priority: 5,
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
    checklist: ["Kable STP zainstalowane", "Filtr EMI/RFI na zasilaniu", "Klatka Faradaya lub ekranowane pomieszczenie", "Test emisji EM przeprowadzony"],
  },
  {
    id: "usb_condom",
    name: "USB Data Blocker",
    icon: Lock,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    borderColor: "border-orange-400/30",
    category: "Ochrona portów",
    riskLevel: "NISKIE",
    difficulty: "PODSTAWOWY",
    priority: 6,
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
    checklist: ["USB Data Blocker zakupiony", "Autentyczność zweryfikowana", "Procedura użycia wdrożona", "Pracownicy przeszkoleni"],
  },
  {
    id: "bios_lock",
    name: "BIOS/UEFI Lock + Secure Boot",
    icon: Cpu,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    borderColor: "border-cyan-400/30",
    category: "Ochrona firmware",
    riskLevel: "WYSOKIE",
    difficulty: "PODSTAWOWY",
    priority: 7,
    description: "Hasło BIOS/UEFI i Secure Boot zapobiegają uruchomieniu nieautoryzowanego systemu operacyjnego i modyfikacji firmware. Pierwsza linia obrony przed Evil Maid Attack.",
    howItWorks: "BIOS/UEFI Password blokuje dostęp do ustawień firmware i bootowania z zewnętrznych nośników. Secure Boot weryfikuje podpis cyfrowy bootloadera i kernela, uniemożliwiając uruchomienie niezaufanego kodu. Razem chronią przed Evil Maid Attack (fizyczny dostęp do komputera bez właściciela).",
    implementation: [
      "Wejdź do BIOS/UEFI (F2/F12/Del podczas startu)",
      "Ustaw silne hasło administratora BIOS (min. 20 znaków)",
      "Włącz Secure Boot (Settings → Security → Secure Boot)",
      "Wyłącz bootowanie z USB/CD/DVD",
      "Ustaw kolejność bootowania: tylko dysk wewnętrzny",
      "Włącz Intel Boot Guard lub AMD Platform Security Processor",
      "Zapisz hasło BIOS w bezpiecznym miejscu (offline)",
      "Rozważ fizyczne zabezpieczenie obudowy (śruby Torx, plomby)",
    ],
    requirements: ["Komputer z UEFI (nie legacy BIOS)", "System operacyjny z obsługą Secure Boot (Windows 11, Ubuntu 22.04+)", "Silne hasło BIOS (min. 20 znaków)"],
    warnings: ["Zapomniane hasło BIOS może wymagać resetu płyty głównej", "Secure Boot może blokować niektóre dystrybucje Linux", "Nie chroni przed atakami DMA (Thunderbolt/FireWire)"],
    checklist: ["Hasło BIOS ustawione", "Secure Boot włączony", "Bootowanie z USB wyłączone", "Kolejność bootowania ustawiona", "Hasło zapisane offline"],
  },
  {
    id: "tamper_detection",
    name: "Tamper Detection (Detekcja Ingerencji)",
    icon: HardDrive,
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    borderColor: "border-pink-400/30",
    category: "Detekcja wtargnięcia",
    riskLevel: "ŚREDNIE",
    difficulty: "ZAAWANSOWANY",
    priority: 8,
    description: "System wykrywania fizycznej ingerencji w urządzenia. Plomby bezpieczeństwa, czujniki otwarcia obudowy i weryfikacja integralności sprzętu.",
    howItWorks: "Tamper Detection łączy fizyczne plomby (naklejki holograficzne, lakier do paznokci z unikalnym wzorem) z elektronicznym monitoringiem (czujnik otwarcia obudowy w BIOS). Przy wykryciu ingerencji system może wyczyścić klucze kryptograficzne lub zaalarmować właściciela.",
    implementation: [
      "Plomby fizyczne: naklejki holograficzne na śrubach obudowy",
      "Lakier do paznokci z brokatem na złączach (unikalny wzór, zdjęcie przed wdrożeniem)",
      "Włącz chassis intrusion detection w BIOS",
      "Skonfiguruj alert przy wykryciu otwarcia obudowy",
      "Fotografuj urządzenia przed każdym wyjazdem/przechowaniem",
      "Weryfikuj plomby przy każdym użyciu po nieobecności",
      "Dla dysków: użyj VeraCrypt z hidden volume jako dodatkowe zabezpieczenie",
    ],
    requirements: ["Naklejki holograficzne lub lakier do paznokci", "Aparat fotograficzny do dokumentacji", "BIOS z chassis intrusion detection", "Procedura weryfikacji"],
    warnings: ["Plomby można sfałszować — używaj unikalnych wzorów", "Dokumentuj stan urządzeń fotograficznie", "Nie polegaj wyłącznie na plombach — łącz z innymi metodami"],
    checklist: ["Plomby fizyczne założone", "Zdjęcia dokumentacyjne wykonane", "Chassis intrusion w BIOS włączony", "Procedura weryfikacji wdrożona"],
  },
  {
    id: "acoustic_attack",
    name: "Ochrona przed Atakami Akustycznymi",
    icon: Mic,
    color: "text-teal-400",
    bg: "bg-teal-400/10",
    borderColor: "border-teal-400/30",
    category: "TEMPEST",
    riskLevel: "ŚREDNIE",
    difficulty: "ZAAWANSOWANY",
    priority: 9,
    description: "Ochrona przed akustyczną kryptoanalizą — ataki wykorzystujące dźwięki emitowane przez CPU, zasilacz i klawiaturę do odtworzenia kluczy kryptograficznych.",
    howItWorks: "Procesory, zasilacze i klawiatury emitują dźwięki podczas pracy. Badania (Genkin et al., 2014) wykazały możliwość odtworzenia kluczy RSA-4096 z odległości 4m przez analizę dźwięku CPU. Ataki akustyczne na klawiatury pozwalają rozróżnić naciśnięcia klawiszy z dokładnością >90%.",
    implementation: [
      "Generuj szum biały/różowy w pomieszczeniu (głośnik + generator szumu)",
      "Używaj klawiatur membranowych zamiast mechanicznych (mniejsze różnice akustyczne)",
      "Izoluj akustycznie pomieszczenie (panele dźwiękochłonne)",
      "Wyłącz wentylatory lub użyj pasywnego chłodzenia dla krytycznych operacji",
      "Dla kluczowych operacji kryptograficznych: użyj headless server (bez monitora/klawiatury)",
      "Rozważ akustyczną izolację obudowy komputera (guma, pianka)",
      "Monitoruj środowisko akustyczne (wykryj nieznane mikrofony)",
    ],
    requirements: ["Generator szumu białego/różowego", "Izolacja akustyczna pomieszczenia", "Klawiatury membranowe", "Opcjonalnie: detektor mikrofonu RF"],
    warnings: ["Ataki akustyczne wymagają bliskiej odległości lub mikrofonu w pomieszczeniu", "Szum biały nie chroni w 100% — zmniejsza skuteczność ataku", "Ataki przez sieć (mikrofon w laptopie) są trudniejsze do obrony"],
    checklist: ["Generator szumu zainstalowany", "Izolacja akustyczna pomieszczenia", "Klawiatury membranowe używane", "Detektor mikrofonu RF dostępny"],
  },
];

const difficultyOrder: Record<string, number> = { PODSTAWOWY: 1, ZAAWANSOWANY: 2, EKSPERT: 3 };
const riskOrder: Record<string, number> = { KRYTYCZNY: 4, WYSOKIE: 3, ŚREDNIE: 2, NISKIE: 1 };

function SystemCard({ system }: { system: typeof physicalSystems[0] }) {
  const [expanded, setExpanded] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const Icon = system.icon;

  const toggleCheck = (idx: number) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const completionPct = system.checklist.length > 0
    ? Math.round((checkedItems.size / system.checklist.length) * 100)
    : 0;

  const copyImplementation = () => {
    const text = system.implementation.map((s, i) => `${i + 1}. ${s}`).join("\n");
    navigator.clipboard.writeText(`# ${system.name}\n\n${text}`);
    toast.success("Instrukcja skopiowana");
  };

  return (
    <div className={`bg-card border rounded-xl overflow-hidden transition-all ${expanded ? system.borderColor : "border-border hover:border-primary/30"}`}>
      <div className="p-5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg ${system.bg} shrink-0`}>
              <Icon className={`w-5 h-5 ${system.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-foreground font-mono text-sm">{system.name}</h3>
                <span className="text-xs font-mono text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">{system.category}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs font-mono ${riskOrder[system.riskLevel] >= 3 ? "text-red-400" : riskOrder[system.riskLevel] === 2 ? "text-yellow-400" : "text-green-400"}`}>
                  Ryzyko: {system.riskLevel}
                </span>
                <span className="text-muted-foreground text-xs">·</span>
                <span className="text-xs text-muted-foreground">{system.difficulty}</span>
                {checkedItems.size > 0 && (
                  <>
                    <span className="text-muted-foreground text-xs">·</span>
                    <span className={`text-xs font-mono ${completionPct === 100 ? "text-green-400" : "text-yellow-400"}`}>
                      {completionPct === 100 ? "✓ WDROŻONE" : `${completionPct}% wdrożone`}
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2">{system.description}</p>
            </div>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-3 p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Progress bar */}
        {checkedItems.size > 0 && (
          <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${completionPct === 100 ? "bg-green-400" : "bg-yellow-400"}`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
        )}
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
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-mono text-muted-foreground tracking-wider">IMPLEMENTACJA KROK PO KROKU</p>
              <button onClick={(e) => { e.stopPropagation(); copyImplementation(); }}
                className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
                Kopiuj
              </button>
            </div>
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
            <p className="text-xs font-mono text-muted-foreground tracking-wider mb-2">WYMAGANIA SPRZĘTOWE</p>
            <div className="flex flex-wrap gap-2">
              {system.requirements.map((req, i) => (
                <span key={i} className="text-xs font-mono px-2 py-1 rounded bg-muted/40 text-muted-foreground border border-border/50">
                  {req}
                </span>
              ))}
            </div>
          </div>

          {/* Interactive Checklist */}
          <div>
            <p className="text-xs font-mono text-muted-foreground tracking-wider mb-2">
              CHECKLIST WDROŻENIA ({checkedItems.size}/{system.checklist.length})
            </p>
            <div className="space-y-2">
              {system.checklist.map((item, i) => (
                <label key={i} className="flex items-center gap-2 cursor-pointer group" onClick={e => e.stopPropagation()}>
                  <div
                    onClick={() => toggleCheck(i)}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${checkedItems.has(i) ? `${system.bg} ${system.borderColor.replace("border-", "border-")}` : "border-border"}`}
                  >
                    {checkedItems.has(i) && <CheckCircle className={`w-3 h-3 ${system.color}`} />}
                  </div>
                  <span className={`text-xs font-mono transition-colors ${checkedItems.has(i) ? "text-muted-foreground line-through" : "text-foreground group-hover:text-foreground"}`}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Warnings */}
          <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
              <p className="text-xs font-mono text-yellow-400">OSTRZEŻENIA I OGRANICZENIA</p>
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
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [sortBy, setSortBy] = useState<"priority" | "risk" | "difficulty">("priority");

  const categories = useMemo(() => {
    const cats = new Set(physicalSystems.map(s => s.category));
    return Array.from(cats);
  }, []);

  const filtered = useMemo(() => {
    let list = physicalSystems.filter(s => {
      if (filterCategory !== "all" && s.category !== filterCategory) return false;
      if (filterDifficulty !== "all" && s.difficulty !== filterDifficulty) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()) &&
        !s.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "priority") return a.priority - b.priority;
      if (sortBy === "risk") return (riskOrder[b.riskLevel] || 0) - (riskOrder[a.riskLevel] || 0);
      return (difficultyOrder[a.difficulty] || 0) - (difficultyOrder[b.difficulty] || 0);
    });
    return list;
  }, [search, filterCategory, filterDifficulty, sortBy]);

  const exportDocs = () => {
    const lines = ["# DOKUMENTACJA ZABEZPIECZEŃ FIZYCZNYCH", `# Data: ${new Date().toLocaleDateString("pl-PL")}`, ""];
    physicalSystems.forEach(s => {
      lines.push(`## ${s.name}`);
      lines.push(`- Kategoria: ${s.category}`);
      lines.push(`- Ryzyko: ${s.riskLevel}`);
      lines.push(`- Trudność: ${s.difficulty}`);
      lines.push(`\n### Opis\n${s.description}`);
      lines.push(`\n### Jak działa\n${s.howItWorks}`);
      lines.push("\n### Implementacja");
      s.implementation.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
      lines.push("\n### Wymagania");
      s.requirements.forEach(r => lines.push(`- ${r}`));
      lines.push("\n### Ostrzeżenia");
      s.warnings.forEach(w => lines.push(`- ${w}`));
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `physical-security-${new Date().toISOString().slice(0, 10)}.md`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Dokumentacja wyeksportowana");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground tracking-wide">ZABEZPIECZENIA FIZYCZNE</h1>
          <p className="text-sm text-muted-foreground mt-1">Dokumentacja systemów ochrony fizycznej i hardware security</p>
        </div>
        <Button size="sm" variant="outline" className="gap-2 font-mono text-xs" onClick={exportDocs}>
          <Download className="w-3.5 h-3.5" />Eksportuj Dokumentację
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold font-mono text-foreground">{physicalSystems.length}</p>
          <p className="text-xs text-muted-foreground font-mono">Systemów</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold font-mono text-red-400">{physicalSystems.filter(s => riskOrder[s.riskLevel] >= 3).length}</p>
          <p className="text-xs text-muted-foreground font-mono">Wysokie ryzyko</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold font-mono text-green-400">{physicalSystems.filter(s => s.difficulty === "PODSTAWOWY").length}</p>
          <p className="text-xs text-muted-foreground font-mono">Łatwe do wdrożenia</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold font-mono text-blue-400">{categories.length}</p>
          <p className="text-xs text-muted-foreground font-mono">Kategorii</p>
        </div>
      </div>

      {/* Principle */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <p className="text-xs font-mono text-primary mb-2 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />ZASADA WARSTWOWA (DEFENSE IN DEPTH)
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Bezpieczeństwo fizyczne jest fundamentem każdego systemu OPSEC. Nawet najlepsze szyfrowanie jest bezużyteczne,
          jeśli atakujący ma fizyczny dostęp do urządzenia. Implementuj zabezpieczenia warstwowo — każda warstwa
          utrudnia atak i daje czas na reakcję. Priorytetyzuj: <span className="text-red-400">KRYTYCZNE</span> → <span className="text-orange-400">WYSOKIE</span> → <span className="text-yellow-400">ŚREDNIE</span> → <span className="text-green-400">NISKIE</span>.
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj systemu..." className="pl-9 bg-input font-mono text-xs h-9" />
        </div>
        <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
          <Filter className="w-3.5 h-3.5" />
          <span>Kategoria:</span>
          {["all", ...categories].map(c => (
            <button key={c} onClick={() => setFilterCategory(c)}
              className={`px-2 py-1 rounded transition-colors ${filterCategory === c ? "bg-primary/20 text-primary" : "hover:text-foreground"}`}>
              {c === "all" ? "Wszystkie" : c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
          <span>Sortuj:</span>
          {[
            { key: "priority", label: "Priorytet" },
            { key: "risk", label: "Ryzyko" },
            { key: "difficulty", label: "Trudność" },
          ].map(s => (
            <button key={s.key} onClick={() => setSortBy(s.key as any)}
              className={`px-2 py-1 rounded transition-colors ${sortBy === s.key ? "bg-primary/20 text-primary" : "hover:text-foreground"}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Systems */}
      <div className="space-y-3">
        {filtered.map(system => (
          <SystemCard key={system.id} system={system} />
        ))}
        {filtered.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">Brak wyników dla szukanej frazy</p>
          </div>
        )}
      </div>
    </div>
  );
}
