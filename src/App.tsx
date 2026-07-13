import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useSplashScreen } from "@/components/SplashScreen";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import HomeHub from "./pages/HomeHub";
import ServicesHome from "./pages/services/ServicesHome";
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
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TrackOrderPage from "./pages/TrackOrderPage";
import ConnectPage from "./pages/ConnectPage";
import MarketplaceHome from "./pages/marketplace/MarketplaceHome";
import CategoryPage from "./pages/marketplace/CategoryPage";
import VendorTypePage from "./pages/marketplace/VendorTypePage";
import ProductPage from "./pages/marketplace/ProductPage";
import CartPage from "./pages/marketplace/CartPage";
import CheckoutPage from "./pages/marketplace/CheckoutPage";
import MyOrdersPage from "./pages/marketplace/MyOrdersPage";
import VendorRegister from "./pages/vendor/VendorRegister";
import VendorDashboard from "./pages/vendor/VendorDashboard";
import VendorPage from "./pages/marketplace/VendorPage";
import VendorsListPage from "./pages/marketplace/VendorsListPage";
import MarketplaceMessagesPage from "./pages/marketplace/MarketplaceMessagesPage";

import { MarketplaceCartProvider } from "./contexts/MarketplaceCartContext";
import NotFound from "./pages/NotFound";
import MarketplacePhoneAuth from "./pages/marketplace/MarketplacePhoneAuth";
import MarketplaceAuthGate from "./components/marketplace/MarketplaceAuthGate";

const queryClient = new QueryClient();

const App = () => {
  const { SplashWrapper } = useSplashScreen();

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <AuthProvider>
          <SplashWrapper />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <MarketplaceCartProvider>
            <Routes>
              {/* Public */}
              <Route path="/" element={<HomeHub />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/services" element={<ServicesHome />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/provider/register" element={<ProviderRegister />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/track" element={<TrackOrderPage />} />
              {/* Marketplace — phone-only auth gate */}
              <Route path="/marketplace/login" element={<MarketplacePhoneAuth />} />
              <Route path="/marketplace/enter" element={<MarketplacePhoneAuth />} />
              <Route path="/marketplace" element={<MarketplaceAuthGate><MarketplaceHome /></MarketplaceAuthGate>} />
              <Route path="/marketplace/category/:slug" element={<MarketplaceAuthGate><CategoryPage /></MarketplaceAuthGate>} />
              <Route path="/marketplace/type/:type" element={<MarketplaceAuthGate><VendorTypePage /></MarketplaceAuthGate>} />
              <Route path="/marketplace/product/:id" element={<MarketplaceAuthGate><ProductPage /></MarketplaceAuthGate>} />
              <Route path="/marketplace/cart" element={<MarketplaceAuthGate><CartPage /></MarketplaceAuthGate>} />
              <Route path="/marketplace/checkout" element={<MarketplaceAuthGate><CheckoutPage /></MarketplaceAuthGate>} />
              <Route path="/marketplace/orders" element={<MarketplaceAuthGate><MyOrdersPage /></MarketplaceAuthGate>} />
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

              {/* Vendor (marketplace) */}
              <Route path="/vendor/register" element={<ProtectedRoute><VendorRegister /></ProtectedRoute>} />
              <Route
                path="/vendor"
                element={
                  <ProtectedRoute>
                    <VendorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/marketplace/vendor/:id" element={<MarketplaceAuthGate><VendorPage /></MarketplaceAuthGate>} />
              <Route path="/marketplace/pharmacies" element={<MarketplaceAuthGate><VendorsListPage /></MarketplaceAuthGate>} />
              <Route path="/marketplace/messages" element={<MarketplaceAuthGate><MarketplaceMessagesPage /></MarketplaceAuthGate>} />
              <Route path="/marketplace/my-messages" element={<MarketplaceAuthGate><MarketplaceMessagesPage /></MarketplaceAuthGate>} />


              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </MarketplaceCartProvider>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
