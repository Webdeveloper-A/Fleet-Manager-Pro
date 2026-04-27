import { useEffect, ReactNode } from "react";
import { useLocation, Route, Switch } from "wouter";
import { useAuth } from "@/lib/auth";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import AppShell from "@/components/layout/AppShell";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Vehicles from "@/pages/Vehicles";
import VehicleDetail from "@/pages/VehicleDetail";
import VehicleForm from "@/pages/VehicleForm";
import Documents from "@/pages/Documents";
import DocumentForm from "@/pages/DocumentForm";
import AdminCompanies from "@/pages/AdminCompanies";
import CallBot from "@/pages/CallBot";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";
import AdminSupport from "@/pages/AdminSupport";

function ProtectedShell({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const [location, setLocation] = useLocation();
  const { token, principal, setAuth, logout } = useAuth();

  const { data: me, isLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  useEffect(() => {
    if (!token) {
      setLocation("/login");
    }
  }, [token, setLocation]);

  useEffect(() => {
    if (error) {
      logout();
      setLocation("/login");
    } else if (me && token) {
      setAuth(token, me.principal);
    }
  }, [me, error, token, setAuth, logout, setLocation]);

  useEffect(() => {
    if (principal?.role === "admin" && location === "/") {
      setLocation("/admin/companies");
    }
  }, [principal, location, setLocation]);

  if (!token || isLoading || !principal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (adminOnly && principal.role !== "admin") {
    return <RedirectTo to="/" />;
  }

  return <AppShell>{children}</AppShell>;
}

function RedirectTo({ to }: { to: string }) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);

  return null;
}

export default function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />

      <Route path="/">
        <ProtectedShell>
          <Dashboard />
        </ProtectedShell>
      </Route>

      <Route path="/vehicles">
        <ProtectedShell>
          <Vehicles />
        </ProtectedShell>
      </Route>

      <Route path="/vehicles/new">
        <ProtectedShell>
          <VehicleForm />
        </ProtectedShell>
      </Route>

      <Route path="/vehicles/:id">
        <ProtectedShell>
          <VehicleDetail />
        </ProtectedShell>
      </Route>

      <Route path="/documents">
        <ProtectedShell>
          <Documents />
        </ProtectedShell>
      </Route>

      <Route path="/documents/new">
        <ProtectedShell>
          <DocumentForm />
        </ProtectedShell>
      </Route>

      <Route path="/call-bot">
        <ProtectedShell>
          <CallBot />
        </ProtectedShell>
      </Route>

      <Route path="/profile">
        <ProtectedShell>
          <Profile />
        </ProtectedShell>
      </Route>

<Route path="/admin/support">
  <ProtectedShell adminOnly>
    <AdminSupport />
  </ProtectedShell>
</Route>

      <Route path="/admin/companies">
        <ProtectedShell adminOnly>
          <AdminCompanies />
        </ProtectedShell>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}