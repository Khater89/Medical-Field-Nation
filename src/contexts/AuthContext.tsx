import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

type AppRole = "admin" | "provider" | "customer" | "cs";

interface Profile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  provider_status: string;
  stripe_connect_account_id: string | null;
  stripe_connect_onboarding_status: string | null;
  created_at: string;
  date_of_birth: string | null;
  role_type: string | null;
  experience_years: number | null;
  tools: string[] | null;
  languages: string[] | null;
  specialties: string[] | null;
  last_active_at: string | null;
  available_now: boolean;
  schedule_json: any | null;
  radius_km: number | null;
  address_text: string | null;
  license_id: string | null;
  profile_completed: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  rolesLoaded: boolean;
  isAdmin: boolean;
  isCS: boolean;
  isProvider: boolean;
  isCustomer: boolean;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  // Non-blocking fetch – errors are swallowed, state is always updated
  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const [rolesResult, profileResult] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      ]);
      if (rolesResult.data) setRoles(rolesResult.data.map((r) => r.role as AppRole));
      if (profileResult.data) setProfile(profileResult.data as Profile);
    } catch (e) {
      console.error("fetchUserData error (non-fatal):", e);
    } finally {
      setRolesLoaded(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Fire-and-forget: fetch roles/profile in background, never blocks
          fetchUserData(newSession.user.id);
        } else {
          setRoles([]);
          setProfile(null);
          setRolesLoaded(true);
        }
      }
    );

    // Initial session check – NEVER blocks longer than 3s
    const init = async () => {
      const timeout = setTimeout(() => {
        if (mounted) {
          console.warn("Auth init timeout – rendering app anyway");
          setLoading(false);
          setRolesLoaded(true);
        }
      }, 3000);

      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await fetchUserData(s.user.id);
        } else {
          setRolesLoaded(true);
        }
      } catch (e) {
        console.error("Auth init error (non-fatal):", e);
        if (mounted) setRolesLoaded(true);
      } finally {
        clearTimeout(timeout);
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setProfile(null);
    setRolesLoaded(false);
  };

  const refreshUserData = async () => {
    if (user) await fetchUserData(user.id);
  };

  const isAdmin = roles.includes("admin");
  const isCS = roles.includes("cs");
  const isProvider = roles.includes("provider");
  const isCustomer = roles.includes("customer");

  return (
    <AuthContext.Provider
      value={{
        user, session, profile, roles, loading, rolesLoaded,
        isAdmin, isCS, isProvider, isCustomer,
        signOut, refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
