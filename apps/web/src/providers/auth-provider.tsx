'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiClient, ApiError } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/constants';

interface Membership {
  tenantId: string;
  role: string;
  tenant: { id: string; name: string; slug: string; logoUrl: string | null };
}

interface UserResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  avatarUrl: string | null;
  memberships?: Membership[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
  avatarUrl: string | null;
  memberships: Membership[];
}

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  businessName?: string;
}

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  activeTenantId: string | null;
  setActiveTenant: (tenantId: string) => void;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

const ACTIVE_TENANT_KEY = 'savspot_active_tenant';

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    try {
      const data = await apiClient.get<UserResponse>(API_ROUTES.ME);
      const memberships = data.memberships ?? [];
      const name = [data.firstName, data.lastName].filter(Boolean).join(' ') || data.email;
      setUser({
        id: data.id,
        email: data.email,
        name,
        role: data.role,
        tenantId: memberships[0]?.tenantId ?? null,
        avatarUrl: data.avatarUrl,
        memberships,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Not authenticated
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!user) {
      setActiveTenantId(null);
      return;
    }
    const stored = localStorage.getItem(ACTIVE_TENANT_KEY);
    const match = stored
      ? user.memberships.find((m: Membership) => m.tenantId === stored)
      : undefined;
    setActiveTenantId(match?.tenantId ?? user.memberships[0]?.tenantId ?? null);
  }, [user]);

  const setActiveTenant = useCallback((tenantId: string) => {
    localStorage.setItem(ACTIVE_TENANT_KEY, tenantId);
    setActiveTenantId(tenantId);
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      await apiClient.post(API_ROUTES.LOGIN, input);
      await loadUser();
    },
    [loadUser],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      await apiClient.post(API_ROUTES.REGISTER, input);
      await loadUser();
    },
    [loadUser],
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.post(API_ROUTES.LOGOUT);
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem(ACTIVE_TENANT_KEY);
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      activeTenantId,
      setActiveTenant,
      login,
      register,
      logout,
      loadUser,
    }),
    [user, isLoading, activeTenantId, setActiveTenant, login, register, logout, loadUser],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
