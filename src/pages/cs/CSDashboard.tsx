import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Users, PlusCircle, LogOut, RefreshCw } from "lucide-react";
import mfnLogo from "@/assets/mfn-logo.png";
import CSBookingsTab from "@/components/cs/CSBookingsTab";
import CSProviderDirectory from "@/components/cs/CSProviderDirectory";
import SyncMonitorTab from "@/components/admin/SyncMonitorTab";

const CSDashboard = () => {
  const { user, signOut } = useAuth();
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
              <h1 className="text-sm font-bold text-foreground">لوحة خدمة العملاء</h1>
              <p className="text-[10px] text-muted-foreground">{user?.email}</p>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/booking")}>
              <PlusCircle className="h-4 w-4" /> حجز جديد
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5">
              <LogOut className="h-4 w-4" /> خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 px-4">
        <Tabs defaultValue="bookings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bookings" className="gap-1.5 text-xs">
              <CalendarCheck className="h-4 w-4" /> الحجوزات
            </TabsTrigger>
            <TabsTrigger value="providers" className="gap-1.5 text-xs">
              <Users className="h-4 w-4" /> المزوّدون
            </TabsTrigger>
            <TabsTrigger value="sync" className="gap-1.5 text-xs">
              <RefreshCw className="h-4 w-4" /> المزامنة
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings"><CSBookingsTab /></TabsContent>
          <TabsContent value="providers"><CSProviderDirectory /></TabsContent>
          <TabsContent value="sync"><SyncMonitorTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CSDashboard;
