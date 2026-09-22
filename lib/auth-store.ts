import { create } from 'zustand';

interface User {
  id: string;
  email: string;
}

interface AuthStore {
  user: User | null;
  /**
   * False until the saved sign-in has been read from this browser. The store
   * starts empty on the server and the client alike, so their first renders
   * match; pages must wait for this before treating "no user" as signed out.
   */
  hydrated: boolean;
  hydrate: () => void;
  setUser: (user: User) => void;
  logout: () => void;
}

function readStoredUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    // Corrupt or unavailable storage: treat as signed out.
    return null;
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  hydrated: false,
  hydrate: () => set({ user: readStoredUser(), hydrated: true }),
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
