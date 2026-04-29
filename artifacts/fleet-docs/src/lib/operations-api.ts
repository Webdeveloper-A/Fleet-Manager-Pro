export type VehicleItem = {
  id: string;
  name?: string | null;
  plateNumber?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DocumentItem = {
  id: string;
  title?: string | null;
  name?: string | null;
  documentType?: string | null;
  type?: string | null;
  status?: string | null;
  expiryDate?: string | null;
  vehicleName?: string | null;
  vehiclePlateNumber?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type TirCarnetItem = {
  id: string;
  carnetNumber: string;
  route?: string | null;
  status?: string | null;
  vehicleId?: string | null;
  vehicleName?: string | null;
  vehiclePlateNumber?: string | null;
  expiryDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DazvolItem = {
  id: string;
  permitNumber: string;
  country?: string | null;
  permitType?: string | null;
  status?: string | null;
  vehicleId?: string | null;
  vehicleName?: string | null;
  vehiclePlateNumber?: string | null;
  expiryDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type OperationsData = {
  vehicles: VehicleItem[];
  documents: DocumentItem[];
  tirCarnets: TirCarnetItem[];
  dazvols: DazvolItem[];
};

async function apiRequest<T>(path: string, token: string | null): Promise<T> {
  const res = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

function normalizeList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];

  if (data && typeof data === "object") {
    const obj = data as { items?: unknown; data?: unknown; results?: unknown };

    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
  }

  return [];
}

async function list<T>(path: string, token: string | null): Promise<T[]> {
  const data = await apiRequest<unknown>(path, token);
  return normalizeList<T>(data);
}

export async function loadOperationsData(token: string | null): Promise<OperationsData> {
  const [vehicles, documents, tirCarnets, dazvols] = await Promise.all([
    list<VehicleItem>("/api/vehicles?pageSize=500", token),
    list<DocumentItem>("/api/documents?pageSize=500", token),
    list<TirCarnetItem>("/api/tir-carnets?pageSize=500", token),
    list<DazvolItem>("/api/dazvols?pageSize=500", token),
  ]);

  return {
    vehicles,
    documents,
    tirCarnets,
    dazvols,
  };
}

export function daysLeft(value?: string | null) {
  if (!value) return null;

  const today = new Date();
  const end = new Date(value);

  if (Number.isNaN(end.getTime())) return null;

  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return Math.ceil((end.getTime() - today.getTime()) / 86400000);
}

export function isExpired(value?: string | null) {
  const days = daysLeft(value);
  return days !== null && days < 0;
}

export function isExpiringSoon(value?: string | null, limit = 30) {
  const days = daysLeft(value);
  return days !== null && days >= 0 && days <= limit;
}

export function dateLabel(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("uz-UZ");
}

export function expiryText(value?: string | null) {
  const days = daysLeft(value);

  if (days === null) return "Muddat kiritilmagan";
  if (days < 0) return `${Math.abs(days)} kun o‘tgan`;
  if (days === 0) return "Bugun tugaydi";

  return `${days} kun qoldi`;
}

export function expiryClass(value?: string | null) {
  const days = daysLeft(value);

  if (days === null) return "bg-slate-100 text-slate-700";
  if (days < 0) return "bg-red-100 text-red-700";
  if (days <= 7) return "bg-orange-100 text-orange-700";
  if (days <= 30) return "bg-amber-100 text-amber-700";

  return "bg-emerald-100 text-emerald-700";
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  const escape = (value: unknown) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}