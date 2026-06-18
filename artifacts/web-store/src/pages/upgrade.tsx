import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Check, Zap, Users, DollarSign, Shield, Star, MessageCircle } from "lucide-react";
import { AppLayout } from "../components/Layout/AppLayout";
import { getResellerPackages } from "../lib/firestore";
import { PaymentModal } from "../components/PaymentModal";
import { useAuth } from "../contexts/AuthContext";
import type { ResellerPackage } from "../types";

const perks = [
  { icon: DollarSign, text: "Harga produk & panel lebih murah" },
  { icon: Zap, text: "Akses 2 Tipe Panel: Nodejs & Python" },
  { icon: Shield, text: "Server Semi Private Ram 3 | Core 4" },
  { icon: Users, text: "Panel legal & tidak menyalahi hukum" },
  { icon: Star, text: "Badge reseller di profil kamu" },
  { icon: Check, text: "Tidak ada biaya tersembunyi" },
];

export default function UpgradePage() {
  const { userProfile, isReseller } = useAuth();
  const [packages, setPackages] = useState<ResellerPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<ResellerPackage | null>(null);
  const adminWa = import.meta.env.VITE_ADMIN_WHATSAPP || "6285782544861";

  useEffect(() => {
    getResellerPackages().then(pkgs => {
      setPackages(pkgs.sort((a, b) => a.price - b.price));
      setLoading(false);
    });
  }, []);

  const handleBuy = (pkg: ResellerPackage) => {
    setSelectedPkg(pkg);
    setPayOpen(true);
  };

  const formatDuration = (pkg: ResellerPackage) => {
    if (pkg.durationType === "permanent") return "Permanen";
    return `${pkg.duration} ${pkg.durationType === "months" ? "Bulan" : "Hari"}`;
  };

  const payItem = selectedPkg ? {
    type: "reseller" as const,
    resellerPackage: selectedPkg,
    price: selectedPkg.price,
    name: `Upgrade Reseller - ${selectedPkg.name}`,
  } : null;

  return (
    <AppLayout title="Upgrade Reseller">
      <div className="space-y-6 max-w-lg mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)" }}
        >
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 right-4 w-20 h-20 rounded-full border-4 border-white" />
            <div className="absolute bottom-4 left-4 w-12 h-12 rounded-full border-2 border-white" />
          </div>
          <Crown className="w-12 h-12 text-white mx-auto mb-3 relative z-10" />
          <h2 className="text-2xl font-extrabold text-white relative z-10">Upgrade ke Reseller</h2>
          <p className="text-white/80 text-sm mt-1 relative z-10">
            Bayar via QRIS, atur otomatis, dapatkan diskon harga.
          </p>
          {isReseller && (
            <div className="mt-3 bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2 inline-flex items-center gap-2 relative z-10">
              <Check className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-sm">Status: Reseller Aktif</span>
            </div>
          )}
        </motion.div>

        {/* Perks */}
        <div className="bg-card rounded-3xl border border-card-border p-5">
          <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            Yang Kamu Dapatkan
          </h3>
          <div className="space-y-2.5">
            {perks.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <p.icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-sm text-foreground">{p.text}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Packages */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3">Pilih Paket Reseller</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-card rounded-3xl border border-card-border skeleton-pulse" />
              ))}
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-10 bg-card rounded-3xl border border-card-border">
              <Crown className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Belum ada paket tersedia</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Hubungi admin untuk informasi</p>
            </div>
          ) : (
            <motion.div
              variants={{ show: { transition: { staggerChildren: 0.08 } } }}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {packages.map((pkg, i) => {
                const isPopular = i === 1;
                return (
                  <motion.div
                    key={pkg.id}
                    variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
                    data-testid={`pkg-${pkg.id}`}
                    className={`bg-card rounded-3xl border-2 overflow-hidden transition-all ${
                      isPopular ? "border-primary shadow-md shadow-primary/15" : "border-card-border"
                    }`}
                  >
                    {isPopular && (
                      <div className="bg-primary text-primary-foreground text-[10px] font-bold text-center py-1.5 tracking-wider uppercase">
                        Paling Populer
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h4 className="font-extrabold text-base text-foreground">{pkg.name}</h4>
                          <p className="text-xs text-muted-foreground">{formatDuration(pkg)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-extrabold text-primary">Rp {pkg.price.toLocaleString("id-ID")}</p>
                          {pkg.productDiscount > 0 && (
                            <p className="text-[10px] text-primary/70 font-semibold">Diskon {pkg.productDiscount}% produk</p>
                          )}
                        </div>
                      </div>

                      {pkg.benefits.length > 0 && (
                        <div className="space-y-1.5 mb-4">
                          {pkg.benefits.map((b, bi) => (
                            <div key={bi} className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                              <span className="text-xs text-muted-foreground">{b}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => handleBuy(pkg)}
                        data-testid={`btn-buy-pkg-${pkg.id}`}
                        disabled={isReseller && userProfile?.role !== "user"}
                        className={`w-full font-bold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                          isPopular
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                            : "bg-card border-2 border-primary/30 text-primary hover:border-primary"
                        } disabled:opacity-50`}
                      >
                        <Crown className="w-4 h-4" />
                        {isReseller ? "Perpanjang Masa Aktif" : "Upgrade Sekarang"}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* WA */}
        <a
          href={`https://wa.me/${adminWa}?text=Halo admin, saya ingin upgrade reseller di PremiumStore.`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4"
        >
          <MessageCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold text-sm">Ada pertanyaan?</p>
            <p className="text-xs opacity-80">Chat admin via WhatsApp</p>
          </div>
        </a>
      </div>

      <PaymentModal
        open={payOpen}
        onClose={() => { setPayOpen(false); setSelectedPkg(null); }}
        item={payItem}
        onSuccess={() => setPayOpen(false)}
      />
    </AppLayout>
  );
}
