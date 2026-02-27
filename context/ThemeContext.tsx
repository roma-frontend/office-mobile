import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, getThemeColors, getThemeShadows, DarkColors, LightColors } from '@/constants/theme';

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
  colors: typeof DarkColors;
  shadows: ReturnType<typeof getThemeShadows>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  colors: DarkColors,
  shadows: getThemeShadows('dark'),
  isDark: true,
});

const THEME_KEY = 'app_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    });
  }, []);

  const toggleTheme = async () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  };

  const colors = getThemeColors(theme);
  const shadows = getThemeShadows(theme);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors, shadows, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
