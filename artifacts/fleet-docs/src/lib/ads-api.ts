export type AdPlacement = "dashboard" | "ads-page" | "all";

export type AdItem = {
  id: string;
  title: string;
  description?: string | null;
  imageUrl: string;
  targetUrl?: string | null;
  placement: AdPlacement;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type SaveAdPayload = {
  title: string;
  description?: string | null;
  imageUrl: string;
  targetUrl?: string | null;
  placement: AdPlacement;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  sortOrder: number;
};

async function apiRequest<T>(
  path: string,
  token: string | null,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = `Request failed with ${res.status}`;

    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore json parse error
    }

    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export function getActiveAds(token: string | null, placement?: AdPlacement) {
  const query = placement ? `?placement=${encodeURIComponent(placement)}` : "";
  return apiRequest<AdItem[]>(`/api/ads${query}`, token);
}

export function getAllAdsForAdmin(token: string | null) {
  return apiRequest<AdItem[]>("/api/ads/admin", token);
}

export function createAd(token: string | null, payload: SaveAdPayload) {
  return apiRequest<AdItem>("/api/ads", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAd(token: string | null, id: string, payload: SaveAdPayload) {
  return apiRequest<AdItem>(`/api/ads/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteAd(token: string | null, id: string) {
  return apiRequest<void>(`/api/ads/${id}`, token, {
    method: "DELETE",
  });
}