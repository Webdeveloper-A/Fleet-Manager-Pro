import type { ReactNode } from "react";
import { Route, Switch } from "wouter";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Vehicles from "@/pages/Vehicles";
import VehicleForm from "@/pages/VehicleForm";
import VehicleDetail from "@/pages/VehicleDetail";
import Documents from "@/pages/Documents";
import DocumentForm from "@/pages/DocumentForm";
import CallBot from "@/pages/CallBot";
import AdminSupport from "@/pages/AdminSupport";
import AdminCompanies from "@/pages/AdminCompanies";
import TelegramSettings from "@/pages/TelegramSettings";
import TIRCarnets from "@/pages/TIRCarnets";
import Dazvols from "@/pages/Dazvols";
import Ads from "@/pages/Ads";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/not-found";
import ControlCenter from "@/pages/ControlCenter";
import Reports from "@/pages/Reports";
import ActivityLog from "@/pages/ActivityLog";

function RootRoute() {
  const { principal } = useAuth();

  if (!principal) {
    return <Home />;
  }

  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}

function ProtectedShell({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const { principal } = useAuth();

  if (!principal) {
    return <Login />;
  }

  if (adminOnly && principal.role !== "admin") {
    return (
      <AppShell>
        <div className="rounded-xl border border-border bg-card p-6">
          <h1 className="text-lg font-semibold">Ruxsat yo‘q</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ushbu bo‘lim faqat administrator uchun mo‘ljallangan.
          </p>
        </div>
      </AppShell>
    );
  }

  return <AppShell>{children}</AppShell>;
}

export default function Router() {
  return (
    <Switch>
      <Route path="/">
        <RootRoute />
      </Route>

      <Route path="/login">
        <Login />
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

      <Route path="/vehicles/:id/edit">
        <ProtectedShell>
          <VehicleForm />
        </ProtectedShell>
      </Route>

      <Route path="/vehicles/:id">
        <ProtectedShell>
          <VehicleDetail />
        </ProtectedShell>
      </Route>

      <Route path="/tir-carnets">
        <ProtectedShell>
          <TIRCarnets />
        </ProtectedShell>
      </Route>

      <Route path="/dazvols">
        <ProtectedShell>
          <Dazvols />
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

      <Route path="/documents/:id/edit">
        <ProtectedShell>
          <DocumentForm />
        </ProtectedShell>
      </Route>

      <Route path="/telegram">
        <ProtectedShell>
          <TelegramSettings />
        </ProtectedShell>
      </Route>

      <Route path="/call-bot">
        <ProtectedShell>
          <CallBot />
        </ProtectedShell>
      </Route>

      <Route path="/ads">
        <ProtectedShell>
          <Ads />
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
<Route path="/control">
  <ProtectedShell>
    <ControlCenter />
  </ProtectedShell>
</Route>

<Route path="/reports">
  <ProtectedShell>
    <Reports />
  </ProtectedShell>
</Route>

<Route path="/activity">
  <ProtectedShell>
    <ActivityLog />
  </ProtectedShell>
</Route>
      <Route>
        <ProtectedShell>
          <NotFound />
        </ProtectedShell>
      </Route>
    </Switch>
  );
}