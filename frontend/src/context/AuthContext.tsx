import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiCall } from '../api/client';

interface User {
  user_id: string;
  name: string;
  phone: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (phone: string, pin: string) => Promise<void>;
  register: (name: string, phone: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      if (storedToken) {
        const data = await apiCall('/api/auth/me');
        setUser(data.user);
      }
    } catch {
      await AsyncStorage.removeItem('auth_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(phone: string, pin: string) {
    const data = await apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, pin }),
    });
    await AsyncStorage.setItem('auth_token', data.token);
    setUser(data.user);
  }

  async function register(name: string, phone: string, pin: string) {
    const data = await apiCall('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, phone, pin }),
    });
    await AsyncStorage.setItem('auth_token', data.token);
    setUser(data.user);
  }

  async function logout() {
    try {
      await apiCall('/api/auth/logout', { method: 'POST' });
    } catch {}
    await AsyncStorage.removeItem('auth_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
