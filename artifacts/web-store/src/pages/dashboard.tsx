import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Package,
  Server,
  Crown,
  ArrowRight,
  Zap,
  Shield,
  Headphones,
  Star,
  MessageCircle,
} from "lucide-react";
import { AppLayout } from "../components/Layout/AppLayout";
import { BroadcastCard } from "../components/BroadcastCard";
import { useAuth } from "../contexts/AuthContext";
import {
  getProducts,
  getPanels,
  getUserTransactions,
  getApkMods,
  subscribeBroadcast,
} from "../lib/firestore";
import { getNokosServices, extractServices } from "../lib/nokos-api";
import type { BroadcastSetting } from "../types";

const card = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { userProfile } = useAuth();

  const [broadcastHome, setBroadcastHome] =
    useState<BroadcastSetting | null>(null);

  const [counts, setCounts] = useState({
    products: 0,
    panels: 0,
    transactions: 0,
    nokos: 0,
    apkMods: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) return;

    Promise.all([
      getProducts(),
      getPanels(),
      getUserTransactions(userProfile.id),
      getNokosServices(),
      getApkMods(),
    ]).then(([products, panels, txs, nokosRaw, apkMods]) => {
      setCounts({
        products: products.filter((p) => p.available !== false).length,
        panels: panels.filter((p) => p.available !== false).length,
        transactions: txs.length,
        nokos: extractServices(nokosRaw).length,
        apkMods: apkMods.filter((item) => item.available !== false).length,
      });

      setLoading(false);
    });
  }, [userProfile]);

  useEffect(() => {
    const unsub = subscribeBroadcast("broadcast_home", setBroadcastHome);
    return () => unsub();
  }, []);

  const isReseller =
    userProfile?.role === "reseller" || userProfile?.role === "admin";

  const adminWa = import.meta.env.VITE_ADMIN_WHATSAPP || "6285782544861";

  const statCards = [
    {
      label: "Apk premium",
      value: counts.products,
      icon: Package,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
      iconBg: "bg-emerald-100",
      href: "/products",
      desc: "Produk digital premium",
    },
    {
      label: "Panel Tersedia",
      value: counts.panels,
      icon: Server,
      color: "bg-blue-50 text-blue-600 border-blue-100",
      iconBg: "bg-blue-100",
      href: "/panels",
      desc: "Panel bot WhatsApp",
    },
    {
      label: "Layanan Nokos",
      value: counts.nokos,
      icon: MessageCircle,
      color: "bg-green-50 text-green-600 border-green-100",
      iconBg: "bg-green-100",
      href: "/nokos",
      desc: "Nokos Dari Berbagai Negara",
    },
    {
      label: "APK Mod",
      value: counts.apkMods,
      icon: Zap,
      color: "bg-pink-50 text-pink-600 border-pink-100",
      iconBg: "bg-pink-100",
      href: "/apk-mod",
      desc: "Download APK mod premium",
    },
  ];

  const features = [
    {
      icon: Shield,
      label: "Bergaransi",
      desc: "Semua produk bergaransi resmi",
    },
    {
      icon: Zap,
      label: "Proses Cepat",
      desc: "Pengiriman otomatis & instan",
    },
    {
      icon: Star,
      label: "Harga Terbaik",
      desc: "Harga murah & transparan",
    },
    {
      icon: Headphones,
      label: "Support 24/7",
      desc: "Admin siap membantu kamu",
    },
  ];

  return (
    <AppLayout title="Dashboard TrayaStore">
      <div className="space-y-6">
        <BroadcastCard broadcast={broadcastHome} />

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mint-gradient rounded-3xl p-5 border border-primary/15 shadow-sm relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-primary/8 -translate-y-8 translate-x-8" />

          <p className="text-sm text-primary/70 font-medium">
            Selamat datang kembali,
          </p>

          <h2 className="text-xl font-extrabold text-foreground mt-0.5">
            {userProfile?.displayName} 👋
          </h2>

          <div className="flex items-center gap-2 mt-3">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                userProfile?.role === "admin"
                  ? "bg-purple-100 text-purple-700"
                  : isReseller
                    ? "bg-blue-100 text-blue-700"
                    : "bg-primary/10 text-primary"
              }`}
            >
              {userProfile?.role === "admin"
                ? "Admin"
                : isReseller
                  ? "✓ Reseller"
                  : "User"}
            </span>

            {!isReseller && (
              <button
                onClick={() => setLocation("/upgrade")}
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
              >
                <Crown className="w-3 h-3" />
                Upgrade Reseller
              </button>
            )}
          </div>
        </motion.div>

        {/* Reseller expiry warning */}
        {isReseller && userProfile?.resellerExpiry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3"
          >
            <Crown className="w-5 h-5 text-amber-500 shrink-0" />

            <div>
              <p className="text-sm font-bold text-amber-800">
                Masa Aktif Reseller
              </p>

              <p className="text-xs text-amber-600">
                Berakhir:{" "}
                {new Date(userProfile.resellerExpiry).toLocaleDateString(
                  "id-ID",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  },
                )}
              </p>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div
          variants={{
            show: {
              transition: {
                staggerChildren: 0.08,
              },
            },
          }}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-3"
        >
          {statCards.map((s) => (
            <motion.button
              key={s.label}
              variants={card}
              onClick={() => setLocation(s.href)}
              data-testid={`stat-card-${s.label
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
              className={`flex flex-col items-start p-5 rounded-3xl border-2 text-left transition-all hover:shadow-md card-lift ${s.color}`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${s.iconBg}`}
              >
                <s.icon className="w-5 h-5" />
              </div>

              {loading ? (
                <div className="w-12 h-7 rounded-lg bg-current/10 skeleton-pulse mb-1" />
              ) : (
                <p className="text-2xl font-extrabold">{s.value}</p>
              )}

              <p className="font-bold text-sm">{s.label}</p>

              <p className="text-[11px] opacity-70 mt-0.5">{s.desc}</p>

              <div className="flex items-center gap-1 mt-3 text-[11px] font-semibold opacity-80">
                Lihat semua
                <ArrowRight className="w-3 h-3" />
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* Why buy here */}
        <div>
          <h3 className="text-base font-bold text-foreground mb-3">
            Kenapa Beli di Sini?
          </h3>

          <div className="grid grid-cols-2 gap-2.5">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: i * 0.07,
                }}
                className="bg-card rounded-2xl border border-card-border p-4 flex items-start gap-3 shadow-xs"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="w-4.5 h-4.5 text-primary" />
                </div>

                <div>
                  <p className="font-bold text-sm text-foreground">
                    {f.label}
                  </p>

                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {f.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setLocation("/products")}
            data-testid="btn-browse-products"
            className="bg-primary text-primary-foreground rounded-2xl p-4 flex items-center gap-2 font-bold text-sm shadow-md shadow-primary/25 active:scale-[0.98] transition-transform"
          >
            <Package className="w-5 h-5" />
            Beli Produk
          </button>

          <button
            onClick={() => setLocation("/panels")}
            data-testid="btn-browse-panels"
            className="bg-card border-2 border-primary/20 text-primary rounded-2xl p-4 flex items-center gap-2 font-bold text-sm active:scale-[0.98] transition-transform"
          >
            <Server className="w-5 h-5" />
            Beli Panel
          </button>
        </div>

        {/* Contact admin */}
        <a
          href={`https://wa.me/${adminWa}?text=Halo admin PremiumStore, saya butuh bantuan.`}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="btn-contact-admin"
          className="flex items-center gap-3 bg-green-500 text-white rounded-2xl p-4 shadow-md shadow-green-500/25 active:scale-[0.98] transition-transform"
        >
          <MessageCircle className="w-5 h-5 shrink-0" />

          <div>
            <p className="font-bold text-sm">Hubungi Admin</p>
            <p className="text-[11px] opacity-80">
              WhatsApp • Respon cepat
            </p>
          </div>

          <ArrowRight className="w-4 h-4 ml-auto" />
        </a>
      </div>
    </AppLayout>
  );
}