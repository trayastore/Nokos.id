import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Server, Shield, Zap, Headphones, DollarSign, MessageCircle, ShoppingCart } from "lucide-react";
import { AppLayout } from "../components/Layout/AppLayout";
import { subscribePanels } from "../lib/firestore";
import { useAuth } from "../contexts/AuthContext";
import { PaymentModal } from "../components/PaymentModal";
import type { Panel, PanelVariant } from "../types";

const features = [
  { icon: Shield, title: "Bergaransi", desc: "Setiap panel dijamin aktif dan stabil." },
  { icon: DollarSign, title: "Harga Murah", desc: "Harga bersaing, diskon khusus reseller." },
  { icon: Zap, title: "Setup Cepat", desc: "Admin proses dalam waktu singkat." },
  { icon: Headphones, title: "Support 24/7", desc: "Bantuan via WhatsApp kapan saja." },
];

interface PayItem {
  type: "panel";
  panel: Panel;
  panelVariantId: string;
  panelVariantName: string;
  price: number;
  name: string;
}

export default function PanelsPage() {
  const { isReseller } = useAuth();
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [payItem, setPayItem] = useState<PayItem | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, number>>({});

  const adminWa = import.meta.env.VITE_ADMIN_WHATSAPP || "6285782544861";

  useEffect(() => {
    return subscribePanels(ps => {
      setPanels(ps.filter(p => p.available !== false));
      setLoading(false);
    });
  }, []);

  const getActiveVariants = (panel: Panel): PanelVariant[] =>
    panel.variants?.filter(v => v.isActive) ?? [];

  const getPrice = (variant: PanelVariant): number =>
    isReseller && variant.resellerPrice > 0 ? variant.resellerPrice : variant.price;

  const handleBuy = (panel: Panel) => {
    const activeVariants = getActiveVariants(panel);
    const idx = selectedVariants[panel.id] ?? 0;
    const variant = activeVariants[idx];
    if (!variant) return;
    setPayItem({
      type: "panel",
      panel,
      panelVariantId: variant.id,
      panelVariantName: `${panel.name} - ${variant.name}`,
      price: getPrice(variant),
      name: `Panel: ${panel.name}`,
    });
    setPayOpen(true);
  };

  return (
    <AppLayout title="Panel">
      <div className="space-y-6">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mint-gradient rounded-3xl p-5 border border-primary/15">
          <div className="flex items-center gap-2 mb-1">
            <Server className="w-5 h-5 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Server Panel</span>
          </div>
          <h2 className="text-xl font-extrabold text-foreground">Panel Bot & Server</h2>
          <p className="text-sm text-muted-foreground mt-1">Pilih panel sesuai kebutuhan. Admin proses manual.</p>
        </motion.div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-2.5">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }} className="bg-card border border-card-border rounded-2xl p-3.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <f.icon className="w-4 h-4 text-primary" />
              </div>
              <p className="font-bold text-xs text-foreground">{f.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Panel list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-36 bg-card rounded-3xl border border-card-border skeleton-pulse" />
            ))}
          </div>
        ) : panels.length === 0 ? (
          <div className="text-center py-16">
            <Server className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-semibold text-muted-foreground">Belum ada panel tersedia</p>
          </div>
        ) : (
          <motion.div variants={{ show: { transition: { staggerChildren: 0.06 } } }} initial="hidden" animate="show" className="space-y-4">
            {panels.map(panel => {
              const activeVariants = getActiveVariants(panel);
              const variantIdx = selectedVariants[panel.id] ?? 0;
              const variant = activeVariants[variantIdx];
              const price = variant ? getPrice(variant) : 0;

              return (
                <motion.div key={panel.id} variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
                  className="bg-card rounded-3xl border border-card-border p-5 space-y-4">

                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Server className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-base text-foreground">{panel.name}</p>
                      {panel.description && <p className="text-xs text-muted-foreground mt-0.5">{panel.description}</p>}
                    </div>
                  </div>

                  {/* Variant selector */}
                  {activeVariants.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-muted-foreground mb-2">Pilih Varian</p>
                      <div className="flex flex-wrap gap-2">
                        {activeVariants.map((v, i) => (
                          <button key={v.id}
                            onClick={() => setSelectedVariants(prev => ({ ...prev, [panel.id]: i }))}
                            className={`px-3 py-2 rounded-xl text-xs border-2 transition-all text-left ${variantIdx === i ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground hover:border-primary/30"}`}>
                            <p className="font-semibold">{v.name}</p>
                            {v.duration && <p className="text-[10px] opacity-70">{v.duration}</p>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price + Buy */}
                  {variant ? (
                    <div className="bg-muted rounded-2xl p-3.5">
                      {variant.description && (
                        <p className="text-xs text-muted-foreground mb-2.5">{variant.description}</p>
                      )}
                      <div className="flex items-end justify-between">
                        <div>
                          {isReseller && variant.resellerPrice > 0 ? (
                            <>
                              <p className="text-xs text-muted-foreground line-through">
                                Rp {variant.price.toLocaleString("id-ID")}
                              </p>
                              <p className="text-xl font-extrabold text-primary">
                                Rp {variant.resellerPrice.toLocaleString("id-ID")}
                              </p>
                              <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">
                                Harga Reseller
                              </span>
                            </>
                          ) : (
                            <>
                              <p className="text-xl font-extrabold text-primary">
                                Rp {price.toLocaleString("id-ID")}
                              </p>
                              {variant.duration && (
                                <p className="text-[10px] text-muted-foreground">/{variant.duration}</p>
                              )}
                            </>
                          )}
                        </div>
                        <button onClick={() => handleBuy(panel)}
                          className="bg-primary text-primary-foreground font-bold px-5 py-2.5 rounded-2xl flex items-center gap-2 shadow-md shadow-primary/25 active:scale-[0.98] transition-all text-sm">
                          <ShoppingCart className="w-4 h-4" /> Beli
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted rounded-2xl p-3 text-center">
                      <p className="text-xs text-muted-foreground">Tidak ada varian tersedia</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <a href={`https://wa.me/${adminWa}?text=Halo admin, saya tertarik membeli panel. Bisa dibantu?`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4">
          <MessageCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold text-sm">Butuh rekomendasi panel?</p>
            <p className="text-xs opacity-80">Chat admin via WhatsApp</p>
          </div>
        </a>
      </div>

      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        item={payItem}
        onSuccess={() => setPayOpen(false)}
      />
    </AppLayout>
  );
}
