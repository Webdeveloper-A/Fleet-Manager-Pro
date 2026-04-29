import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LinkIcon,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  ScrollText,
  Search,
  Trash2,
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
  assignDazvolToVehicle,
  createDazvol,
  deleteDazvol,
  listDazvols,
  updateDazvol,
  type Dazvol,
  type DazvolPayload,
  type DazvolPermitType,
  type DazvolStatus,
} from "@/lib/dazvols-api";

const PAGE_SIZE = 15;

type FormState = {
  permitNumber: string;
  country: string;
  permitType: DazvolPermitType;
  issueDate: string;
  expiryDate: string;
  status: DazvolStatus;
  note: string;
};

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
    permitNumber: "",
    country: "",
    permitType: "bilateral",
    issueDate: "",
    expiryDate: "",
    status: "active",
    note: "",
  };
}

function permitTypeLabel(type: DazvolPermitType | string) {
  if (type === "bilateral") return "Ikki tomonlama";
  if (type === "transit") return "Tranzit";
  if (type === "third_country") return "Uchinchi davlat";
  return "Maxsus";
}

function statusLabel(status: DazvolStatus | string) {
  if (status === "expired") return "Muddati o‘tgan";
  if (status === "used") return "Foydalanilgan";
  return "Faol";
}

function statusClass(status: DazvolStatus | string) {
  if (status === "expired") return "bg-red-100 text-red-700";
  if (status === "used") return "bg-slate-100 text-slate-700";
  return "bg-emerald-100 text-emerald-700";
}

function dateLabel(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("uz-UZ");
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function buildPayload(form: FormState): DazvolPayload {
  return {
    permitNumber: form.permitNumber.trim(),
    country: form.country.trim(),
    permitType: form.permitType,
    issueDate: form.issueDate || null,
    expiryDate: form.expiryDate || null,
    status: form.status,
    note: form.note.trim() || null,
    vehicleId: null,
  };
}

export default function Dazvols() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput);
  const [status, setStatus] = useState("all");
  const [vehicleId, setVehicleId] = useState("all");
  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Dazvol | null>(null);
  const [deleting, setDeleting] = useState<Dazvol | null>(null);

  const [assigning, setAssigning] = useState<Dazvol | null>(null);
  const [assignVehicleId, setAssignVehicleId] = useState("");

  const [form, setForm] = useState<FormState>(() => emptyForm());

  useEffect(() => {
    setPage(1);
  }, [search, status, vehicleId]);

  const params = useMemo(
    () => ({
      search: search || undefined,
      status: status === "all" ? undefined : status,
      vehicleId: vehicleId === "all" ? undefined : vehicleId,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, status, vehicleId, page],
  );

  const listQuery = useQuery({
    queryKey: ["dazvols", params],
    queryFn: () => listDazvols(token, params),
    enabled: !!token,
  });

  const vehiclesQuery = useListVehicles(
    { pageSize: 100 },
    { query: { queryKey: getListVehiclesQueryKey({ pageSize: 100 }) } },
  );

  const vehicles = vehiclesQuery.data?.items ?? [];

  const createMutation = useMutation({
    mutationFn: (data: DazvolPayload) => createDazvol(token, data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["dazvols"] });
      toast({ title: "Dazvol qo‘shildi" });
      closeDialog();
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Dazvol qo‘shib bo‘lmadi";
      toast({ title: "Xatolik", description: message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DazvolPayload> }) =>
      updateDazvol(token, id, data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["dazvols"] });
      toast({ title: "Dazvol yangilandi" });
      closeDialog();
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Dazvol yangilab bo‘lmadi";
      toast({ title: "Xatolik", description: message, variant: "destructive" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, selectedVehicleId }: { id: string; selectedVehicleId: string }) =>
      assignDazvolToVehicle(token, id, selectedVehicleId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["dazvols"] });
      toast({ title: "Dazvol transportga biriktirildi" });
      setAssigning(null);
      setAssignVehicleId("");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Dazvolni biriktirib bo‘lmadi";
      toast({ title: "Xatolik", description: message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDazvol(token, id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["dazvols"] });
      toast({ title: "Dazvol o‘chirildi" });
      setDeleting(null);
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Dazvol o‘chirib bo‘lmadi";
      toast({ title: "Xatolik", description: message, variant: "destructive" });
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(item: Dazvol) {
    setEditing(item);
    setForm({
      permitNumber: item.permitNumber,
      country: item.country,
      permitType: item.permitType,
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

    if (!form.permitNumber.trim() || !form.country.trim()) {
      toast({
        title: "Ma’lumot yetarli emas",
        description: "Dazvol raqami va davlat nomini kiriting.",
        variant: "destructive",
      });
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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dazvollar"
        description="Dazvol avval alohida qo‘shiladi, keyin kerakli transportga biriktiriladi."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Dazvol qo‘shish
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Dazvol raqami yoki davlat..."
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
            <SelectItem value="used">Foydalanilgan</SelectItem>
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
          icon={ScrollText}
          title="Dazvol yozuvlari mavjud emas"
          description="Avval Dazvol qo‘shing, keyin uni transportga biriktiring."
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" />
              Dazvol qo‘shish
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
                    <TableHead>Dazvol</TableHead>
                    <TableHead>Davlat</TableHead>
                    <TableHead>Turi</TableHead>
                    <TableHead>Biriktirilgan transport</TableHead>
                    <TableHead>Amal muddati</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.permitNumber}</TableCell>
                      <TableCell>{item.country}</TableCell>
                      <TableCell>{permitTypeLabel(item.permitType)}</TableCell>

                      <TableCell>
                        {item.vehicleId ? (
                          <div className="flex flex-col">
                            <span>{item.vehicleName ?? "Noma’lum"}</span>
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

                      <TableCell>{dateLabel(item.expiryDate)}</TableCell>

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
                              Transportga biriktirish
                            </DropdownMenuItem>

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
            <DialogTitle>{editing ? "Dazvolni tahrirlash" : "Yangi Dazvol qo‘shish"}</DialogTitle>
          </DialogHeader>

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
                Ruxsatnoma turi
              </label>
              <select
                value={form.permitType}
                onChange={(e) =>
                  setForm((p) => ({ ...p, permitType: e.target.value as DazvolPermitType }))
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
                Holati
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({ ...p, status: e.target.value as DazvolStatus }))
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="active">Faol</option>
                <option value="used">Foydalanilgan</option>
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
            <DialogTitle>Dazvolni transportga biriktirish</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{assigning?.permitNumber}</p>
              <p className="text-muted-foreground">
                {assigning?.country} — {assigning ? permitTypeLabel(assigning.permitType) : ""}
              </p>
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
            <AlertDialogTitle>Dazvol o‘chirilsinmi?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.permitNumber} yozuvi database’dan butunlay o‘chiriladi.
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