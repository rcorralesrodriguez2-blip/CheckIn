
"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User } from '@/types';
import { useRouter, usePathname } from 'next/navigation';
import { getUserById, createUser } from '@/services/userService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (id: string, password?: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const userId = typeof window !== 'undefined' ? sessionStorage.getItem('userId') : null;
    
    if (!userId) {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const userData = await getUserById(userId);
        if (userData) {
          setUser(userData);
        } else if (userId === 'admin') {
          // Fallback para el admin si por alguna razón el documento no existe pero la sesión está activa
          const fallbackAdmin: User = {
            id: 'admin',
            fullName: 'Administrador del Sistema',
            role: 'admin',
            password: 'admin',
            exitLockUntil: null
          };
          setUser(fallbackAdmin);
        } else {
          sessionStorage.removeItem('userId');
        }
      } catch (e) {
        sessionStorage.removeItem('userId');
      } finally {
        setLoading(false);
      }
    };
    
    initAuth();
  }, []);
  
  useEffect(() => {
    if (loading) return;
    
    const publicPages = ['/login', '/register', '/registration-success', '/'];
    if (!user && !publicPages.includes(pathname)) {
      router.replace('/login');
    }
  }, [user, loading, pathname, router]);

  const login = useCallback(async (id: string, password?: string): Promise<boolean> => {
    try {
      // Caso especial admin/admin: Prioridad absoluta y creación on-the-fly si falta
      if (id === 'admin' && password === 'admin') {
         let adminData = await getUserById('admin');
         
         if (!adminData) {
            // Si no existe, lo creamos para que las futuras consultas funcionen
            const newAdmin: User = {
              id: 'admin',
              fullName: 'Administrador del Sistema',
              role: 'admin',
              password: 'admin',
              exitLockUntil: null
            };
            await createUser(newAdmin);
            adminData = newAdmin;
         }

         setUser(adminData);
         sessionStorage.setItem('userId', 'admin');
         return true;
      }

      const userData = await getUserById(id);

      if (!userData || !password || userData.password !== password) {
        return false;
      }
      
      setUser(userData);
      sessionStorage.setItem('userId', userData.id);
      return true;
    } catch (e) {
      console.error("Login error:", e);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem('userId');
    router.replace('/login');
  }, [router]);

  const value = { user, loading, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
