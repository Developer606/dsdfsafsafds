import React, { createContext, useState, useContext, useEffect } from 'react';
import { useLocation } from 'wouter';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isLandingPage = location === '/';

  // Initialize theme state from localStorage or default
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      return savedTheme || 'dark';
    }
    return 'dark';
  });

  // Function to set theme
  const setTheme = (newTheme: Theme) => {
    const doc = document.documentElement;
    
    if (newTheme === 'dark') {
      doc.classList.add('dark');
    } else {
      doc.classList.remove('dark');
    }
    
    localStorage.setItem('theme', newTheme);
    setThemeState(newTheme);
  };

  // Function to toggle theme
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Apply the right theme on component mount and when location changes
  useEffect(() => {
    if (isLandingPage) {
      // Force light theme on landing page
      const doc = document.documentElement;
      doc.classList.remove('dark');
      // We don't update state here to avoid affecting other pages
    } else {
      // Apply stored theme on other pages
      setTheme(theme);
    }
  }, [isLandingPage, theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}