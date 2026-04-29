export type TirCarnetStatus = "active" | "used" | "expired";
export type AssignmentFilter = "all" | "assigned" | "unassigned";

export type TirCarnet = {
  id: string;
  companyId: string;
  vehicleId?: string | null;
  vehicleName?: string | null;
  vehiclePlateNumber?: string | null;
  carnetNumber: string;
  route?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  status: TirCarnetStatus;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TirCarnetPayload = {
  carnetNumber?: string;
  route?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  status?: TirCarnetStatus;
  note?: string | null;
  vehicleId?: string | null;
};

export type TirCarnetListResponse = {
  items: TirCarnet[];
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

export function listTirCarnets(
  token: string | null,
  params: {
    search?: string;
    status?: string;
    vehicleId?: string;
    assignment?: AssignmentFilter;
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
  return apiRequest<TirCarnetListResponse>(`/api/tir-carnets${qs ? `?${qs}` : ""}`, token);
}

export function createTirCarnet(token: string | null, data: TirCarnetPayload) {
  return apiRequest<{ item: TirCarnet }>("/api/tir-carnets", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTirCarnet(token: string | null, id: string, data: Partial<TirCarnetPayload>) {
  return apiRequest<{ item: TirCarnet }>(`/api/tir-carnets/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function assignTirCarnetToVehicle(token: string | null, id: string, vehicleId: string) {
  return apiRequest<{ item: TirCarnet }>(`/api/tir-carnets/${id}/assign-vehicle`, token, {
    method: "POST",
    body: JSON.stringify({ vehicleId }),
  });
}

export function deleteTirCarnet(token: string | null, id: string) {
  return apiRequest<{ ok: boolean }>(`/api/tir-carnets/${id}`, token, {
    method: "DELETE",
  });
}