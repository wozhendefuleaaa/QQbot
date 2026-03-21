import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, LoginRequest, LoginResponse, AuthStatus } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requirePasswordChange: boolean;
  login: (credentials: LoginRequest) => Promise<{ success: boolean; message: string; requirePasswordChange?: boolean }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearRequirePasswordChange: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'auth_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });
  const [isLoading, setIsLoading] = useState(true);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);

  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(storedToken);
        // 检查是否需要修改密码
        if (data.user?.requirePasswordChange) {
          setRequirePasswordChange(true);
        }
      } else {
        // Token invalid, clear it
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setToken(null);
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials: LoginRequest): Promise<{ success: boolean; message: string; requirePasswordChange?: boolean }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data: LoginResponse = await response.json();

      if (data.success && data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        setToken(data.token);
        setUser(data.user);
        // 检查是否需要修改密码
        if (data.user.requirePasswordChange) {
          setRequirePasswordChange(true);
          return { success: true, message: data.message, requirePasswordChange: true };
        }
        return { success: true, message: data.message };
      }

      return { success: false, message: data.message || '登录失败' };
    } catch (error) {
      return { success: false, message: '网络错误，请稍后重试' };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setToken(null);
    setRequirePasswordChange(false);
  };

  const clearRequirePasswordChange = () => {
    setRequirePasswordChange(false);
    if (user) {
      setUser({ ...user, requirePasswordChange: undefined });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        requirePasswordChange,
        login,
        logout,
        checkAuth,
        clearRequirePasswordChange,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
