import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { supabase } from '../library/supabase';

interface BoothUser {
  nickname: string;
  isGuest: boolean;
}

interface BoothContextType {
  boothUser: BoothUser | null;
  setBoothUser: (user: BoothUser | null) => void;
  loginAsGuest: (nickname: string) => void;
  logout: () => void;
  isBoothMode: boolean;
}

const BoothContext = createContext<BoothContextType | undefined>(undefined);

interface BoothProviderProps {
  children: ReactNode;
  isBoothMode: boolean;
}

export const BoothProvider: React.FC<BoothProviderProps> = ({ children, isBoothMode }) => {
  // Initialize from localStorage if available
  const [boothUser, setBoothUser] = useState<BoothUser | null>(() => {
    if (!isBoothMode) return null;

    const stored = localStorage.getItem('boothUser');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse booth user from storage:', e);
        localStorage.removeItem('boothUser');
      }
    }
    return null;
  });

  // Check for anonymous auth session on mount and restore booth user
  useEffect(() => {
    if (!isBoothMode) return;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // If we have an anonymous session with booth metadata, restore the booth user
      if (session?.user?.user_metadata?.isBoothGuest && session?.user?.user_metadata?.boothNickname) {
        const nickname = session.user.user_metadata.boothNickname;

        // Only set if not already set
        if (!boothUser || boothUser.nickname !== nickname) {
          setBoothUser({
            isGuest: true,
            nickname,
          });
        }
      }
    };

    checkSession();
  }, [boothUser, isBoothMode]);

  // Save to localStorage whenever boothUser changes
  useEffect(() => {
    if (boothUser) {
      localStorage.setItem('boothUser', JSON.stringify(boothUser));
    } else {
      localStorage.removeItem('boothUser');
    }
  }, [boothUser]);

  const loginAsGuest = useCallback(async (nickname: string) => {
    try {
      // Use Supabase anonymous authentication
      const { data, error } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            boothNickname: nickname,
            isBoothGuest: true,
          },
        },
      });

      if (error) {
        console.error('Failed to sign in anonymously:', error);
        throw error;
      }

      if (data.user) {
        setBoothUser({
          isGuest: true,
          nickname,
        });
      }
    } catch (error) {
      console.error('Error during anonymous login:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    setBoothUser(null);
    localStorage.removeItem('boothUser');
  }, []);

  const value = React.useMemo(
    () => ({
      boothUser,
      isBoothMode,
      loginAsGuest,
      logout,
      setBoothUser,
    }),
    [boothUser, isBoothMode, loginAsGuest, logout, setBoothUser],
  );

  return <BoothContext.Provider value={value}>{children}</BoothContext.Provider>;
};

export const useBoothContext = () => {
  const context = useContext(BoothContext);
  if (context === undefined) {
    throw new Error('useBoothContext must be used within a BoothProvider');
  }
  return context;
};
