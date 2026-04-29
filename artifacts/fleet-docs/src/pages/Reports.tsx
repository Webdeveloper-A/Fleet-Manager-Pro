import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download, FileText, Loader2, Truck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import {
  dateLabel,
downloadCsv,
getDocumentExpiry,
isExpired,
isExpiringSoon,
loadOperationsData,
} from "@/lib/operations-api";

function ReportCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof Truck;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const token = useAuth((s) => s.token);

  const query = useQuery({
    queryKey: ["reports"],
    queryFn: () => loadOperationsData(token),
    enabled: !!token,
  });

  const data = query.data;

  const summary = useMemo(() => {
    const vehicles = data?.vehicles ?? [];
    const documents = data?.documents ?? [];
    const tir = data?.tirCarnets ?? [];
    const dazvols = data?.dazvols ?? [];

    const expiryItems = [
     ...documents.map((item) => getDocumentExpiry(item)),
      ...tir.map((item) => item.expiryDate),
      ...dazvols.map((item) => item.expiryDate),
    ];

    return {
      vehicles: vehicles.length,
      documents: documents.length,
      tir: tir.length,
      dazvols: dazvols.length,
      expiring: expiryItems.filter((date) => isExpiringSoon(date, 30)).length,
      expired: expiryItems.filter((date) => isExpired(date)).length,
      unassignedTir: tir.filter((item) => !item.vehicleId).length,
      unassignedDazvols: dazvols.filter((item) => !item.vehicleId).length,
    };
  }, [data]);

  function exportVehicles() {
    downloadCsv(
      "vehicles-report.csv",
      (data?.vehicles ?? []).map((item) => ({
        ID: item.id,
        Nomi: item.name,
        Raqami: item.plateNumber,
        Status: item.status,
        Yaratilgan: dateLabel(item.createdAt),
      })),
    );
  }

  function exportTir() {
    downloadCsv(
      "tir-carnets-report.csv",
      (data?.tirCarnets ?? []).map((item) => ({
        ID: item.id,
        "TIR raqami": item.carnetNumber,
        "Yo‘nalish": item.route,
        Transport: item.vehicleName || item.vehiclePlateNumber || "Biriktirilmagan",
        "Amal muddati": dateLabel(getDocumentExpiry(item)),
        Status: item.status,
      })),
    );
  }

  function exportDazvols() {
    downloadCsv(
      "dazvols-report.csv",
      (data?.dazvols ?? []).map((item) => ({
        ID: item.id,
        "Dazvol raqami": item.permitNumber,
        Davlat: item.country,
        Turi: item.permitType,
        Transport: item.vehicleName || item.vehiclePlateNumber || "Biriktirilmagan",
        "Amal muddati": dateLabel(item.expiryDate),
        Status: item.status,
      })),
    );
  }

  function exportDocuments() {
    downloadCsv(
      "documents-report.csv",
      (data?.documents ?? []).map((item) => ({
        ID: item.id,
        Nomi: item.title || item.name,
        Turi: item.documentType || item.type,
        Transport: item.vehicleName || item.vehiclePlateNumber,
        "Amal muddati": dateLabel(item.expiryDate),
        Status: item.status,
      })),
    );
  }

  if (query.isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
        Hisobot ma’lumotlarini yuklab bo‘lmadi.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hisobotlar"
        description="Transportlar, hujjatlar, TIR Carnet va Dazvollar bo‘yicha umumiy hisobotlar."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportCard title="Transportlar" value={summary.vehicles} description="Jami transportlar" icon={Truck} />
        <ReportCard title="Hujjatlar" value={summary.documents} description="Jami hujjatlar" icon={FileText} />
        <ReportCard title="TIR Carnet" value={summary.tir} description="Jami TIR Carnetlar" icon={BarChart3} />
        <ReportCard title="Dazvollar" value={summary.dazvols} description="Jami Dazvollar" icon={BarChart3} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Operatsion ko‘rsatkichlar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Muddati yaqin</p>
              <p className="mt-2 text-2xl font-bold">{summary.expiring}</p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Muddati o‘tgan</p>
              <p className="mt-2 text-2xl font-bold">{summary.expired}</p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Biriktirilmagan TIR</p>
              <p className="mt-2 text-2xl font-bold">{summary.unassignedTir}</p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Biriktirilmagan Dazvol</p>
              <p className="mt-2 text-2xl font-bold">{summary.unassignedDazvols}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={exportVehicles}>
            <Download className="mr-2 h-4 w-4" />
            Transportlar CSV
          </Button>

          <Button variant="outline" onClick={exportDocuments}>
            <Download className="mr-2 h-4 w-4" />
            Hujjatlar CSV
          </Button>

          <Button variant="outline" onClick={exportTir}>
            <Download className="mr-2 h-4 w-4" />
            TIR Carnet CSV
          </Button>

          <Button variant="outline" onClick={exportDazvols}>
            <Download className="mr-2 h-4 w-4" />
            Dazvol CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}