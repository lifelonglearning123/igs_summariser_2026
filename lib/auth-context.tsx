'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuthStore } from './auth-store';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
