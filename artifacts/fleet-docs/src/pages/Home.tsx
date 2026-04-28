import { Link } from "wouter";
import {
  ArrowRight,
  Bell,
  Bot,
  FileText,
  MapPin,
  ShieldCheck,
  Truck,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Truck,
    title: "Transport nazorati",
    text: "Avtotransport vositalari, davlat raqamlari, hujjatlar va holatlarni yagona tizimda boshqaring.",
  },
  {
    icon: FileText,
    title: "Hujjatlar boshqaruvi",
    text: "Sug‘urta, texnik ko‘rik, litsenziya, TIR Carnet va Dazvol hujjatlarini nazorat qiling.",
  },
  {
    icon: Bell,
    title: "Muddat ogohlantirishlari",
    text: "Muddati yaqinlashayotgan yoki o‘tgan hujjatlar bo‘yicha avtomatik ogohlantirish oling.",
  },
  {
    icon: Bot,
    title: "Telegram integratsiya",
    text: "Kompaniya o‘z Telegram botiga ulanadi va xabarlarni real vaqtda qabul qiladi.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050b1a] text-white">
      <header className="border-b border-white/10 bg-[#050b1a]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/branding/nazorat24-logo.png"
              alt="NAZORAT 24"
              className="h-11 w-11 rounded-xl object-cover"
            />
            <div>
              <p className="text-lg font-bold leading-none">
                NAZORAT <span className="text-sky-400">24</span>
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">
                Logistika nazorati
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                Kirish
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute left-1/2 top-20 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute right-10 top-40 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:py-24">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm text-sky-200">
                <ShieldCheck className="h-4 w-4" />
                Transport va hujjat boshqaruvi platformasi
              </div>

              <h1 className="max-w-2xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                NAZORAT <span className="text-sky-400">24</span> — logistika va transport nazorati markazi
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
                Transportlar, TIR Carnet, Dazvollar, hujjatlar, muddatlar va Telegram
                ogohlantirishlarini bitta zamonaviy tizimda boshqaring.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login">
                  <Button className="bg-sky-500 text-white hover:bg-sky-400">
                    Platformaga kirish
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                <a href="#features">
                  <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                    Imkoniyatlarni ko‘rish
                  </Button>
                </a>
              </div>

              <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-2xl font-bold text-white">24/7</p>
                  <p className="mt-1 text-xs text-slate-400">nazorat</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-2xl font-bold text-white">TIR</p>
                  <p className="mt-1 text-xs text-slate-400">Carnet</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-2xl font-bold text-white">BOT</p>
                  <p className="mt-1 text-xs text-slate-400">Telegram</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-sky-950/50">
                <img
                  src="/ads/nazorat24-platform.jpg"
                  alt="NAZORAT 24 platformasi"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="absolute -bottom-6 -left-4 hidden max-w-sm rounded-2xl border border-white/10 bg-[#071126]/95 p-4 shadow-xl backdrop-blur sm:block">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Real vaqt nazorati</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      Transport va hujjatlar holatini doimiy kuzatish imkoniyati.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-5 py-12">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-400">
              Platforma imkoniyatlari
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              Logistika jarayonlarini boshqarish uchun asosiy modullar
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-sky-400/40 hover:bg-white/[0.06]"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-400">{feature.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 px-5 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
              <Workflow className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold">Barchasi bitta tizimda</h2>
            <p className="mt-4 leading-8 text-slate-300">
              NAZORAT 24 kompaniyalarga transportlar, yuk jarayonlari, TIR Carnet,
              Dazvol, hujjatlar va bildirishnomalarni tartibli boshqarishga yordam beradi.
            </p>

            <div className="mt-6">
              <Link href="/login">
                <Button className="bg-emerald-500 text-white hover:bg-emerald-400">
                  Ishni boshlash
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
            <img
              src="/ads/nazorat24-telegram.jpg"
              alt="NAZORAT 24 Telegram bot"
              className="h-full w-full object-cover"
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-5 py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} NAZORAT 24. Barcha huquqlar himoyalangan.</p>
          <p>Track · Monitor · Deliver</p>
        </div>
      </footer>
    </div>
  );
}