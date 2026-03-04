import * as db from "./db";

export async function seedDefaultData(userId: number) {
  const existing = await db.getOpsecItems(userId);
  if (existing.length > 0) return { seeded: false, message: "Data already exists" };

  const items = [
    // Physical
    { category: "physical" as const, title: "Klatka Faradaya dla urządzeń offline", description: "Przechowuj urządzenia air-gap w klatce Faradaya gdy nieużywane. Blokuje sygnały RF i TEMPEST.", priority: "critical" as const },
    { category: "physical" as const, title: "Kill Switch USB skonfigurowany", description: "Fizyczny klucz USB inicjujący natychmiastowe szyfrowanie/wyłączenie systemu przy odłączeniu.", priority: "high" as const },
    { category: "physical" as const, title: "Kamera zasłonięta (fizycznie)", description: "Zakryj kamerę fizyczną zasłoną - nie tylko softwarowo. Dotyczy laptopów i tabletów.", priority: "high" as const },
    { category: "physical" as const, title: "Mikrofon wyłączony/usunięty", description: "Fizyczne odłączenie mikrofonu w urządzeniach offline. Softwarowe wyłączenie jest niewystarczające.", priority: "high" as const },
    { category: "physical" as const, title: "Dysk zaszyfrowany (LUKS/BitLocker/VeraCrypt)", description: "Pełne szyfrowanie dysku z silnym hasłem. Bez szyfrowania fizyczny dostęp = pełny dostęp do danych.", priority: "critical" as const },
    { category: "physical" as const, title: "Bezpieczne niszczenie nośników", description: "Używaj niszczarki do nośników lub degaussera. Zwykłe usunięcie plików nie niszczy danych.", priority: "medium" as const },
    { category: "physical" as const, title: "Kontrola dostępu fizycznego", description: "Zamknięte pomieszczenie, alarm, kamera (offline). Dokumentuj każdy dostęp do sprzętu.", priority: "high" as const },

    // Network
    { category: "network" as const, title: "VPN na wszystkich urządzeniach online", description: "Używaj zaufanego VPN (WireGuard/OpenVPN). Unikaj darmowych VPN - są produktem.", priority: "critical" as const },
    { category: "network" as const, title: "DNS-over-HTTPS lub DNS-over-TLS", description: "Szyfruj zapytania DNS. Niezaszyfrowane DNS ujawniają odwiedzane strony.", priority: "high" as const },
    { category: "network" as const, title: "Firewall z domyślnym deny", description: "Reguły firewall: domyślnie blokuj wszystko, zezwalaj tylko na niezbędne połączenia.", priority: "critical" as const },
    { category: "network" as const, title: "Segmentacja sieci (VLAN)", description: "Oddziel sieć IoT/Smart Home od sieci operacyjnej. Kompromitacja jednej nie zagraża drugiej.", priority: "high" as const },
    { category: "network" as const, title: "Monitoring ruchu sieciowego (IDS)", description: "Snort/Suricata lub podobne do wykrywania anomalii. Loguj wszystkie połączenia wychodzące.", priority: "medium" as const },
    { category: "network" as const, title: "Wyłączone UPnP na routerze", description: "UPnP automatycznie otwiera porty - poważne zagrożenie bezpieczeństwa.", priority: "high" as const },

    // Cryptographic
    { category: "cryptographic" as const, title: "Klucze GPG/PGP wygenerowane i zabezpieczone", description: "Generuj klucze na urządzeniu offline. Klucz prywatny nigdy nie opuszcza bezpiecznego środowiska.", priority: "critical" as const },
    { category: "cryptographic" as const, title: "Hardware Security Key (YubiKey/FIDO2)", description: "Używaj fizycznego klucza bezpieczeństwa dla krytycznych kont. Odporne na phishing.", priority: "high" as const },
    { category: "cryptographic" as const, title: "Menedżer haseł (offline lub E2E)", description: "KeePassXC (offline) lub Bitwarden (E2E). Unikalne, silne hasła dla każdego serwisu.", priority: "critical" as const },
    { category: "cryptographic" as const, title: "2FA na wszystkich krytycznych kontach", description: "TOTP (Authy/Google Auth) lub hardware key. SMS 2FA jest podatne na SIM swapping.", priority: "critical" as const },
    { category: "cryptographic" as const, title: "Szyfrowanie komunikacji (Signal/Matrix)", description: "End-to-end szyfrowanie dla wszystkich wrażliwych komunikatów. Unikaj SMS i zwykłego email.", priority: "high" as const },
    { category: "cryptographic" as const, title: "Regularna rotacja kluczy i haseł", description: "Harmonogram rotacji: hasła co 90 dni, klucze SSH co 6 miesięcy, certyfikaty przed wygaśnięciem.", priority: "medium" as const },

    // OPSEC
    { category: "opsec" as const, title: "Separacja urządzeń (offline/online)", description: "Dedykowane urządzenie do operacji offline. Nigdy nie łącz urządzenia offline z internetem.", priority: "critical" as const },
    { category: "opsec" as const, title: "Minimalizacja śladu cyfrowego", description: "Używaj Tor Browser, pseudonimów, jednorazowych adresów email dla wrażliwych operacji.", priority: "high" as const },
    { category: "opsec" as const, title: "Bezpieczne usuwanie metadanych", description: "MAT2/ExifTool przed udostępnieniem plików. Metadane mogą ujawnić lokalizację, urządzenie, tożsamość.", priority: "high" as const },
    { category: "opsec" as const, title: "Regularne audyty bezpieczeństwa", description: "Miesięczny przegląd: konta, uprawnienia, aktywne sesje, zainstalowane aplikacje.", priority: "medium" as const },
    { category: "opsec" as const, title: "Plan reagowania na incydenty", description: "Udokumentowany plan działania w przypadku kompromitacji. Kto powiadomić, co wyłączyć, jak odtworzyć.", priority: "high" as const },
    { category: "opsec" as const, title: "Bezpieczne kopie zapasowe (3-2-1)", description: "3 kopie, 2 różne nośniki, 1 off-site. Kopie zaszyfrowane. Regularne testy przywracania.", priority: "critical" as const },

    // Smart Home
    { category: "smart_home" as const, title: "Lokalny hub Smart Home (bez chmury)", description: "Home Assistant lub openHAB lokalnie. Dane Smart Home nie opuszczają sieci domowej.", priority: "high" as const },
    { category: "smart_home" as const, title: "Oddzielna sieć dla urządzeń IoT", description: "VLAN lub osobna sieć WiFi dla urządzeń Smart Home. Izolacja od komputerów i telefonów.", priority: "critical" as const },
    { category: "smart_home" as const, title: "Automatyczne wyłączanie zasilania AI/serwerów", description: "Przekaźnik/gniazdko Smart wyłączające serwery AI gdy nieużywane. Fizyczna kontrola zasilania.", priority: "medium" as const },
    { category: "smart_home" as const, title: "Monitoring anomalii Smart Home", description: "Alerty przy nieoczekiwanej aktywności urządzeń (np. projektor włączony o 3:00).", priority: "medium" as const },
  ];

  for (const item of items) {
    await db.createOpsecItem({ ...item, userId });
  }

  return { seeded: true, message: `Seeded ${items.length} OPSEC items` };
}
