import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * Requires a signed-in user to access marketplace routes.
 * - Unauthenticated → phone login
 * - Vendors (and not admin/cs/customer) → their own dashboard, they must not
 *   browse or buy from the customer marketplace UI.
 */
export default function MarketplaceAuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, rolesLoaded, isVendor, isAdmin, isCS, isCustomer, isProvider } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/marketplace/login?redirect=${redirect}`} replace />;
  }

  // Route non-customer accounts to their own dashboards so vendors don't see
  // (or buy from) the customer-facing marketplace UI.
  if (rolesLoaded && !isAdmin && !isCS && !isCustomer) {
    if (isVendor) return <Navigate to="/vendor" replace />;
    if (isProvider) return <Navigate to="/provider" replace />;
  }

  return <>{children}</>;
}
