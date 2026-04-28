import { useEffect, useState } from "react";
import {
  ExternalLink,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  createAd,
  deleteAd,
  getActiveAds,
  getAllAdsForAdmin,
  updateAd,
  type AdItem,
  type AdPlacement,
  type SaveAdPayload,
} from "@/lib/ads-api";

type FormState = {
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  placement: AdPlacement;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  sortOrder: number;
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  imageUrl: "",
  targetUrl: "",
  placement: "ads-page",
  isActive: true,
  startsAt: "",
  endsAt: "",
  sortOrder: 0,
};

function toInputDateTime(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

function toPayload(form: FormState): SaveAdPayload {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    imageUrl: form.imageUrl.trim(),
    targetUrl: form.targetUrl.trim() || null,
    placement: form.placement,
    isActive: form.isActive,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    sortOrder: Number(form.sortOrder) || 0,
  };
}

function placementLabel(placement: AdPlacement) {
  if (placement === "dashboard") return "Dashboard";
  if (placement === "ads-page") return "Reklama sahifasi";
  return "Barcha joylarda";
}

export default function Ads() {
  const { principal } = useAuth();
  const token = useAuth((s) => s.token);

  const isAdmin = principal?.role === "admin";

  const [ads, setAds] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  async function loadAds() {
    try {
      setLoading(true);

      const data = isAdmin
        ? await getAllAdsForAdmin(token)
        : await getActiveAds(token, "ads-page");

      setAds(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reklamalarni yuklab bo‘lmadi";
      toast({
        title: "Xatolik",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, token]);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(item: AdItem) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description ?? "",
      imageUrl: item.imageUrl,
      targetUrl: item.targetUrl ?? "",
      placement: item.placement,
      isActive: item.isActive,
      startsAt: toInputDateTime(item.startsAt),
      endsAt: toInputDateTime(item.endsAt),
      sortOrder: item.sortOrder,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isAdmin) return;

    if (!form.title.trim()) {
      toast({
        title: "Sarlavha kiritilmagan",
        variant: "destructive",
      });
      return;
    }

    if (!form.imageUrl.trim()) {
      toast({
        title: "Rasm URL kiritilmagan",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const payload = toPayload(form);

      if (editingId) {
        await updateAd(token, editingId, payload);
        toast({ title: "Reklama yangilandi" });
      } else {
        await createAd(token, payload);
        toast({ title: "Reklama qo‘shildi" });
      }

      resetForm();
      await loadAds();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reklamani saqlab bo‘lmadi";
      toast({
        title: "Xatolik",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!isAdmin) return;

    const ok = window.confirm("Bu reklamani o‘chirmoqchimisiz?");
    if (!ok) return;

    try {
      await deleteAd(token, id);
      toast({ title: "Reklama o‘chirildi" });
      await loadAds();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reklamani o‘chirib bo‘lmadi";
      toast({
        title: "Xatolik",
        description: message,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? "Reklama boshqaruvi" : "Reklama"}
        description={
          isAdmin
            ? "Platformadagi bannerlar va reklama joylashuvlarini boshqaring."
            : "NAZORAT 24 platformasidagi faol reklama bannerlari."
        }
      />

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? "Reklamani tahrirlash" : "Yangi reklama qo‘shish"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Sarlavha
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  placeholder="Masalan: NAZORAT 24 Telegram bot"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Rasm URL
                </label>
                <input
                  value={form.imageUrl}
                  onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  placeholder="/ads/nazorat24-telegram.jpg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Izoh
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Qisqa reklama matni..."
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Yo‘naltirish havolasi
                </label>
                <input
                  value={form.targetUrl}
                  onChange={(e) => setForm((p) => ({ ...p, targetUrl: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Joylashuv
                </label>
                <select
                  value={form.placement}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      placement: e.target.value as AdPlacement,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="dashboard">Dashboard</option>
                  <option value="ads-page">Reklama sahifasi</option>
                  <option value="all">Barcha joylarda</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Boshlanish vaqti
                </label>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Tugash vaqti
                </label>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Tartib raqami
                </label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      sortOrder: Number(e.target.value) || 0,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  id="ad-active"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      isActive: e.target.checked,
                    }))
                  }
                />
                <label htmlFor="ad-active" className="text-sm font-medium">
                  Aktiv holatda
                </label>
              </div>

              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-1 h-4 w-4" />
                  )}
                  {editingId ? "Yangilash" : "Saqlash"}
                </Button>

                <Button type="button" variant="outline" onClick={resetForm}>
                  Tozalash
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isAdmin ? "Mavjud reklamalar" : "Faol reklama bannerlari"}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Yuklanmoqda...
            </div>
          ) : ads.length === 0 ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center">
              <Megaphone className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Hozircha reklama mavjud emas</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Admin yangi reklama qo‘shgandan keyin shu yerda ko‘rinadi.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ads.map((ad) => (
                <div key={ad.id} className="overflow-hidden rounded-xl border bg-card">
                  <div className="aspect-[16/9] bg-muted">
                    <img
                      src={ad.imageUrl}
                      alt={ad.title}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="space-y-3 p-4">
                    <div>
                      <p className="font-semibold">{ad.title}</p>
                      {ad.description ? (
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {ad.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border px-2 py-1">
                        {placementLabel(ad.placement)}
                      </span>
                      <span className="rounded-full border px-2 py-1">
                        {ad.isActive ? "Aktiv" : "Nofaol"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {ad.targetUrl ? (
                        <a
                          href={ad.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Ochish
                        </a>
                      ) : null}

                      {isAdmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(ad)}
                            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
                          >
                            <Pencil className="h-4 w-4" />
                            Tahrirlash
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDelete(ad.id)}
                            className="inline-flex items-center gap-2 rounded-md border border-rose-300 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            O‘chirish
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}