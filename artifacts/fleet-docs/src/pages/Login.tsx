import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Loader2, ArrowRight, Truck, Clock, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const DEMO_CREDS = [
  { label: "Company demo", email: "demo@fleetdocs.app", password: "demo1234" },
  { label: "Platform admin", email: "admin@fleetdocs.app", password: "admin1234" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    try {
      const res = await login.mutateAsync({ data: { email, password } });
      setAuth(res.token, res.principal);
      const dest = res.principal.role === "admin" ? "/admin/companies" : "/";
      setLocation(dest);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Sign-in failed. Please try again.";
      toast({
        title: "Sign-in failed",
        description: message,
        variant: "destructive",
      });
    }
  }

  function fillDemo(c: { email: string; password: string }) {
    setEmail(c.email);
    setPassword(c.password);
  }

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-background">
      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight">Fleet Docs</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Operations cockpit
              </p>
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">Sign in to your fleet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Track every vehicle and document. Get warned before anything expires.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourcompany.com"
                data-testid="input-email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="input-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={login.isPending}
              data-testid="button-login"
            >
              {login.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <Card className="mt-8 border-dashed">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Demo access
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tap a row to fill the form, then sign in.
              </p>
              <div className="mt-3 space-y-1.5">
                {DEMO_CREDS.map((c) => (
                  <button
                    key={c.email}
                    type="button"
                    onClick={() => fillDemo(c)}
                    className="flex w-full items-center justify-between rounded-md border border-border/60 px-3 py-2 text-left text-xs transition-colors hover:border-primary/40 hover:bg-primary/5"
                    data-testid={`button-demo-${c.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div>
                      <p className="font-medium text-foreground">{c.label}</p>
                      <p className="text-muted-foreground">{c.email}</p>
                    </div>
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                      {c.password}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/70 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,white_0%,transparent_50%)] opacity-20" />
        <div className="relative z-10 flex h-full flex-col justify-between px-12 py-16 text-primary-foreground">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-80">Fleet Docs</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">
              Never miss a permit, inspection, or insurance expiry again.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed opacity-85">
              One quiet dashboard for the entire fleet. Color-coded status from green to
              red, automated reminders before things lapse, and audit-ready records for
              every vehicle.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            {[
              { Icon: Truck, label: "Vehicles", desc: "Centralized fleet roster" },
              { Icon: Clock, label: "Alerts", desc: "Catch expiry early" },
              { Icon: AlertTriangle, label: "Status", desc: "Green / amber / red" },
            ].map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.06, duration: 0.4 }}
                className="rounded-xl border border-white/15 bg-white/5 p-4 backdrop-blur"
              >
                <f.Icon className="h-4 w-4 opacity-90" />
                <p className="mt-3 text-sm font-medium">{f.label}</p>
                <p className="mt-1 text-[11px] opacity-70">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
