import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('navigo_theme') as Theme;
    if (savedTheme) return savedTheme;
    // Detect system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem('navigo_theme', theme);
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);
    
    // Add transition class for smooth theme change
    document.body.classList.add('theme-transitioning');
    const timeout = setTimeout(() => {
      document.body.classList.remove('theme-transitioning');
    }, 300);

    // Update meta theme-color for mobile browser UI
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'light' ? '#F8FAFC' : '#080C14');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = theme === 'light' ? '#F8FAFC' : '#080C14';
      document.head.appendChild(meta);
    }

    return () => clearTimeout(timeout);
  }, [theme]);

  // Listen to system preference changes
  useEffect(() => {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem('navigo_theme');
      // Only auto-switch if user hasn't manually set a theme
      if (!savedTheme) {
        setThemeState(e.matches ? 'light' : 'dark');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setThemeState(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    // Haptic feedback
    try {
      if ('vibrate' in navigator) navigator.vibrate(10);
    } catch { /* noop */ }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
      <style>{`
        body.theme-transitioning,
        body.theme-transitioning *,
        body.theme-transitioning ion-page,
        body.theme-transitioning ion-app,
        body.theme-transitioning ion-header,
        body.theme-transitioning ion-toolbar {
          transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
      `}</style>
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
