import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, ChevronDown, ChevronUp, Copy, CheckCircle2, Clock,
  Smartphone, Search, RefreshCw,
} from "lucide-react";
import { AppLayout } from "../components/Layout/AppLayout";
import { subscribeUserProductData } from "../lib/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import type { UserProductData } from "../types";

function fmtTs(ts: unknown): string {
  if (!ts) return "-";
  if (typeof ts === "object" && ts !== null && "seconds" in (ts as Record<string, unknown>)) {
    return new Date(((ts as { seconds: number }).seconds) * 1000).toLocaleDateString("id-ID", {
      day: "numeric", month: "long", year: "numeric",
    });
  }
  if (typeof ts === "string") return new Date(ts).toLocaleDateString("id-ID");
  return "-";
}

export default function MyAccountsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<UserProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Auth still resolving — wait
    if (authLoading) return;
    // Auth done but no user (not logged in)
    if (!userProfile) { setLoading(false); return; }
    return subscribeUserProductData(userProfile.id, data => {
      setItems(data);
      setLoading(false);
    });
  }, [userProfile, authLoading]);

  const handleCopy = (text: string, label = "Disalin!") => {
    navigator.clipboard.writeText(text);
    toast({ title: label });
  };

  const handleCopyAll = (item: UserProductData) => {
    const text = item.fields.map(f => `${f.key}: ${f.value}`).join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: "Semua data disalin!" });
  };

  const filtered = items.filter(item =>
    item.productName.toLowerCase().includes(search.toLowerCase()) ||
    item.variantName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout title="Data APK Premium">
      <div className="space-y-4">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mint-gradient rounded-3xl p-5 border border-primary/15">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-5 h-5 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Data Premium</span>
          </div>
          <h2 className="text-xl font-extrabold text-foreground">Data APK Premium</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Memuat..." : `${items.length} akun premium kamu`}
          </p>
        </motion.div>

        {/* Search */}
        {items.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="w-full bg-card border border-card-border rounded-2xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-card rounded-2xl border border-card-border skeleton-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-semibold text-muted-foreground">Belum ada data akun premium</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Beli produk dan tunggu admin memproses pesananmu</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border border-card-border">
            <p className="text-muted-foreground text-sm">Tidak ada hasil untuk "{search}"</p>
          </div>
        ) : (
          <motion.div
            variants={{ show: { transition: { staggerChildren: 0.06 } } }}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {filtered.map(item => {
              const isExpanded = expandedId === item.id;
              return (
                <motion.div key={item.id}
                  variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                  className={`bg-card rounded-2xl border overflow-hidden ${item.isActive ? "border-card-border" : "border-muted"}`}>

                  <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${item.isActive ? "bg-primary/10" : "bg-muted"}`}>
                        <Package className={`w-5 h-5 ${item.isActive ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{item.productName}</p>
                        {item.variantName && (
                          <p className="text-[11px] text-muted-foreground">{item.variantName}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${item.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {item.isActive
                              ? <><CheckCircle2 className="w-2.5 h-2.5" /> Aktif</>
                              : <><Clock className="w-2.5 h-2.5" /> Kadaluarsa</>}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Diterima: {fmtTs(item.deliveredAt)}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-0 border-t border-card-border">
                          <div className="mt-3 bg-muted/60 rounded-2xl p-3.5 space-y-2.5">
                            <p className="text-xs font-bold text-muted-foreground">📋 Data Akun</p>
                            {item.fields.map((f, i) => (
                              <div key={i} className="flex items-center justify-between gap-2">
                                <span className="text-xs text-muted-foreground shrink-0 min-w-[80px]">{f.key}:</span>
                                <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
                                  <span className="text-xs font-semibold font-mono text-foreground break-all text-right">{f.value}</span>
                                  <button onClick={() => handleCopy(f.value, `${f.key} disalin!`)}
                                    className="p-1 hover:bg-accent rounded-lg transition-colors shrink-0">
                                    <Copy className="w-3 h-3 text-muted-foreground" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={() => handleCopyAll(item)}
                              className="mt-1 w-full text-xs font-semibold text-primary bg-primary/10 py-2 rounded-xl flex items-center justify-center gap-1.5">
                              <RefreshCw className="w-3 h-3" /> Salin Semua Data
                            </button>
                          </div>

                          {item.expiresAt && (
                            <div className="mt-2 text-center">
                              <p className="text-[11px] text-muted-foreground">
                                Expired: <span className="font-semibold">{new Date(item.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
