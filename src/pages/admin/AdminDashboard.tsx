import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Package, CalendarCheck, Users, Settings, LogOut, RefreshCw, ShieldAlert, Landmark, PlusCircle } from "lucide-react";
import mfnLogo from "@/assets/mfn-logo.png";
import NotificationBell from "@/components/admin/NotificationBell";
import ServicesTab from "@/components/admin/ServicesTab";
import BookingsTab from "@/components/admin/BookingsTab";
import ProvidersTab from "@/components/admin/ProvidersTab";
import SettingsTab from "@/components/admin/SettingsTab";
import SyncMonitorTab from "@/components/admin/SyncMonitorTab";
import SuspensionRequestsTab from "@/components/admin/SuspensionRequestsTab";
import FinanceTab from "@/components/admin/FinanceTab";

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={mfnLogo} alt="MFN" className="h-8" />
            <div>
              <h1 className="text-sm font-bold text-foreground">{t("admin.title")}</h1>
              <p className="text-[10px] text-muted-foreground">{user?.email}</p>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/booking")}>
              <PlusCircle className="h-4 w-4" />
              {t("admin.new_booking")}
            </Button>
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5">
              <LogOut className="h-4 w-4" />
              {t("action.logout")}
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 px-4">
        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 h-auto">
            <TabsTrigger value="services" className="flex flex-col gap-1 py-2 text-xs">
              <Package className="h-4 w-4" />
              {t("admin.tab.services")}
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex flex-col gap-1 py-2 text-xs">
              <CalendarCheck className="h-4 w-4" />
              {t("admin.tab.bookings")}
            </TabsTrigger>
            <TabsTrigger value="providers" className="flex flex-col gap-1 py-2 text-xs">
              <Users className="h-4 w-4" />
              {t("admin.tab.providers")}
            </TabsTrigger>
            <TabsTrigger value="finance" className="flex flex-col gap-1 py-2 text-xs">
              <Landmark className="h-4 w-4" />
              {t("admin.tab.finance")}
            </TabsTrigger>
            <TabsTrigger value="suspensions" className="flex flex-col gap-1 py-2 text-xs">
              <ShieldAlert className="h-4 w-4" />
              {t("admin.tab.suspensions")}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex flex-col gap-1 py-2 text-xs">
              <Settings className="h-4 w-4" />
              {t("admin.tab.settings")}
            </TabsTrigger>
            <TabsTrigger value="sync" className="flex flex-col gap-1 py-2 text-xs">
              <RefreshCw className="h-4 w-4" />
              {t("admin.tab.sync")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services"><ServicesTab /></TabsContent>
          <TabsContent value="bookings"><BookingsTab /></TabsContent>
          <TabsContent value="providers"><ProvidersTab /></TabsContent>
          <TabsContent value="finance"><FinanceTab /></TabsContent>
          <TabsContent value="suspensions"><SuspensionRequestsTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
          <TabsContent value="sync"><SyncMonitorTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
