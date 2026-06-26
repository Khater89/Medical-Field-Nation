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
import MarketplaceHome from "./pages/marketplace/MarketplaceHome";
import MarketplaceEnterPage from "./pages/marketplace/MarketplaceEnterPage";
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
import GuestMessagesPage from "./pages/marketplace/GuestMessagesPage";

import { MarketplaceCartProvider } from "./contexts/MarketplaceCartContext";
import NotFound from "./pages/NotFound";

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
              <Route path="/" element={<LandingPage />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/provider/register" element={<ProviderRegister />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/track" element={<TrackOrderPage />} />
              {/* Marketplace */}
              <Route path="/marketplace" element={<MarketplaceHome />} />
              <Route path="/marketplace/enter" element={<MarketplaceEnterPage />} />
              <Route path="/marketplace/category/:slug" element={<CategoryPage />} />
              <Route path="/marketplace/type/:type" element={<VendorTypePage />} />
              <Route path="/marketplace/product/:id" element={<ProductPage />} />
              <Route path="/marketplace/cart" element={<CartPage />} />
              <Route path="/marketplace/checkout" element={<CheckoutPage />} />
              <Route path="/marketplace/orders" element={<ProtectedRoute><MyOrdersPage /></ProtectedRoute>} />
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
              <Route path="/marketplace/vendor/:id" element={<VendorPage />} />
              <Route path="/marketplace/pharmacies" element={<VendorsListPage />} />
              <Route path="/marketplace/messages" element={<ProtectedRoute><MarketplaceMessagesPage /></ProtectedRoute>} />

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
