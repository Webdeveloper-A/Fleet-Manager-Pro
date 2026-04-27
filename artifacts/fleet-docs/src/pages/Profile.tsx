import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import {
  getProfile,
  updateProfile,
  updateProfileEmail,
  updateProfilePassword,
  type Profile as ProfileType,
} from "@/lib/profile-api";

export default function Profile() {
  const { token, setAuth } = useAuth();
  const t = useT();
  const { toast } = useToast();

  const [profile, setProfile] = useState<ProfileType | null>(null);

  const [name, setName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  const [email, setEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (!token) return;

    getProfile(token)
      .then((res) => {
        setProfile(res.profile);
        setName(res.profile.name ?? "");
        setEmail(res.profile.email);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Profile load failed";

        toast({
          title: "Profile error",
          description: message,
          variant: "destructive",
        });
      });
  }, [token, toast]);

  async function handleSaveProfile() {
    if (!token) return;

    setProfileSaving(true);

    try {
      const res = await updateProfile(token, {
        name: name.trim() ? name.trim() : null,
      });

      setProfile(res.profile);

      toast({
        title: "Profile saved",
        description: "Your profile information has been updated.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Profile update failed";

      toast({
        title: "Profile error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangeEmail() {
    if (!token) return;

    setEmailSaving(true);

    try {
      const res = await updateProfileEmail(token, {
        email: email.trim(),
        currentPassword: emailPassword,
      });

      setAuth(res.token, res.principal);
      setProfile(res.profile);
      setEmailPassword("");

      toast({
        title: "Email changed",
        description: "Your login email has been updated.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Email update failed";

      toast({
        title: "Email error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!token) return;

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password error",
        description: "New password and confirm password do not match.",
        variant: "destructive",
      });
      return;
    }

    setPasswordSaving(true);

    try {
      await updateProfilePassword(token, {
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast({
        title: "Password changed",
        description: "Your password has been updated.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Password update failed";

      toast({
        title: "Password error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title={t("profileSettings")} description="Manage your name, login email and password." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile information</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Your name"
              />
            </div>

            <div className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{profile?.email ?? "-"}</span>
            </div>

            <div className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium">{profile?.role ?? "-"}</span>
            </div>

            <div className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Company</span>
              <span className="font-medium">{profile?.companyName ?? "-"}</span>
            </div>

            <Button onClick={handleSaveProfile} disabled={profileSaving}>
              {profileSaving ? "Saving..." : "Save profile"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change login email</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">New email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="email@example.com"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Current password</label>
              <input
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Current password"
              />
            </div>

            <Button onClick={handleChangeEmail} disabled={emailSaving}>
              {emailSaving ? "Changing..." : "Change email"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Change password</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Current password"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="New password"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Confirm password"
              />
            </div>

            <div className="md:col-span-3">
              <Button onClick={handleChangePassword} disabled={passwordSaving}>
                {passwordSaving ? "Changing..." : "Change password"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}