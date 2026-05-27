import React, { createContext, useContext, useState } from 'react';
import { Theme, themes } from './themes';

interface ThemeContextType {
  theme: Theme;
  setTheme: (name: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);

  const setTheme = (name: string) => {
    const found = themes.find(t => t.name === name);
    if (found) setCurrentTheme(found);
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
