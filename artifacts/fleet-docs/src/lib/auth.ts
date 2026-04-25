import { create } from "zustand";
import { Principal } from "@workspace/api-client-react";

interface AuthState {
  token: string | null;
  principal: Principal | null;
  setAuth: (token: string, principal: Principal) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem("fleet_docs_token"),
  principal: null, // Will be hydrated by getMe
  setAuth: (token, principal) => {
    localStorage.setItem("fleet_docs_token", token);
    set({ token, principal });
  },
  logout: () => {
    localStorage.removeItem("fleet_docs_token");
    set({ token: null, principal: null });
  },
}));
