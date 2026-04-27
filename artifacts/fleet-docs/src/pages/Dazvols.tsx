import { useMemo, useState } from "react";
import { Plus, Search, ScrollText, CalendarClock, Truck, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";

type Dazvol = {
  id: string;
  permitNumber: string;
  country: string;
  vehiclePlate: string;
  permitType: "bilateral" | "transit" | "third_country" | "special";
  issueDate: string;
  expiryDate: string;
  status: "active" | "expired" | "used";
  note?: string;
};

const STORAGE_KEY = "fleet-docs-dazvols";

function loadItems(): Dazvol[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Dazvol[]) : [];
  } catch {
    return [];
  }
}

function saveItems(items: Dazvol[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function permitTypeLabel(type: Dazvol["permitType"]) {
  if (type === "bilateral") return "Ikki tomonlama";
  if (type === "transit") return "Tranzit";
  if (type === "third_country") return "Uchinchi davlat";
  return "Maxsus";
}

function statusLabel(status: Dazvol["status"]) {
  if (status === "expired") return "Muddati o‘tgan";
  if (status === "used") return "Foydalanilgan";
  return "Faol";
}

function statusClass(status: Dazvol["status"]) {
  if (status === "expired") return "bg-red-100 text-red-700";
  if (status === "used") return "bg-slate-100 text-slate-700";
  return "bg-emerald-100 text-emerald-700";
}

export default function Dazvols() {
  const [items, setItems] = useState<Dazvol[]>(() => loadItems());
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    permitNumber: "",
    country: "",
    vehiclePlate: "",
    permitType: "bilateral" as Dazvol["permitType"],
    issueDate: "",
    expiryDate: "",
    status: "active" as Dazvol["status"],
    note: "",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return items;

    return items.filter((item) =>
      [
        item.permitNumber,
        item.country,
        item.vehiclePlate,
        permitTypeLabel(item.permitType),
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
      permitNumber: "",
      country: "",
      vehiclePlate: "",
      permitType: "bilateral",
      issueDate: "",
      expiryDate: "",
      status: "active",
      note: "",
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.permitNumber.trim() || !form.country.trim()) {
      alert("Dazvol raqami va davlat nomini kiriting.");
      return;
    }

    const newItem: Dazvol = {
      id: crypto.randomUUID(),
      permitNumber: form.permitNumber.trim(),
      country: form.country.trim(),
      vehiclePlate: form.vehiclePlate.trim().toUpperCase(),
      permitType: form.permitType,
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
    const ok = confirm("Ushbu dazvol yozuvini o‘chirmoqchimisiz?");
    if (!ok) return;

    const next = items.filter((item) => item.id !== id);
    setItems(next);
    saveItems(next);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dazvollar"
        description="Xalqaro avtotashuv ruxsatnomalarini davlat, transport va amal qilish muddati bo‘yicha boshqaring."
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1 h-4 w-4" />
            Dazvol qo‘shish
          </Button>
        }
      />

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yangi dazvol qo‘shish</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Dazvol raqami
                </label>
                <Input
                  value={form.permitNumber}
                  onChange={(e) => setForm((p) => ({ ...p, permitNumber: e.target.value }))}
                  placeholder="Masalan: UZ-TR-2026-001"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Davlat
                </label>
                <Input
                  value={form.country}
                  onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                  placeholder="Masalan: Turkiya"
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
                  Ruxsatnoma turi
                </label>
                <select
                  value={form.permitType}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, permitType: e.target.value as Dazvol["permitType"] }))
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="bilateral">Ikki tomonlama</option>
                  <option value="transit">Tranzit</option>
                  <option value="third_country">Uchinchi davlat</option>
                  <option value="special">Maxsus</option>
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

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Holati
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, status: e.target.value as Dazvol["status"] }))
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="active">Faol</option>
                  <option value="used">Foydalanilgan</option>
                  <option value="expired">Muddati o‘tgan</option>
                </select>
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
              placeholder="Dazvol raqami, davlat yoki transport bo‘yicha qidirish..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Dazvol yozuvlari mavjud emas"
          description="Dazvollarni alohida ro‘yxatga olib, ularning amal qilish muddati va foydalanish holatini nazorat qiling."
          action={
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Dazvol qo‘shish
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
                    <p className="font-semibold">{item.permitNumber}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass(
                        item.status,
                      )}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span>{item.country}</span>
                    <span>{permitTypeLabel(item.permitType)}</span>
                    {item.vehiclePlate ? (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5" />
                        {item.vehiclePlate}
                      </span>
                    ) : null}
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