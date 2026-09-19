import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { fetchProfile, login as apiLogin, loginWithGoogle as apiLoginWithGoogle, signup as apiSignup } from "../lib/api";
import type { FullProfile } from "../lib/types";

const TOKEN_STORAGE_KEY = "resumeAutoFiller.token";

interface AuthContextValue {
  token: string | null;
  profile: FullProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<{ isNewUser: boolean }>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY),
  );
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const current = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!current) {
      setProfile(null);
      return;
    }
    const fullProfile = await fetchProfile(current);
    setProfile(fullProfile);
  }, []);

  useEffect(() => {
    refreshProfile().finally(() => setLoading(false));
  }, [refreshProfile]);

  async function login(email: string, password: string) {
    const newToken = await apiLogin(email, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    setToken(newToken);
    await refreshProfile();
  }

  async function loginWithGoogle(credential: string) {
    const { token: newToken, isNewUser } = await apiLoginWithGoogle(credential);
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    setToken(newToken);
    await refreshProfile();
    return { isNewUser };
  }

  async function signup(email: string, password: string) {
    await apiSignup(email, password);
    await login(email, password);
  }

  function logout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{ token, profile, loading, login, loginWithGoogle, signup, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
