import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type DashboardRole = "admin" | "cs" | "provider" | "vendor";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: DashboardRole;
}

const ROLE_DASHBOARDS: Record<string, string> = {
  admin: "/admin",
  cs: "/cs",
  provider: "/provider",
  vendor: "/vendor",
  customer: "/profile",
};

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading, rolesLoaded, isAdmin, isCS, isProvider, isVendor, profile } = useAuth();

  // Only block on initial session check (loading). Never block on roles – treat as customer if not loaded yet.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Determine effective (highest-priority) role — prevents role mixing
  const effectiveRole = isAdmin
    ? "admin"
    : isCS
    ? "cs"
    : isProvider
    ? "provider"
    : isVendor
    ? "vendor"
    : "customer";

  // Provider gatekeeper: if provider_status is not approved, redirect to review page
  if (effectiveRole === "provider" && profile) {
    const status = profile.provider_status;
    if (status !== "approved") {
      // Allow access to the review page itself
      if (requiredRole === "provider") {
        return <Navigate to="/account-review" replace />;
      }
    }
  }

  // If a specific role is required and user's effective role doesn't match, redirect
  if (requiredRole && requiredRole !== effectiveRole) {
    return <Navigate to={ROLE_DASHBOARDS[effectiveRole]} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
