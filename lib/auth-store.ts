import { create } from 'zustand';

interface User {
  id: string;
  email: string;
}

interface AuthStore {
  user: User | null;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null,
  setUser: (user: User) => {
    set({ user });
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
  },
  logout: () => {
    set({ user: null });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
  },
}));
