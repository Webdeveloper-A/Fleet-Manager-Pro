import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck,
  LinkIcon,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Unlink,
} from "lucide-react";
import { useListVehicles, getListVehiclesQueryKey } from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { DataPagination } from "@/components/DataPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  assignTirCarnetToVehicle,
  createTirCarnet,
  deleteTirCarnet,
  listTirCarnets,
  updateTirCarnet,
  type AssignmentFilter,
  type TirCarnet,
  type TirCarnetPayload,
  type TirCarnetStatus,
} from "@/lib/tir-carnets-api";

const PAGE_SIZE = 15;

type FormState = {
  carnetNumber: string;
  route: string;
  issueDate: string;
  expiryDate: string;
  status: TirCarnetStatus;
  note: string;
};

const FILTERS: Array<{ value: AssignmentFilter; label: string }> = [
  { value: "all", label: "Barchasi" },
  { value: "assigned", label: "Biriktirilganlar" },
  { value: "unassigned", label: "Biriktirilmaganlar" },
];

function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return v;
}

function emptyForm(): FormState {
  return {
    carnetNumber: "",
    route: "",
    issueDate: "",
    expiryDate: "",
    status: "active",
    note: "",
  };
}

function statusLabel(status: TirCarnetStatus | string) {
  if (status === "expired") return "Muddati o‘tgan";
  if (status === "used") return "Yopilgan";
  return "Faol";
}

function statusClass(status: TirCarnetStatus | string) {
  if (status === "expired") return "bg-red-100 text-red-700";
  if (status === "used") return "bg-slate-100 text-slate-700";
  return "bg-emerald-100 text-emerald-700";
}

function dateLabel(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("uz-UZ");
}

function daysLeft(value?: string | null) {
  if (!value) return null;

  const today = new Date();
  const end = new Date(value);
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return Math.ceil((end.getTime() - today.getTime()) / 86400000);
}

function expiryBadge(value?: string | null) {
  const days = daysLeft(value);

  if (days === null) {
    return <span className="text-sm text-muted-foreground">Muddat kiritilmagan</span>;
  }

  if (days < 0) {
    return (
      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
        {Math.abs(days)} kun o‘tgan
      </span>
    );
  }

  if (days <= 7) {
    return (
      <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">
        {days} kun qoldi
      </span>
    );
  }

  if (days <= 30) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
        {days} kun qoldi
      </span>
    );
  }

  return (
    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
      {days} kun qoldi
    </span>
  );
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function buildPayload(form: FormState): TirCarnetPayload {
  return {
    carnetNumber: form.carnetNumber.trim(),
    route: form.route.trim() || null,
    issueDate: form.issueDate || null,
    expiryDate: form.expiryDate || null,
    status: form.status,
    note: form.note.trim() || null,
  };
}

export default function TIRCarnets() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput);
  const [status, setStatus] = useState("all");
  const [vehicleId, setVehicleId] = useState("all");
  const [assignment, setAssignment] = useState<AssignmentFilter>("all");
  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TirCarnet | null>(null);
  const [deleting, setDeleting] = useState<TirCarnet | null>(null);

  const [assigning, setAssigning] = useState<TirCarnet | null>(null);
  const [assignVehicleId, setAssignVehicleId] = useState("");

  const [form, setForm] = useState<FormState>(() => emptyForm());

  useEffect(() => {
    setPage(1);
  }, [search, status, vehicleId, assignment]);

  const params = useMemo(
    () => ({
      search: search || undefined,
      status: status === "all" ? undefined : status,
      vehicleId: vehicleId === "all" ? undefined : vehicleId,
      assignment,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, status, vehicleId, assignment, page],
  );

  const listQuery = useQuery({
    queryKey: ["tir-carnets", params],
    queryFn: () => listTirCarnets(token, params),
    enabled: !!token,
  });

  const countBase = useMemo(
    () => ({
      search: search || undefined,
      status: status === "all" ? undefined : status,
      vehicleId: vehicleId === "all" ? undefined : vehicleId,
      page: 1,
      pageSize: 1,
    }),
    [search, status, vehicleId],
  );

  const allCount = useQuery({
    queryKey: ["tir-carnets-count", "all", countBase],
    queryFn: () => listTirCarnets(token, { ...countBase, assignment: "all" }),
    enabled: !!token,
  });

  const assignedCount = useQuery({
    queryKey: ["tir-carnets-count", "assigned", countBase],
    queryFn: () => listTirCarnets(token, { ...countBase, assignment: "assigned" }),
    enabled: !!token,
  });

  const unassignedCount = useQuery({
    queryKey: ["tir-carnets-count", "unassigned", countBase],
    queryFn: () => listTirCarnets(token, { ...countBase, assignment: "unassigned" }),
    enabled: !!token,
  });

  const vehiclesQuery = useListVehicles(
    { pageSize: 100 },
    { query: { queryKey: getListVehiclesQueryKey({ pageSize: 100 }) } },
  );

  const vehicles = vehiclesQuery.data?.items ?? [];

  const createMutation = useMutation({
    mutationFn: (data: TirCarnetPayload) => createTirCarnet(token, data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tir-carnets"] });
      toast({ title: "TIR Carnet qo‘shildi" });
      closeDialog();
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "TIR Carnet qo‘shib bo‘lmadi";
      toast({ title: "Xatolik", description: message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TirCarnetPayload> }) =>
      updateTirCarnet(token, id, data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tir-carnets"] });
      toast({ title: "TIR Carnet yangilandi" });
      closeDialog();
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "TIR Carnet yangilab bo‘lmadi";
      toast({ title: "Xatolik", description: message, variant: "destructive" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, selectedVehicleId }: { id: string; selectedVehicleId: string }) =>
      assignTirCarnetToVehicle(token, id, selectedVehicleId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tir-carnets"] });
      toast({ title: "TIR Carnet transportga biriktirildi" });
      setAssigning(null);
      setAssignVehicleId("");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "TIR Carnetni biriktirib bo‘lmadi";
      toast({ title: "Xatolik", description: message, variant: "destructive" });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (id: string) => updateTirCarnet(token, id, { vehicleId: null }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tir-carnets"] });
      toast({ title: "TIR Carnet transportdan ajratildi" });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Transportdan ajratib bo‘lmadi";
      toast({ title: "Xatolik", description: message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTirCarnet(token, id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tir-carnets"] });
      toast({ title: "TIR Carnet o‘chirildi" });
      setDeleting(null);
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "TIR Carnet o‘chirib bo‘lmadi";
      toast({ title: "Xatolik", description: message, variant: "destructive" });
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(item: TirCarnet) {
    setEditing(item);
    setForm({
      carnetNumber: item.carnetNumber,
      route: item.route ?? "",
      issueDate: toDateInput(item.issueDate),
      expiryDate: toDateInput(item.expiryDate),
      status: item.status,
      note: item.note ?? "",
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.carnetNumber.trim()) {
      toast({ title: "TIR Carnet raqami kiritilmagan", variant: "destructive" });
      return;
    }

    const payload = buildPayload(form);

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;

  const countMap: Record<AssignmentFilter, number> = {
    all: allCount.data?.total ?? 0,
    assigned: assignedCount.data?.total ?? 0,
    unassigned: unassignedCount.data?.total ?? 0,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="TIR Carnet"
        description="TIR Carnetlar avval alohida qo‘shiladi, keyin kerakli transport vositasiga biriktiriladi."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            TIR Carnet qo‘shish
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item.value}
            type="button"
            variant={assignment === item.value ? "default" : "outline"}
            onClick={() => setAssignment(item.value)}
            className="rounded-full"
          >
            {item.label}
            <span className="ml-2 rounded-full bg-background/20 px-2 py-0.5 text-xs">
              {countMap[item.value]}
            </span>
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="TIR raqami, yo‘nalish yoki transport bo‘yicha qidirish..."
            className="pl-9"
          />
        </div>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Holat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha holatlar</SelectItem>
            <SelectItem value="active">Faol</SelectItem>
            <SelectItem value="used">Yopilgan</SelectItem>
            <SelectItem value="expired">Muddati o‘tgan</SelectItem>
          </SelectContent>
        </Select>

        <Select value={vehicleId} onValueChange={setVehicleId}>
          <SelectTrigger>
            <SelectValue placeholder="Transport" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha transportlar</SelectItem>
            {vehicles.map((vehicle) => (
              <SelectItem key={vehicle.id} value={vehicle.id}>
                {vehicle.name} {vehicle.plateNumber ? `— ${vehicle.plateNumber}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {listQuery.isLoading ? (
        <Card>
          <CardContent className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={
            assignment === "assigned"
              ? "Transportga biriktirilgan TIR Carnetlar mavjud emas"
              : assignment === "unassigned"
                ? "Biriktirilmagan TIR Carnetlar mavjud emas"
                : "TIR Carnet yozuvlari mavjud emas"
          }
          description="TIR Carnet qo‘shing yoki mavjud yozuvni transportga biriktiring."
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" />
              TIR Carnet qo‘shish
            </Button>
          }
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>TIR raqami</TableHead>
                    <TableHead>Yo‘nalish</TableHead>
                    <TableHead>Transport</TableHead>
                    <TableHead>Amal qilish muddati</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-semibold">{item.carnetNumber}</TableCell>
                      <TableCell>{item.route || "—"}</TableCell>

                      <TableCell>
                        {item.vehicleId ? (
                          <div className="flex flex-col">
                            <span>{item.vehicleName ?? "Noma’lum transport"}</span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {item.vehiclePlateNumber ?? ""}
                            </span>
                          </div>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                            Biriktirilmagan
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{dateLabel(item.expiryDate)}</span>
                          {expiryBadge(item.expiryDate)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(
                            item.status,
                          )}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setAssigning(item);
                                setAssignVehicleId(item.vehicleId ?? "");
                              }}
                            >
                              <LinkIcon className="mr-2 h-4 w-4" />
                              {item.vehicleId ? "Biriktirishni o‘zgartirish" : "Transportga biriktirish"}
                            </DropdownMenuItem>

                            {item.vehicleId ? (
                              <DropdownMenuItem
                                onClick={() => unassignMutation.mutate(item.id)}
                              >
                                <Unlink className="mr-2 h-4 w-4" />
                                Transportdan ajratish
                              </DropdownMenuItem>
                            ) : null}

                            <DropdownMenuItem onClick={() => openEdit(item)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Tahrirlash
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="text-rose-600 focus:text-rose-600"
                              onClick={() => setDeleting(item)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              O‘chirish
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <DataPagination
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "TIR Carnetni tahrirlash" : "Yangi TIR Carnet qo‘shish"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                TIR Carnet raqami
              </label>
              <Input
                value={form.carnetNumber}
                onChange={(e) => setForm((p) => ({ ...p, carnetNumber: e.target.value }))}
                placeholder="Masalan: XH12345678"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Holati
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({ ...p, status: e.target.value as TirCarnetStatus }))
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
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="ghost" onClick={closeDialog}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Saqlash"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!assigning} onOpenChange={(open) => !open && setAssigning(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>TIR Carnetni transportga biriktirish</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{assigning?.carnetNumber}</p>
              <p className="text-muted-foreground">{assigning?.route || "Yo‘nalish ko‘rsatilmagan"}</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Transport tanlang
              </label>
              <select
                value={assignVehicleId}
                onChange={(e) => setAssignVehicleId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Transport tanlang</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} {vehicle.plateNumber ? `— ${vehicle.plateNumber}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssigning(null)}>
              Bekor qilish
            </Button>
            <Button
              disabled={!assignVehicleId || assignMutation.isPending}
              onClick={() => {
                if (!assigning || !assignVehicleId) return;
                assignMutation.mutate({
                  id: assigning.id,
                  selectedVehicleId: assignVehicleId,
                });
              }}
            >
              {assignMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Biriktirish"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>TIR Carnet o‘chirilsinmi?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.carnetNumber} yozuvi database’dan butunlay o‘chiriladi.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-600/90"
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "O‘chirish"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}