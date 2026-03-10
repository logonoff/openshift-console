import type { FC, ReactNode } from 'react';
import { createContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useUserPreference } from '@console/shared/src/hooks/useUserPreference';

export const THEME_USER_SETTING_KEY = 'console.theme';
export const THEME_LOCAL_STORAGE_KEY = 'bridge/theme';
export const GLASS_USER_SETTING_KEY = 'console.theme/glass';
export const GLASS_LOCAL_STORAGE_KEY = 'bridge/glass';
const THEME_SYSTEM_DEFAULT = 'systemDefault';
const THEME_DARK_CLASS = 'pf-v6-theme-dark';
const THEME_GLASS_CLASS = 'pf-v6-theme-glass';
export const THEME_DARK = 'dark';
export const THEME_LIGHT = 'light';
export const darkThemeMq = window.matchMedia('(prefers-color-scheme: dark)');

type PROCESSED_THEME = typeof THEME_DARK | typeof THEME_LIGHT;

type Theme = {
  theme: PROCESSED_THEME;
  glass: boolean;
};

export const applyThemeBehaviour = (
  theme: string,
  onDarkBehaviour?: () => string,
  onLightBehaviour?: () => string,
) => {
  if (darkThemeMq.matches && theme === THEME_SYSTEM_DEFAULT) {
    theme = THEME_DARK;
  }
  if (theme === THEME_DARK) {
    return onDarkBehaviour();
  }
  return onLightBehaviour();
};

export const updateThemeClass = (htmlTagElement: HTMLElement, theme: string): PROCESSED_THEME => {
  return applyThemeBehaviour(
    theme,
    () => {
      htmlTagElement.classList.add(THEME_DARK_CLASS);
      return THEME_DARK;
    },
    () => {
      htmlTagElement.classList.remove(THEME_DARK_CLASS);
      return THEME_LIGHT;
    },
  ) as PROCESSED_THEME;
};

export const ThemeContext = createContext<Theme>(undefined);

interface ThemeProviderProps {
  children?: ReactNode;
}

export const ThemeProvider: FC<ThemeProviderProps> = ({ children }) => {
  const htmlTagElement = document.documentElement;
  const localTheme = localStorage.getItem(THEME_LOCAL_STORAGE_KEY) as PROCESSED_THEME;
  const localGlass = localStorage.getItem(GLASS_LOCAL_STORAGE_KEY) === 'true';
  const [theme, , themeLoaded] = useUserPreference(
    THEME_USER_SETTING_KEY,
    THEME_SYSTEM_DEFAULT,
    true,
  );
  const [glass, , glassLoaded] = useUserPreference<boolean>(GLASS_USER_SETTING_KEY, false, true);

  const [processedTheme, setProcessedTheme] = useState<PROCESSED_THEME>(localTheme);
  const [processedGlass, setProcessedGlass] = useState(localGlass);

  const mqListener = useCallback(
    (e) => {
      if (e.matches) {
        htmlTagElement?.classList.add(THEME_DARK_CLASS);
        setProcessedTheme(THEME_DARK);
      } else {
        htmlTagElement?.classList.remove(THEME_DARK_CLASS);
        setProcessedTheme(THEME_LIGHT);
      }
    },
    [htmlTagElement],
  );

  useEffect(() => {
    if (theme === THEME_SYSTEM_DEFAULT) {
      darkThemeMq.addEventListener('change', mqListener);
    }
    if (themeLoaded) {
      setProcessedTheme(updateThemeClass(htmlTagElement, theme));
    }
    return () => darkThemeMq.removeEventListener('change', mqListener);
  }, [htmlTagElement, mqListener, theme, themeLoaded]);

  useEffect(() => {
    themeLoaded && localStorage.setItem(THEME_LOCAL_STORAGE_KEY, theme);
  }, [theme, themeLoaded]);

  useEffect(() => {
    if (glassLoaded) {
      setProcessedGlass(glass);
    }
    if (glass) {
      htmlTagElement?.classList.add(THEME_GLASS_CLASS);
    } else {
      htmlTagElement?.classList.remove(THEME_GLASS_CLASS);
    }
  }, [glass, glassLoaded]);

  useEffect(() => {
    glassLoaded && localStorage.setItem(GLASS_LOCAL_STORAGE_KEY, String(glass));
  }, [glass, glassLoaded]);

  const providerValue = useMemo<Theme>(() => {
    return {
      theme: processedTheme,
      glass: processedGlass,
    };
  }, [processedTheme, processedGlass]);

  return <ThemeContext.Provider value={providerValue}>{children}</ThemeContext.Provider>;
};
