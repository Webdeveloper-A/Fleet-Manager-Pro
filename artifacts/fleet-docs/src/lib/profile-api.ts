import type { Principal } from "@workspace/api-client-react";

export type Profile = {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "company";
  companyId: string | null;
  companyName: string | null;
  createdAt: string;
  updatedAt: string;
};

async function readError(res: Response) {
  const text = await res.text();

  try {
    const data = JSON.parse(text) as { error?: string };
    return data.error || text || "Request failed";
  } catch {
    return text || "Request failed";
  }
}

export async function getProfile(token: string) {
  const res = await fetch("/api/profile", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  return (await res.json()) as { profile: Profile };
}

export async function updateProfile(token: string, body: { name: string | null }) {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  return (await res.json()) as { profile: Profile };
}

export async function updateProfileEmail(
  token: string,
  body: { email: string; currentPassword: string },
) {
  const res = await fetch("/api/profile/email", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  return (await res.json()) as {
    token: string;
    principal: Principal;
    profile: Profile;
  };
}

export async function updateProfilePassword(
  token: string,
  body: { currentPassword: string; newPassword: string },
) {
  const res = await fetch("/api/profile/password", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  return (await res.json()) as { ok: true };
}