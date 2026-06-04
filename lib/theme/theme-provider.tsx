"use client";

import * as React from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
  themes: Theme[];
};

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  storageKey?: string;
};

const themes: Theme[] = ["light", "dark", "system"];

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribeToSystemTheme(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getInitialTheme(defaultTheme: Theme, storageKey: string): Theme {
  if (typeof window === "undefined") return defaultTheme;

  const storedTheme = window.localStorage.getItem(storageKey) as Theme | null;
  return storedTheme && themes.includes(storedTheme) ? storedTheme : defaultTheme;
}

function applyResolvedTheme(
  resolvedTheme: "light" | "dark",
  disableTransitionOnChange: boolean,
) {
  const root = document.documentElement;

  let style: HTMLStyleElement | null = null;
  if (disableTransitionOnChange) {
    style = document.createElement("style");
    style.appendChild(document.createTextNode("*{transition:none!important}"));
    document.head.appendChild(style);
  }

  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);
  root.style.colorScheme = resolvedTheme;

  if (style) {
    window.getComputedStyle(document.body);
    window.setTimeout(() => style?.remove(), 1);
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  enableSystem = true,
  disableTransitionOnChange = false,
  storageKey = "theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() =>
    getInitialTheme(defaultTheme, storageKey),
  );
  const systemTheme = React.useSyncExternalStore<"light" | "dark">(
    subscribeToSystemTheme,
    getSystemTheme,
    () => "dark" as const,
  );
  const resolvedTheme: "light" | "dark" =
    theme === "system" ? (enableSystem ? systemTheme : "dark") : theme;

  React.useEffect(() => {
    applyResolvedTheme(resolvedTheme, disableTransitionOnChange);
  }, [resolvedTheme, disableTransitionOnChange]);

  const setTheme = React.useCallback<React.Dispatch<React.SetStateAction<Theme>>>(
    (value) => {
      setThemeState((currentTheme) => {
        const nextTheme = typeof value === "function" ? value(currentTheme) : value;
        window.localStorage.setItem(storageKey, nextTheme);
        return nextTheme;
      });
    },
    [storageKey],
  );

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
