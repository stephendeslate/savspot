'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { apiClient, ApiError } from '@/lib/api-client';
import { API_ROUTES, SESSION_COOKIE_NAME } from '@/lib/constants';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string | null;
  avatarUrl: string | null;
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

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function setSessionCookie(value: boolean) {
  if (typeof document === 'undefined') return;
  if (value) {
    document.cookie = `${SESSION_COOKIE_NAME}=true; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  } else {
    document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0`;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      apiClient.loadTokens();
      const userData = await apiClient.get<User>(API_ROUTES.ME);
      setUser(userData);
      setSessionCookie(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        apiClient.clearTokens();
        setSessionCookie(false);
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const login = useCallback(
    async (input: LoginInput) => {
      const data = await apiClient.post<AuthTokens>(API_ROUTES.LOGIN, input);
      apiClient.setTokens(data.accessToken, data.refreshToken);
      setSessionCookie(true);
      await loadUser();
    },
    [loadUser],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const data = await apiClient.post<AuthTokens>(
        API_ROUTES.REGISTER,
        input,
      );
      apiClient.setTokens(data.accessToken, data.refreshToken);
      setSessionCookie(true);
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
      apiClient.clearTokens();
      setSessionCookie(false);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
