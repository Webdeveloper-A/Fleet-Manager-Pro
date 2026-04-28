export type DazvolStatus = "active" | "used" | "expired";
export type DazvolPermitType = "bilateral" | "transit" | "third_country" | "special";

export type Dazvol = {
  id: string;
  companyId: string;
  vehicleId?: string | null;
  vehicleName?: string | null;
  vehiclePlateNumber?: string | null;
  permitNumber: string;
  country: string;
  permitType: DazvolPermitType;
  issueDate?: string | null;
  expiryDate?: string | null;
  status: DazvolStatus;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DazvolPayload = {
  vehicleId?: string | null;
  permitNumber: string;
  country: string;
  permitType: DazvolPermitType;
  issueDate?: string | null;
  expiryDate?: string | null;
  status: DazvolStatus;
  note?: string | null;
};

export type DazvolListResponse = {
  items: Dazvol[];
  total: number;
  page: number;
  pageSize: number;
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
      // ignore
    }

    throw new Error(message);
  }

  return (await res.json()) as T;
}

export function listDazvols(
  token: string | null,
  params: {
    search?: string;
    status?: string;
    vehicleId?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      query.set(key, String(value));
    }
  });

  const qs = query.toString();
  return apiRequest<DazvolListResponse>(`/api/dazvols${qs ? `?${qs}` : ""}`, token);
}

export function createDazvol(token: string | null, data: DazvolPayload) {
  return apiRequest<{ item: Dazvol }>("/api/dazvols", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateDazvol(token: string | null, id: string, data: Partial<DazvolPayload>) {
  return apiRequest<{ item: Dazvol }>(`/api/dazvols/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteDazvol(token: string | null, id: string) {
  return apiRequest<{ ok: boolean }>(`/api/dazvols/${id}`, token, {
    method: "DELETE",
  });
}

export function assignDazvolToVehicle(token: string | null, id: string, vehicleId: string) {
  return apiRequest<{ item: Dazvol }>(`/api/dazvols/${id}/assign-vehicle`, token, {
    method: "POST",
    body: JSON.stringify({ vehicleId }),
  });
}