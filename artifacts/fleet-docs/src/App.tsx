import { useEffect } from "react";
import { Switch, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePreferences } from "@/lib/preferences";
import AppRouter from "./Router";

const queryClient = new QueryClient();

function App() {
  const applyTheme = usePreferences((s) => s.applyTheme);
  const theme = usePreferences((s) => s.theme);

  useEffect(() => {
    applyTheme();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme();

    media.addEventListener("change", handleChange);

    return () => {
      media.removeEventListener("change", handleChange);
    };
  }, [applyTheme, theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRouter />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;