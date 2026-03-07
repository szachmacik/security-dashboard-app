import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Activity,
  AlertTriangle,
  Binary,
  BookOpen,
  Calculator,
  CheckSquare,
  Download,
  EyeOff,
  FileText,
  BarChart2,
  Home,
  Key,
  Lock,
  Monitor,
  Network,
  QrCode,
  Radar,
  Shield,
  Zap,
  Layers,
} from "lucide-react";

interface NavItem {
  path: string;
  label: string;
  description: string;
  icon: React.ElementType;
  group: string;
  keywords?: string[];
}

const ALL_PAGES: NavItem[] = [
  { path: "/", label: "Dashboard", description: "Status bezpieczeństwa i score", icon: Home, group: "Przegląd", keywords: ["score", "overview", "status", "główna"] },
  { path: "/devices", label: "Urządzenia", description: "Rejestr urządzeń offline i air-gap", icon: Monitor, group: "Urządzenia", keywords: ["device", "air-gap", "faraday", "offline", "sprzęt"] },
  { path: "/smart-home", label: "Smart Home", description: "Zigbee/Z-Wave integracja", icon: Zap, group: "Urządzenia", keywords: ["zigbee", "zwave", "iot", "dom", "automatyka"] },
  { path: "/qr-transfer", label: "QR Transfer", description: "Optyczny most danych", icon: QrCode, group: "Transfer Danych", keywords: ["qr", "kod", "transfer", "optyczny", "most"] },
  { path: "/calculator", label: "Kalkulator Transferu", description: "Wydajność metod transferu", icon: Calculator, group: "Transfer Danych", keywords: ["kalkulator", "bandwidth", "przepustowość", "akustyczny", "led"] },
  { path: "/opsec", label: "OPSEC Checklist", description: "Lista kontrolna bezpieczeństwa", icon: CheckSquare, group: "Bezpieczeństwo", keywords: ["opsec", "checklist", "lista", "kontrolna", "fizyczne", "sieć"] },
  { path: "/incidents", label: "Incydenty", description: "Reagowanie na zagrożenia", icon: AlertTriangle, group: "Bezpieczeństwo", keywords: ["incident", "incydent", "zagrożenie", "alert", "reagowanie"] },
  { path: "/threats", label: "Wskaźniki Zagrożeń", description: "IOC, TTP, podatności", icon: Radar, group: "Bezpieczeństwo", keywords: ["ioc", "ttp", "threat", "zagrożenie", "podatność", "indicator"] },
  { path: "/passwords", label: "Hasła & Klucze", description: "Ocena siły i generator", icon: Key, group: "Bezpieczeństwo", keywords: ["hasło", "password", "klucz", "entropy", "generator", "siła"] },
  { path: "/network", label: "Ekspozycja Sieci", description: "Analiza sieci i portów", icon: Network, group: "Bezpieczeństwo", keywords: ["sieć", "network", "port", "ekspozycja", "analiza", "ip"] },
  { path: "/protocols", label: "Protokoły", description: "Biblioteka metod bezpieczeństwa", icon: BookOpen, group: "Wiedza", keywords: ["protokół", "protocol", "biblioteka", "metoda", "air-gap"] },
  { path: "/physical", label: "Bezpieczeństwo Fizyczne", description: "Zabezpieczenia sprzętowe", icon: Shield, group: "Wiedza", keywords: ["fizyczne", "physical", "hardware", "kill-switch", "faraday", "tamper"] },
  { path: "/audits", label: "Harmonogram Audytów", description: "Audyty i weryfikacje", icon: Activity, group: "Wiedza", keywords: ["audyt", "audit", "harmonogram", "schedule", "weryfikacja"] },
  { path: "/entropy", label: "Analiza Entropii", description: "Shannon entropy, analiza tekstu", icon: Binary, group: "Wiedza", keywords: ["entropia", "entropy", "shannon", "analiza", "losowość"] },
  { path: "/osint", label: "OSINT Defense", description: "Ochrona przed wywiadem", icon: EyeOff, group: "Wiedza", keywords: ["osint", "wywiad", "footprint", "prywatność", "anonimowość"] },
  { path: "/steganography", label: "Steganografia", description: "Ukrywanie danych w mediach", icon: Layers, group: "Wiedza", keywords: ["steganografia", "steganography", "ukryte", "lsb", "audio", "obraz"] },
  { path: "/notes", label: "Secure Notes", description: "Zaszyfrowane notatki", icon: FileText, group: "Dane", keywords: ["notatka", "note", "szyfrowane", "encrypted", "tajne"] },
  { path: "/reports", label: "Raporty & Trendy", description: "Historia i analizy bezpieczeństwa", icon: BarChart2, group: "Dane", keywords: ["raport", "report", "trend", "historia", "analiza"] },
  { path: "/config", label: "Eksport/Import Konfiguracji", description: "Backup i przywracanie", icon: Download, group: "Dane", keywords: ["eksport", "import", "config", "backup", "konfiguracja", "aes"] },
];

const QUICK_ACTIONS = [
  { label: "Nowy incydent", description: "Zgłoś incydent bezpieczeństwa", path: "/incidents", icon: AlertTriangle, shortcut: "I" },
  { label: "Nowe urządzenie", description: "Dodaj urządzenie do rejestru", path: "/devices", icon: Monitor, shortcut: "D" },
  { label: "Generuj QR", description: "Stwórz kod QR do transferu", path: "/qr-transfer", icon: QrCode, shortcut: "Q" },
  { label: "Nowa notatka", description: "Utwórz zaszyfrowaną notatkę", path: "/notes", icon: FileText, shortcut: "N" },
  { label: "Analiza entropii", description: "Sprawdź losowość danych", path: "/entropy", icon: Binary, shortcut: "E" },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, navigate] = useLocation();

  const handleSelect = useCallback((path: string) => {
    navigate(path);
    onOpenChange(false);
  }, [navigate, onOpenChange]);

  // Group pages by group
  const groups = ALL_PAGES.reduce<Record<string, NavItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Szukaj modułów, akcji, urządzeń..." className="font-mono text-sm" />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-6">
            <Lock className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground font-mono">Brak wyników — sprawdź pisownię</p>
          </div>
        </CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="SZYBKIE AKCJE">
          {QUICK_ACTIONS.map((action) => (
            <CommandItem
              key={action.label}
              value={action.label + " " + action.description}
              onSelect={() => handleSelect(action.path)}
              className="gap-3 cursor-pointer"
            >
              <action.icon className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium font-mono">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
              <CommandShortcut className="font-mono text-xs opacity-50">{action.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation groups */}
        {Object.entries(groups).map(([groupName, items]) => (
          <CommandGroup key={groupName} heading={groupName.toUpperCase()}>
            {items.map((item) => (
              <CommandItem
                key={item.path}
                value={[item.label, item.description, ...(item.keywords || [])].join(" ")}
                onSelect={() => handleSelect(item.path)}
                className="gap-3 cursor-pointer"
              >
                <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium font-mono">{item.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>

      {/* Footer hint */}
      <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground font-mono">
        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↑↓</kbd> nawigacja</span>
        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↵</kbd> wybierz</span>
        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd> zamknij</span>
        <span className="ml-auto opacity-50">CYBER BUNKER SEARCH</span>
      </div>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}
