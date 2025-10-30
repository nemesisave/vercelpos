import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import type { ThemeName } from '../types';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode; theme: ThemeName; setTheme: (theme: ThemeName) => void; }> = ({ children, theme, setTheme }) => {
  useEffect(() => {
    const root = window.document.documentElement;
    // Remove all possible theme classes
    root.classList.remove('theme-default', 'theme-dark', 'theme-forest', 'theme-latte', 'theme-ios', 'theme-android');
    // Add the current theme class
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};