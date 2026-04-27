import { create } from "zustand";

export type Language = "uz" | "ru" | "en";
export type Theme = "light" | "dark" | "system";

type PreferencesState = {
  language: Language;
  theme: Theme;
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
  applyTheme: () => void;
};

function getInitialLanguage(): Language {
  const saved = localStorage.getItem("fleet_docs_language");

  if (saved === "uz" || saved === "ru" || saved === "en") {
    return saved;
  }

  return "uz";
}

function getInitialTheme(): Theme {
  const saved = localStorage.getItem("fleet_docs_theme");

  if (saved === "light" || saved === "dark" || saved === "system") {
    return saved;
  }

  return "system";
}

function resolveSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeToDocument(theme: Theme) {
  const resolvedTheme = theme === "system" ? resolveSystemTheme() : theme;

  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
}

export const usePreferences = create<PreferencesState>((set, get) => ({
  language: getInitialLanguage(),
  theme: getInitialTheme(),

  setLanguage: (language) => {
    localStorage.setItem("fleet_docs_language", language);
    set({ language });
  },

  setTheme: (theme) => {
    localStorage.setItem("fleet_docs_theme", theme);
    applyThemeToDocument(theme);
    set({ theme });
  },

  applyTheme: () => {
    applyThemeToDocument(get().theme);
  },
}));