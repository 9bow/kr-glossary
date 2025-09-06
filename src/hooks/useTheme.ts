import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode } from '../types';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  getCurrentMode: () => 'light' | 'dark';
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      setMode: (mode: ThemeMode) => set({ mode }),
      toggleMode: () => {
        const currentMode = get().mode;
        if (currentMode === 'light') {
          set({ mode: 'dark' });
        } else if (currentMode === 'dark') {
          set({ mode: 'light' });
        } else {
          // system mode: toggle between light and dark
          const systemTheme = getSystemTheme();
          set({ mode: systemTheme === 'light' ? 'dark' : 'light' });
        }
      },
      getCurrentMode: () => {
        const { mode } = get();
        if (mode === 'system') {
          return getSystemTheme();
        }
        return mode as 'light' | 'dark';
      },
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({ mode: state.mode }),
    }
  )
);

// System theme change listener
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleChange = () => {
    // Force re-render by updating Zustand state
    const { mode } = useTheme.getState();
    if (mode === 'system') {
      useTheme.setState({ mode: 'system' }); // Trigger re-render
    }
  };

  mediaQuery.addEventListener('change', handleChange);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    mediaQuery.removeEventListener('change', handleChange);
  });
}
