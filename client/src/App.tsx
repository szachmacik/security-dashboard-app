import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import SecurityLayout from "./components/SecurityLayout";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import DeviceRegistry from "./pages/DeviceRegistry";
import QRTransfer from "./pages/QRTransfer";
import OpsecChecklist from "./pages/OpsecChecklist";
import SmartHome from "./pages/SmartHome";
import ProtocolLibrary from "./pages/ProtocolLibrary";
import AuditSchedule from "./pages/AuditSchedule";
import TransferCalculator from "./pages/TransferCalculator";
import PhysicalSecurity from "./pages/PhysicalSecurity";
import ConfigExport from "./pages/ConfigExport";
import SecureNotes from "./pages/SecureNotes";
import IncidentResponse from "./pages/IncidentResponse";
import ThreatIndicators from "./pages/ThreatIndicators";
import PasswordEvaluator from "./pages/PasswordEvaluator";
import NetworkExposure from "@/pages/NetworkExposure";
import SecurityReports from "@/pages/SecurityReports";
import EntropyAnalyzer from "@/pages/EntropyAnalyzer";
import OsintDefense from "@/pages/OsintDefense";
import SteganographyGuide from "@/pages/SteganographyGuide";
import CipherTools from "@/pages/CipherTools";
import NetworkScanner from "@/pages/NetworkScanner";
import SecureVault from "@/pages/SecureVault";

function Router() {
  return (
    <Switch>
      {/* Public auth routes — outside SecurityLayout */}
      <Route path="/login" component={Login} />
      <Route path="/auth/callback" component={AuthCallback} />

      {/* Protected routes — inside SecurityLayout */}
      <Route>
        <SecurityLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/devices" component={DeviceRegistry} />
            <Route path="/qr-transfer" component={QRTransfer} />
            <Route path="/opsec" component={OpsecChecklist} />
            <Route path="/smart-home" component={SmartHome} />
            <Route path="/protocols" component={ProtocolLibrary} />
            <Route path="/audits" component={AuditSchedule} />
            <Route path="/calculator" component={TransferCalculator} />
            <Route path="/physical" component={PhysicalSecurity} />
            <Route path="/config" component={ConfigExport} />
            <Route path="/notes" component={SecureNotes} />
            <Route path="/incidents" component={IncidentResponse} />
            <Route path="/threats" component={ThreatIndicators} />
            <Route path="/passwords" component={PasswordEvaluator} />
            <Route path="/network" component={NetworkExposure} />
            <Route path="/reports" component={SecurityReports} />
            <Route path="/entropy" component={EntropyAnalyzer} />
            <Route path="/osint" component={OsintDefense} />
            <Route path="/steganography" component={SteganographyGuide} />
            <Route path="/cipher" component={CipherTools} />
            <Route path="/network-scanner" component={NetworkScanner} />
            <Route path="/vault" component={SecureVault} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </SecurityLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
