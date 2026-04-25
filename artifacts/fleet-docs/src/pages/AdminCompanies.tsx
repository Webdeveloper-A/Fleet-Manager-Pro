import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCompanies,
  useCreateCompany,
  useDeleteCompany,
  getListCompaniesQueryKey,
  type Company,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { DataPagination } from "@/components/DataPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Search, Building2, Trash2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

const PAGE_SIZE = 15;

function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function AdminCompanies() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const params = useMemo(
    () => ({ search: search || undefined, page, pageSize: PAGE_SIZE }),
    [search, page],
  );
  const { data, isLoading } = useListCompanies(params, {
    query: { queryKey: getListCompaniesQueryKey(params) },
  });

  const create = useCreateCompany();
  const remove = useDeleteCompany();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    contactName: "",
    phone: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  function resetForm() {
    setForm({ name: "", email: "", password: "", contactName: "", phone: "" });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await create.mutateAsync({
        data: {
          name: form.name,
          email: form.email,
          password: form.password,
          contactName: form.contactName || undefined,
          phone: form.phone || undefined,
        },
      });
      await qc.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
      toast({ title: "Company created", description: `${res.name} can now sign in.` });
      setCreateOpen(false);
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create company";
      toast({ title: "Create failed", description: message, variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync({ id: deleteTarget.id });
      await qc.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
      toast({ title: "Company deleted" });
      setDeleteTarget(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast({ title: "Delete failed", description: message, variant: "destructive" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Companies"
        description={
          data
            ? `${data.total} company account${data.total === 1 ? "" : "s"} on the platform`
            : "Provision and manage tenant companies"
        }
        actions={
          <Button onClick={() => setCreateOpen(true)} data-testid="button-add-company">
            <Plus className="mr-1 h-4 w-4" />
            New company
          </Button>
        }
      />

      <div className="mb-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search companies…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            data-testid="input-search-companies"
          />
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={search ? "No matching companies" : "No companies yet"}
          description={
            search
              ? "Try a different search term."
              : "Provision the first company tenant to get started."
          }
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Add company
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
                    <TableHead>Company</TableHead>
                    <TableHead>Login email</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-center">Vehicles</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((c, i) => (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border/60"
                      data-testid={`row-company-${c.id}`}
                    >
                      <TableCell>
                        <div className="font-medium">{c.name}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.contactName || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.phone || "—"}
                      </TableCell>
                      <TableCell className="text-center text-sm">{c.vehicleCount}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(c.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(c)}
                          data-testid={`button-delete-company-${c.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <DataPagination
            total={data.total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}

      <Dialog open={createOpen} onOpenChange={(o) => (setCreateOpen(o), o || resetForm())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New company</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cname">Company name</Label>
              <Input
                id="cname"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Acme Logistics"
                data-testid="input-company-name"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cemail">Login email</Label>
                <Input
                  id="cemail"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ops@acme.com"
                  data-testid="input-company-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cpass">Initial password</Label>
                <Input
                  id="cpass"
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  data-testid="input-company-password"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cct">Contact name</Label>
                <Input
                  id="cct"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  data-testid="input-company-contact"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cph">Phone</Label>
                <Input
                  id="cph"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  data-testid="input-company-phone"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCreateOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending} data-testid="button-create-company">
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create company"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete company?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} will be permanently removed along with all its users, vehicles,
              and documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-600/90" onClick={handleDelete}>
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
