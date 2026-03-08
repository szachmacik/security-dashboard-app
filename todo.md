# Security Dashboard - TODO

## Database & Backend
- [x] Schema: devices table (offline devices registry)
- [x] Schema: opsec_items table (checklist items)
- [x] Schema: audit_logs table (security audit history)
- [x] Schema: security_protocols table (protocol library)
- [x] Schema: smart_home_devices table (Zigbee/Z-Wave devices)
- [x] Schema: transfer_sessions table (QR transfer sessions)
- [x] Schema: secure_notes table (encrypted notes)
- [x] tRPC: devices router (CRUD)
- [x] tRPC: opsec router (checklist management)
- [x] tRPC: audit router (schedule & history)
- [x] tRPC: protocols router (library)
- [x] tRPC: smart_home router
- [x] tRPC: transfer router (QR sessions)
- [x] tRPC: config export/import router
- [x] tRPC: notes router (secure notes)
- [x] Seed data for default OPSEC checklist items
- [x] Vitest tests - 14 tests passing

## Frontend - Layout & Navigation
- [x] SecurityLayout with sidebar (10 modules)
- [x] Dark theme (security-focused, OKLCH colors)
- [x] Global CSS variables and JetBrains Mono typography
- [x] Auth guard (login screen for unauthenticated users)

## Module 1: Dashboard (Overview)
- [x] Security Score circular indicator
- [x] Device status summary cards (Air-Gap, Faraday, Offline, Online)
- [x] OPSEC completion stats
- [x] Pending/overdue audits counter
- [x] Smart Home device count
- [x] Protocol library count
- [x] Recent devices list
- [x] OPSEC checklist preview

## Module 2: QR Transfer
- [x] QR code generator from text/data input
- [x] Dynamic QR rendering with qrcode library
- [x] Transfer session management (create, list)
- [x] Session status tracking (pending/active/completed/failed)
- [x] Transfer history log
- [x] Copy to clipboard functionality
- [x] Download QR as PNG

## Module 3: Device Registry
- [x] Device list with status badges
- [x] Add device form (name, type, location, isolation status, notes)
- [x] Edit/delete device
- [x] Last sync timestamp tracking
- [x] Isolation status display (Air-Gap, Faraday, Offline, Online)
- [x] Device type icons

## Module 4: OPSEC Checklist
- [x] Category tabs (Physical, Network, Cryptographic, OPSEC, Smart Home)
- [x] Interactive checkbox items with descriptions
- [x] Progress tracking per category
- [x] Priority badges (Critical, High, Medium, Low)
- [x] Mark items complete/incomplete
- [x] Load default items button
- [x] Add custom items

## Module 5: Smart Home Integration
- [x] Device list (Zigbee/Z-Wave/WiFi/Bluetooth)
- [x] Power socket control toggle (on/off)
- [x] Device status monitoring
- [x] Add/edit/delete smart home devices
- [x] Protocol type display

## Module 6: Security Protocols Library
- [x] Protocol cards (Air-Gap, Optical Bridge, Faraday Box, Dead Drop + 2 more)
- [x] Implementation instructions per protocol
- [x] Difficulty/risk/effectiveness ratings
- [x] Search/filter protocols
- [x] Custom protocol creation
- [x] Built-in protocols (6 pre-loaded)

## Module 7: Audit Schedule
- [x] Create/edit audit reminders
- [x] Recurrence settings (once/daily/weekly/monthly)
- [x] Audit history log
- [x] Status tracking (pending/completed/overdue/cancelled)
- [x] Severity levels
- [x] Findings documentation

## Module 8: Transfer Calculator
- [x] QR code throughput calculator
- [x] Video steganography bandwidth estimator
- [x] Acoustic bridge speed calculator
- [x] Optical LED bridge calculator
- [x] Comparison table with all methods
- [x] Custom parameter inputs

## Module 9: Physical Security Documentation
- [x] Kill-Switch USB documentation
- [x] Laser Tripwire setup guide
- [x] Magnetic Air-Gap documentation
- [x] Faraday cage instructions
- [x] Hardware Security Module guide
- [x] Tamper-evident seals guide
- [x] Difficulty/cost ratings per solution

## Module 10: Config Export/Import
- [x] Export configuration as JSON package
- [x] Import configuration from JSON
- [x] AES-256 encryption simulation
- [x] Export history
- [x] Integrity verification (SHA-256 hash)
- [x] Selective export (choose modules)

## Extra Security Features (proactive additions)
- [x] Threat level indicator (global security score 0-100)
- [x] Secure notes module (encrypted notes storage)
- [x] Protocol effectiveness ratings
- [x] Incident response documentation in protocols
- [x] Password/key strength evaluator (PasswordEvaluator page - lokalnie, bez API)
- [x] Network exposure analyzer (NetworkExposure page)
- [ ] Real-time threat feed integration (future enhancement)
- [ ] Two-factor authentication for sensitive operations (future enhancement)

## Fixes & Improvements (v2)
- [x] Fix .dark CSS override (sync with :root security theme)
- [x] Fix seed import (removed .ts extension)
- [x] Add idempotent seed check for protocols
- [x] Add auto-seed on first login (Dashboard useEffect)
- [x] Add SecureNotes page with full CRUD, tags, copy, show/hide
- [x] Add SecureNotes to navigation (FileText icon)
- [x] Add SecureNotes route to App.tsx

## Nowe moduły (v3)
- [x] DB: incidents, activity_log, threat_indicators tables (SQL migration)
- [x] DB: brakujące kolumny w devices (os, purpose, notes, riskLevel, isVerified)
- [x] DB: brakujące kolumny w opsec_items (isDefault, notes, dueDate)
- [x] tRPC: incidents, threats, activityLog, stats routery
- [x] IncidentResponse - zarządzanie incydentami bezpieczeństwa
- [x] ThreatIndicators - IOC, TTP, podatności, anomalie
- [x] Rozbudowa Dashboard - Activity Log, incident stats, quick actions
- [x] Rozbudowa OpsecChecklist - bulk actions, eksport CSV, statystyki
- [x] Rozbudowa QRTransfer - SHA-256 hash, timer, chunked QR
- [x] Rozbudowa DeviceRegistry - risk score, search, eksport, weryfikacja
- [x] Rozbudowa ProtocolLibrary - search, eksport, porównanie
- [x] Rozbudowa AuditSchedule - completion dialog, timeline, eksport
- [x] Rozbudowa SmartHome - grupy, scenariusze, kill-switch, energy
- [x] Rozbudowa PhysicalSecurity - checklist, BIOS lock, Tamper detection
- [x] Rozbudowa TransferCalculator - 7 metod, wykres Recharts
- [x] Rozbudowa ConfigExport - AES-256-GCM Web Crypto API, SHA-256
- [x] SecurityLayout - mobilne menu, grupowanie nawigacji, badge incydentów
- [x] SecuritySkeleton - komponent skeleton loading
- [x] 14/14 testów przechodzi

## GitHub
- [x] Repository: szachmacik/cyber-bunker-security (private)
- [x] README.md with full documentation
- [x] docs/OPSEC_CHECKLIST.md
- [x] docs/PROTOCOLS.md
- [x] docs/PHYSICAL_SECURITY.md
- [x] docs/THREAT_MODEL.md
- [x] docs/DEPLOYMENT_TRACKING.md
- [x] code-patterns/security-score.ts
- [x] code-patterns/qr-transfer.ts
- [x] code-patterns/audit-logger.ts
- [x] Push v2 improvements to GitHub
- [ ] Push v3 improvements to GitHub

## Google Drive Tracking
- [x] Create tracking file on Google Drive
- [ ] Update with GitHub link and test results
- [x] Set up periodic verification schedule (weekly Monday 9:00 - ACTIVE)

## Rozbudowa v4 (autonomiczna)
### Backend
- [x] Router: securityScore - historia score (trend 14 dni)
- [x] Router: reports - generowanie raportów bezpieczeństwa jako Markdown
- [x] DB: tabela security_score_history
- [x] DB: tabela security_reports
- [x] Powiadomienia właściciela (notifyOwner) dla krytycznych incydentów

### Dashboard v4
- [x] Wykres Recharts AreaChart - Security Score trend (14 dni)
- [x] Powiadomienia właściciela dla krytycznych incydentów (useEffect + notifyOwner)
- [x] Szybkie akcje do nowych modułów (Entropia, OSINT, Raporty)

### Nowe moduły
- [x] SecurityReports - generowanie raportów Markdown, historia, wykresy
- [x] EntropyAnalyzer - Shannon entropy, analiza tekstu/hex/base64/binary
- [x] OsintDefense - footprint reduction, scoring OSINT, rekomendacje

### Nawigacja
- [x] EntropyAnalyzer i OsintDefense w sekcji WIEDZA
- [x] SecurityReports w sekcji DANE
- [x] 18 modułów w 6 sekcjach nawigacji

### Testy
- [x] 14/14 testów przechodzi (vitest)
- [x] TypeScript: 0 błędów

## GitHub
- [x] Push v3 improvements to GitHub
- [ ] Push v4 improvements to GitHub

## Google Drive Tracking
- [ ] Update z v4 zmianami i linkiem do GitHub

## Rozbudowa v5 (autonomiczna)
### Command Palette (Cmd+K)
- [x] Komponent CommandPalette z cmdk
- [x] Globalne wyszukiwanie po urządzeniach, protokołach, notatkach, incydentach
- [x] Skróty klawiszowe do nawigacji między modułami
- [x] Integracja z SecurityLayout (Cmd+K trigger)

### Eksport PDF
- [x] Print CSS (@media print) dla SecurityReports
- [x] Przycisk "Drukuj/Eksportuj PDF" w module SecurityReports
- [x] Stylowanie dla druku (czarno-białe, bez nawigacji)

### Steganography Guide
- [x] Nowa strona SteganographyGuide.tsx
- [x] Kalkulator pojemności nośnika (LSB audio/image/video)
- [x] Interaktywny przewodnik po 7 metodach steganografii
- [x] Zakładki: Metody, Kalkulator LSB, Wykrywanie, OPSEC
- [x] Dodanie do nawigacji (sekcja WIEDZA)

### Ulepszenia UX
- [x] Dark/Light theme toggle w sidebar (Sun/Moon icon)
- [x] Theme switchable=true w App.tsx

### Nowe testy
- [x] 27 nowych testów v5 (server/v5.test.ts)
- [x] Testy kalkulatora LSB (image/audio/video)
- [x] Testy Shannon entropy
- [x] Testy incidents, threats, scoreHistory, reports, notes
- [x] 41/41 testów przechodzi

## Rozbudowa v6 (autonomiczna)
### Cipher Tools
- [x] Strona CipherTools.tsx z zakładkami AES/RSA
- [x] AES-256-GCM szyfrowanie/deszyfrowanie (Web Crypto API, client-side)
- [x] RSA-OAEP generowanie par kluczy (2048/4096 bit), szyfrowanie/deszyfrowanie
- [x] Kalkulator siły klucza i porównanie algorytmów
- [x] Dodanie do nawigacji (sekcja NARZĘDZIA)

### Network Scanner (pasywny)
- [x] Strona NetworkScanner.tsx
- [x] Wklejanie/upload logów sieciowych (Nginx, Apache, syslog, iptables)
- [x] Parser logów - ekstrakcja IP, portów, metod, statusów
- [x] Wizualizacja połączeń (tabela + Recharts BarChart/PieChart)
- [x] Wykrywanie anomalii (brute-force, port scan, suspicious paths, unusual hours)
- [x] Eksport raportu JSON
- [x] Dodanie do nawigacji (sekcja NARZĘDZIA)

### Secure Vault
- [x] Strona SecureVault.tsx
- [x] AES-256-GCM szyfrowanie po stronie klienta (klucz z hasła PBKDF2 600k)
- [x] Vault items: hasła, klucze API, seed phrases, notatki, certyfikaty, klucze SSH
- [x] Unlock/lock vault z hasłem (klucz trzymany tylko w pamięci RAM)
- [x] Eksport zaszyfrowanego vault jako plik .vault
- [x] Import vault z pliku
- [x] Auto-clear schowka po 30 sekundach
- [x] Generator haseł (Web Crypto)
- [x] Dodanie do nawigacji (sekcja NARZĘDZIA)

### Testy v6
- [x] 23 nowych testów v6 (server/v6.test.ts)
- [x] Testy logiki kryptograficznej (AES, RSA, entropia)
- [x] Testy parsera logów sieciowych (Nginx, iptables, anomalie)
- [x] Testy Secure Vault (typy, walidacja, PBKDF2, AES-GCM)
- [x] 64/64 testów przechodzi
- [x] TypeScript: 0 błędów
