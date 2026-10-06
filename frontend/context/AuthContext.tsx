"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User } from "@/types";
import { authApi } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  validateCredentials: (usernameOrPhone: string, password?: string) => Promise<{
    requires_otp: boolean;
    mock_otp: string;
    phone: string;
    username: string;
    display_name: string;
    message: string;
  }>;
  login: (usernameOrPhone: string, password: string) => Promise<void>;
  register: (data: {
    username?: string;
    phone?: string;
    password: string;
    display_name: string;
    avatar_url?: string;
  }) => Promise<{ requires_otp: boolean; mock_otp: string; phone: string; username: string }>;
  verifyRegistrationOtp: (phoneOrUsername: string, otp: string) => Promise<{
    verified: boolean;
    message: string;
    username: string;
    phone: string;
  }>;
  verifyOtp: (phoneOrUsername: string, otp: string) => Promise<void>;
  resendOtp: (phoneOrUsername: string) => Promise<{ message: string; mock_otp: string }>;
  logout: () => Promise<void>;
  updateUser: (updated: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load session from storage and verify with backend
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("signal_token");
      const storedUser = localStorage.getItem("signal_user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        try {
          setUser(JSON.parse(storedUser));
          // Refresh user data from API
          const freshUser = await authApi.getMe();
          setUser(freshUser);
          localStorage.setItem("signal_user", JSON.stringify(freshUser));
        } catch {
          // Token expired or invalid
          localStorage.removeItem("signal_token");
          localStorage.removeItem("signal_user");
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Protect routes: unauthenticated users on protected pages are redirected to /login
  useEffect(() => {
    if (!loading) {
      const isAuthPage = pathname === "/login" || pathname === "/register";
      if (!user && !isAuthPage) {
        router.push("/login");
      }
    }
  }, [user, loading, pathname, router]);

  const validateCredentials = useCallback(
    async (usernameOrPhone: string, password?: string) => {
      const data = await authApi.validateCredentials({ username_or_phone: usernameOrPhone, password });
      return data;
    },
    []
  );

  const login = useCallback(
    async (usernameOrPhone: string, password: string) => {
      const data = await authApi.login({ username_or_phone: usernameOrPhone, password });
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem("signal_token", data.access_token);
      localStorage.setItem("signal_user", JSON.stringify(data.user));
      router.push("/chat");
    },
    [router]
  );

  const register = useCallback(
    async (data: {
      username?: string;
      phone?: string;
      password: string;
      display_name: string;
      avatar_url?: string;
    }) => {
      const res = await authApi.register(data);
      return res;
    },
    []
  );

  const verifyRegistrationOtp = useCallback(
    async (phoneOrUsername: string, otp: string) => {
      const res = await authApi.verifyRegistrationOtp({ phone_or_username: phoneOrUsername, otp });
      return res;
    },
    []
  );

  const verifyOtp = useCallback(
    async (phoneOrUsername: string, otp: string) => {
      const data = await authApi.verifyOtp({ phone_or_username: phoneOrUsername, otp });
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem("signal_token", data.access_token);
      localStorage.setItem("signal_user", JSON.stringify(data.user));
      router.push("/chat");
    },
    [router]
  );

  const resendOtp = useCallback(
    async (phoneOrUsername: string) => {
      const res = await authApi.resendOtp({ phone_or_username: phoneOrUsername });
      return res;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore
    } finally {
      localStorage.removeItem("signal_token");
      localStorage.removeItem("signal_user");
      setToken(null);
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
    localStorage.setItem("signal_user", JSON.stringify(updated));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        validateCredentials,
        login,
        register,
        verifyRegistrationOtp,
        verifyOtp,
        resendOtp,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
