import { useMemo, useState } from "react";
import { Plus, Search, ClipboardCheck, CalendarClock, Truck, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";

type TirCarnet = {
  id: string;
  carnetNumber: string;
  vehiclePlate: string;
  route: string;
  issueDate: string;
  expiryDate: string;
  status: "active" | "expired" | "used";
  note?: string;
};

const STORAGE_KEY = "fleet-docs-tir-carnets";

function loadItems(): TirCarnet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TirCarnet[]) : [];
  } catch {
    return [];
  }
}

function saveItems(items: TirCarnet[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function statusLabel(status: TirCarnet["status"]) {
  if (status === "expired") return "Muddati o‘tgan";
  if (status === "used") return "Yopilgan";
  return "Faol";
}

function statusClass(status: TirCarnet["status"]) {
  if (status === "expired") return "bg-red-100 text-red-700";
  if (status === "used") return "bg-slate-100 text-slate-700";
  return "bg-emerald-100 text-emerald-700";
}

export default function TIRCarnets() {
  const [items, setItems] = useState<TirCarnet[]>(() => loadItems());
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    carnetNumber: "",
    vehiclePlate: "",
    route: "",
    issueDate: "",
    expiryDate: "",
    status: "active" as TirCarnet["status"],
    note: "",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return items;

    return items.filter((item) =>
      [
        item.carnetNumber,
        item.vehiclePlate,
        item.route,
        item.status,
        item.note ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [items, search]);

  function resetForm() {
    setForm({
      carnetNumber: "",
      vehiclePlate: "",
      route: "",
      issueDate: "",
      expiryDate: "",
      status: "active",
      note: "",
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.carnetNumber.trim() || !form.vehiclePlate.trim()) {
      alert("TIR Carnet raqami va transport davlat raqamini kiriting.");
      return;
    }

    const newItem: TirCarnet = {
      id: crypto.randomUUID(),
      carnetNumber: form.carnetNumber.trim(),
      vehiclePlate: form.vehiclePlate.trim().toUpperCase(),
      route: form.route.trim(),
      issueDate: form.issueDate,
      expiryDate: form.expiryDate,
      status: form.status,
      note: form.note.trim() || undefined,
    };

    const next = [newItem, ...items];
    setItems(next);
    saveItems(next);
    resetForm();
    setShowForm(false);
  }

  function handleDelete(id: string) {
    const ok = confirm("Ushbu TIR Carnet yozuvini o‘chirmoqchimisiz?");
    if (!ok) return;

    const next = items.filter((item) => item.id !== id);
    setItems(next);
    saveItems(next);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="TIR Carnet"
        description="Xalqaro tashuvlarda foydalaniladigan TIR Carnet hujjatlarini alohida nazorat qiling."
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1 h-4 w-4" />
            TIR Carnet qo‘shish
          </Button>
        }
      />

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yangi TIR Carnet qo‘shish</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  TIR Carnet raqami
                </label>
                <Input
                  value={form.carnetNumber}
                  onChange={(e) => setForm((p) => ({ ...p, carnetNumber: e.target.value }))}
                  placeholder="Masalan: XH 12345678"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Transport davlat raqami
                </label>
                <Input
                  value={form.vehiclePlate}
                  onChange={(e) => setForm((p) => ({ ...p, vehiclePlate: e.target.value }))}
                  placeholder="Masalan: 01A123BC"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Yo‘nalish
                </label>
                <Input
                  value={form.route}
                  onChange={(e) => setForm((p) => ({ ...p, route: e.target.value }))}
                  placeholder="Masalan: Toshkent — Istanbul"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Holati
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, status: e.target.value as TirCarnet["status"] }))
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="active">Faol</option>
                  <option value="used">Yopilgan</option>
                  <option value="expired">Muddati o‘tgan</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Berilgan sana
                </label>
                <Input
                  type="date"
                  value={form.issueDate}
                  onChange={(e) => setForm((p) => ({ ...p, issueDate: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Amal qilish muddati
                </label>
                <Input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Izoh
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                  placeholder="Qo‘shimcha izoh..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex gap-2 md:col-span-2">
                <Button type="submit">Saqlash</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                >
                  Bekor qilish
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="TIR raqami, transport yoki yo‘nalish bo‘yicha qidirish..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="TIR Carnet yozuvlari mavjud emas"
          description="Yangi TIR Carnet qo‘shish orqali xalqaro tashuv hujjatlarini alohida nazorat qiling."
          action={
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-1 h-4 w-4" />
              TIR Carnet qo‘shish
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{item.carnetNumber}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass(
                        item.status,
                      )}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5" />
                      {item.vehiclePlate}
                    </span>
                    {item.route ? <span>{item.route}</span> : null}
                    {item.expiryDate ? (
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {item.expiryDate}
                      </span>
                    ) : null}
                  </div>

                  {item.note ? <p className="text-sm text-muted-foreground">{item.note}</p> : null}
                </div>

                <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  O‘chirish
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}