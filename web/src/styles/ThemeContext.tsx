import React, { createContext, useContext, useState, useEffect } from 'react';
import { Theme, themes } from './themes';

interface ThemeContextType {
  theme: Theme;
  setTheme: (name: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('syncstore_theme');
    if (savedTheme) {
      const found = themes.find(t => t.name === savedTheme);
      if (found) return found;
    }
    return themes[0];
  });

  useEffect(() => {
    const root = document.documentElement;
    const colors = currentTheme.colors;
    
    root.style.setProperty('--color-bg', colors.bg);
    root.style.setProperty('--color-main', colors.main);
    root.style.setProperty('--color-caret', colors.caret);
    root.style.setProperty('--color-sub', colors.sub);
    root.style.setProperty('--color-text', colors.text);
    root.style.setProperty('--color-error', colors.error);
    root.style.setProperty('--color-steam', colors.steam);
    root.style.setProperty('--color-epic', colors.epic);
    root.style.setProperty('--color-psn', colors.psn);
    root.style.setProperty('--color-xbox', colors.xbox);
    
    // Add RGB Pulse effect if the theme is rgb_pulse
    if (currentTheme.name === 'rgb_pulse') {
        root.classList.add('rgb-pulse-active');
    } else {
        root.classList.remove('rgb-pulse-active');
    }
  }, [currentTheme]);

  const setTheme = (name: string) => {
    const found = themes.find(t => t.name === name);
    if (found) {
      setCurrentTheme(found);
      localStorage.setItem('syncstore_theme', name);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
