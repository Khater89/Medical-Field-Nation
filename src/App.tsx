import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import BookingPage from "./pages/BookingPage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import AdminSetup from "./pages/admin/AdminSetup";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ProviderRegister from "./pages/provider/ProviderRegister";
import ProviderDashboard from "./pages/provider/ProviderDashboard";
import ProviderOnboarding from "./pages/provider/ProviderOnboarding";
import CSDashboard from "./pages/cs/CSDashboard";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import AccountReviewPage from "./pages/AccountReviewPage";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/provider/register" element={<ProviderRegister />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route
                path="/account-review"
                element={
                  <ProtectedRoute>
                    <AccountReviewPage />
                  </ProtectedRoute>
                }
              />
              {/* Customer Profile (protected) */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Admin */}
              <Route path="/admin/setup" element={<AdminSetup />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Customer Service */}
              <Route
                path="/cs"
                element={
                  <ProtectedRoute requiredRole="cs">
                    <CSDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Provider */}
              <Route
                path="/provider/onboarding"
                element={
                  <ProtectedRoute requiredRole="provider">
                    <ProviderOnboarding />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/provider"
                element={
                  <ProtectedRoute requiredRole="provider">
                    <ProviderDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
