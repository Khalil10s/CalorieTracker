import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  separator: string;
  tabBar: string;
  inputBackground: string;
  protein: string;
  carbs: string;
  fat: string;
  calories: string;
}

const lightColors: ThemeColors = {
  primary: '#45C4B0',
  secondary: '#3BB89E',
  accent: '#FF9500',
  success: '#45C4B0',
  warning: '#FFCC00',
  error: '#FF3B30',
  background: '#F7F8FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#2D3436',
  textSecondary: '#8E8E93',
  textTertiary: '#B2BEC3',
  border: '#ECEEF1',
  separator: '#DFE6E9',
  tabBar: '#FFFFFF',
  inputBackground: '#F1F3F5',
  protein: '#FF6B81',
  carbs: '#45C4B0',
  fat: '#FDCB6E',
  calories: '#45C4B0',
};

const darkColors: ThemeColors = {
  primary: '#45C4B0',
  secondary: '#3BB89E',
  accent: '#FF9F0A',
  success: '#45C4B0',
  warning: '#FFD60A',
  error: '#FF453A',
  background: '#000000',
  surface: '#1C1C1E',
  card: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#98989D',
  textTertiary: '#636366',
  border: '#38383A',
  separator: '#48484A',
  tabBar: '#1C1C1E',
  inputBackground: '#2C2C2E',
  protein: '#FF6B81',
  carbs: '#45C4B0',
  fat: '#FDCB6E',
  calories: '#45C4B0',
};

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  colors: lightColors,
  setMode: () => {},
  toggle: () => {},
});

const THEME_KEY = 'app_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      if (val === 'dark' || val === 'light') setModeState(val);
    });
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(THEME_KEY, m);
  };

  const toggle = () => setMode(mode === 'light' ? 'dark' : 'light');

  const colors = mode === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, colors, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
