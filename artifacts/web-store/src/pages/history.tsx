import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History, Package, Server, Crown, Copy, ChevronDown,
  MessageCircle, Clock, CheckCircle2, XCircle, AlertCircle, CreditCard,
  ExternalLink, Eye, EyeOff,
} from "lucide-react";
import { AppLayout } from "../components/Layout/AppLayout";
import { subscribeUserTransactions, getUserProductDataByTx, getUserPanelDataByTx } from "../lib/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import type { Transaction, PaymentStatus, OrderStatus, UserProductData, UserPanelData } from "../types";

const paymentStatusConfig: Record<PaymentStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending:  { label: "Menunggu Bayar", color: "bg-amber-100 text-amber-700",        icon: Clock },
  paid:     { label: "Lunas",          color: "bg-blue-100 text-blue-700",           icon: CreditCard },
  failed:   { label: "Gagal Bayar",   color: "bg-destructive/10 text-destructive",  icon: XCircle },
  expired:  { label: "QRIS Expired",  color: "bg-muted text-muted-foreground",      icon: XCircle },
};

const orderStatusConfig: Record<OrderStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending_payment: { label: "Belum Bayar",       color: "bg-amber-100 text-amber-700",         icon: Clock },
  waiting_admin:   { label: "Menunggu Admin",    color: "bg-orange-100 text-orange-700",        icon: AlertCircle },
  processing:      { label: "Diproses",          color: "bg-blue-100 text-blue-700",            icon: AlertCircle },
  done:            { label: "Selesai",           color: "bg-primary/10 text-primary",           icon: CheckCircle2 },
  cancelled:       { label: "Dibatalkan",        color: "bg-muted text-muted-foreground",       icon: XCircle },
  rejected:        { label: "Ditolak",           color: "bg-destructive/10 text-destructive",   icon: XCircle },
};

const typeIcon = {
  product: Package,
  panel: Server,
  reseller_upgrade: Crown,
};

type FilterTab = "Semua" | "Produk" | "Panel" | "Reseller";
const filterTabs: FilterTab[] = ["Semua", "Produk", "Panel", "Reseller"];

function fmtTs(ts: unknown): string {
  if (!ts) return "Baru saja";
  if (typeof ts === "object" && ts !== null && "seconds" in (ts as Record<string, unknown>)) {
    return new Date(((ts as { seconds: number }).seconds) * 1000).toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
    });
  }
  if (typeof ts === "string") return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  return "Baru saja";
}

// ── Delivered data detail component ───────────────────────────────────────────
function DeliveredProductDetail({ txId }: { txId: string }) {
  const [data, setData] = useState<UserProductData | null | "loading">("loading");
  const [showFields, setShowFields] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    getUserProductDataByTx(txId).then(d => {
      if (!cancelled) setData(d);
    });
    return () => { cancelled = true; };
  }, [txId]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Disalin!" });
  };

  if (data === "loading") {
    return <div className="h-8 bg-muted rounded-xl skeleton-pulse" />;
  }
  if (!data) {
    return (
      <p className="text-[11px] text-muted-foreground">
        Data akun belum tersedia. Cek menu "Data APK Premium".
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-primary">✅ Data Akun Premium</p>
        <button onClick={() => setShowFields(v => !v)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          {showFields ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showFields ? "Sembunyikan" : "Tampilkan"}
        </button>
      </div>
      {data.note && (
        <p className="text-[11px] bg-primary/5 text-primary rounded-xl px-3 py-2">{data.note}</p>
      )}
      {showFields && data.fields.map((f, i) => (
        <div key={i} className="bg-muted rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{f.key}</p>
            <p className="text-xs font-bold text-foreground mt-0.5 break-all">{f.value}</p>
          </div>
          <button onClick={() => handleCopy(f.value)}
            className="shrink-0 p-1.5 rounded-lg hover:bg-primary/10 transition-colors">
            <Copy className="w-3.5 h-3.5 text-primary" />
          </button>
        </div>
      ))}
    </div>
  );
}

function DeliveredPanelDetail({ txId }: { txId: string }) {
  const [data, setData] = useState<UserPanelData | null | "loading">("loading");
  const [showFields, setShowFields] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    getUserPanelDataByTx(txId).then(d => {
      if (!cancelled) setData(d);
    });
    return () => { cancelled = true; };
  }, [txId]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Disalin!" });
  };

  if (data === "loading") {
    return <div className="h-8 bg-muted rounded-xl skeleton-pulse" />;
  }
  if (!data) {
    return (
      <p className="text-[11px] text-muted-foreground">
        Data panel belum tersedia. Cek menu "Panel Aktif".
      </p>
    );
  }

  const expiryDate = data.expiresAt
    ? new Date(data.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-primary">✅ Data Panel Aktif</p>
        <button onClick={() => setShowFields(v => !v)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          {showFields ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showFields ? "Sembunyikan" : "Tampilkan"}
        </button>
      </div>
      {data.loginUrl && (
        <a href={data.loginUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5">
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          Buka Panel Login
        </a>
      )}
      {expiryDate && (
        <p className="text-[11px] text-muted-foreground">
          Aktif s/d: <strong className="text-foreground">{expiryDate}</strong>
        </p>
      )}
      {data.note && (
        <p className="text-[11px] bg-primary/5 text-primary rounded-xl px-3 py-2">{data.note}</p>
      )}
      {showFields && data.fields.map((f, i) => (
        <div key={i} className="bg-muted rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{f.key}</p>
            <p className="text-xs font-bold text-foreground mt-0.5 break-all">{f.value}</p>
          </div>
          <button onClick={() => handleCopy(f.value)}
            className="shrink-0 p-1.5 rounded-lg hover:bg-primary/10 transition-colors">
            <Copy className="w-3.5 h-3.5 text-primary" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("Semua");
  const adminWa = import.meta.env.VITE_ADMIN_WHATSAPP || "6285782544861";

  useEffect(() => {
    if (!userProfile) return;
    return subscribeUserTransactions(userProfile.id, txs => {
      setTransactions(txs);
      setLoading(false);
    });
  }, [userProfile]);

  const handleCopy = useCallback((text: string, label = "Disalin!") => {
    navigator.clipboard.writeText(text);
    toast({ title: label });
  }, [toast]);

  const filtered = transactions.filter(tx => {
    if (activeTab === "Semua") return true;
    if (activeTab === "Produk") return tx.type === "product";
    if (activeTab === "Panel") return tx.type === "panel";
    if (activeTab === "Reseller") return tx.type === "reseller_upgrade";
    return true;
  });

  const tabCount = (tab: FilterTab) => {
    if (tab === "Semua") return transactions.length;
    if (tab === "Produk") return transactions.filter(t => t.type === "product").length;
    if (tab === "Panel") return transactions.filter(t => t.type === "panel").length;
    if (tab === "Reseller") return transactions.filter(t => t.type === "reseller_upgrade").length;
    return 0;
  };

  return (
    <AppLayout title="Riwayat Beli">
      <div className="space-y-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mint-gradient rounded-3xl p-5 border border-primary/15">
          <div className="flex items-center gap-2 mb-1">
            <History className="w-5 h-5 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Riwayat</span>
          </div>
          <h2 className="text-xl font-extrabold text-foreground">Riwayat Transaksi</h2>
          <p className="text-sm text-muted-foreground mt-1">{transactions.length} transaksi total</p>
        </motion.div>

        {transactions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {filterTabs.map(tab => {
              const count = tabCount(tab);
              const active = activeTab === tab;
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${active ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-card-border text-muted-foreground hover:border-primary/30"}`}>
                  {tab} {count > 0 && <span className={`ml-1 ${active ? "opacity-75" : "text-muted-foreground"}`}>({count})</span>}
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-card rounded-2xl border border-card-border skeleton-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20">
            <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-semibold text-muted-foreground">Belum ada transaksi</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Mulai belanja produk atau panel</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-card-border">
            <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Tidak ada transaksi "{activeTab}"</p>
          </div>
        ) : (
          <motion.div variants={{ show: { transition: { staggerChildren: 0.06 } } }} initial="hidden" animate="show" className="space-y-3">
            {filtered.map(tx => {
              const payStatus = tx.paymentStatus ? paymentStatusConfig[tx.paymentStatus] : paymentStatusConfig.pending;
              const orderStatus = tx.orderStatus ? orderStatusConfig[tx.orderStatus] : null;
              const PayStatusIcon = payStatus.icon;
              const TypeIcon = typeIcon[tx.type] || Package;
              const isExpanded = expandedId === tx.id;
              const isReseller = tx.type === "reseller_upgrade";
              const hasDetail = tx.orderStatus === "waiting_admin" || tx.orderStatus === "processing"
                || tx.orderStatus === "done" || tx.orderStatus === "rejected"
                || tx.paymentStatus === "failed" || tx.paymentStatus === "expired"
                || isReseller;

              const title = tx.productName || tx.panelName || (isReseller ? "Upgrade Reseller" : tx.type);
              const subtitle = tx.variantName || tx.panelVariantName;

              return (
                <motion.div key={tx.id}
                  variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                  className={`bg-card rounded-2xl border overflow-hidden ${isReseller ? "border-amber-200" : "border-card-border"}`}>

                  <div className={`p-4 ${hasDetail ? "cursor-pointer" : ""}`}
                    onClick={() => hasDetail && setExpandedId(isExpanded ? null : tx.id)}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isReseller ? "bg-amber-100" : "bg-primary/10"}`}>
                        <TypeIcon className={`w-5 h-5 ${isReseller ? "text-amber-600" : "text-primary"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{title}</p>
                        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
                        {isReseller && tx.resellerPackageName && (
                          <p className="text-[11px] text-amber-600 font-semibold">Paket: {tx.resellerPackageName}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${payStatus.color}`}>
                            <PayStatusIcon className="w-2.5 h-2.5" />
                            {payStatus.label}
                          </span>
                          {tx.paymentStatus === "paid" && orderStatus && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${orderStatus.color}`}>
                              {orderStatus.label}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">{fmtTs(tx.createdAt)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-extrabold text-sm text-foreground">Rp {tx.amount.toLocaleString("id-ID")}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{tx.method}</p>
                        {hasDetail && (
                          <ChevronDown className={`w-4 h-4 text-muted-foreground mt-1 ml-auto transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                        )}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                        <div className="px-4 pb-4 pt-0 border-t border-card-border space-y-3">

                          {/* ── RESELLER DONE ── */}
                          {isReseller && (
                            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-3.5">
                              <p className="text-xs font-bold text-amber-700 mb-1">🎖️ Upgrade Reseller</p>
                              <p className="text-[11px] text-amber-600">Paket: <strong>{tx.resellerPackageName || "-"}</strong></p>
                              {tx.orderStatus === "done" && tx.resellerActiveUntil && (
                                <p className="text-[11px] text-amber-600 mt-0.5">
                                  Aktif s/d: <strong>{new Date(tx.resellerActiveUntil).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</strong>
                                </p>
                              )}
                              {tx.orderStatus === "done" && !tx.resellerActiveUntil && (
                                <p className="text-[11px] text-amber-600 mt-0.5">Masa aktif: <strong>Permanen</strong></p>
                              )}
                            </div>
                          )}

                          {/* ── WAITING / PROCESSING ── */}
                          {(tx.orderStatus === "waiting_admin" || tx.orderStatus === "processing") && (
                            <div className="mt-3 bg-orange-50 border border-orange-200 rounded-2xl p-3.5">
                              <p className="text-xs font-bold text-orange-700 mb-1">
                                {tx.orderStatus === "processing" ? "⏳ Sedang Diproses Admin" : "⏳ Menunggu Konfirmasi Admin"}
                              </p>
                              <p className="text-[11px] text-orange-600">
                                {tx.orderStatus === "processing"
                                  ? "Admin sedang menyiapkan data akunmu."
                                  : "Admin akan segera memproses pesananmu."}
                              </p>
                              <a href={`https://wa.me/${adminWa}?text=Halo admin, saya ingin cek status pesanan ID: ${tx.id}`}
                                target="_blank" rel="noopener noreferrer"
                                className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 py-2 px-3 rounded-xl w-fit">
                                <MessageCircle className="w-3.5 h-3.5" /> Cek via WA
                              </a>
                            </div>
                          )}

                          {/* ── DONE: inline delivered data ── */}
                          {tx.orderStatus === "done" && !isReseller && (
                            <div className="mt-3 bg-primary/5 border border-primary/20 rounded-2xl p-3.5 space-y-3">
                              {tx.type === "product" && <DeliveredProductDetail txId={tx.id} />}
                              {tx.type === "panel"   && <DeliveredPanelDetail   txId={tx.id} />}
                            </div>
                          )}

                          {/* ── REJECTED ── */}
                          {tx.orderStatus === "rejected" && (
                            <div className="mt-3 bg-destructive/5 border border-destructive/20 rounded-2xl p-3.5">
                              <p className="text-xs font-bold text-destructive mb-1">❌ Pesanan Ditolak</p>
                              <p className="text-[11px] text-muted-foreground">Hubungi admin untuk informasi lebih lanjut.</p>
                              <a href={`https://wa.me/${adminWa}?text=Halo admin, pesanan saya ditolak. ID Transaksi: ${tx.id}`}
                                target="_blank" rel="noopener noreferrer"
                                className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 py-2 px-3 rounded-xl w-fit">
                                <MessageCircle className="w-3.5 h-3.5" /> Chat Admin
                              </a>
                            </div>
                          )}

                          {/* ── FAILED / EXPIRED ── */}
                          {(tx.paymentStatus === "failed" || tx.paymentStatus === "expired") && (
                            <div className="mt-3 bg-muted rounded-2xl p-3">
                              <p className="text-xs text-muted-foreground">Jika dana sudah terpotong tapi pembayaran gagal, hubungi admin.</p>
                              <button onClick={() => handleCopy(tx.id, "ID Transaksi disalin!")}
                                className="mt-2 flex items-center gap-1.5 text-xs text-primary">
                                <Copy className="w-3 h-3" /> Salin ID: {tx.id.slice(0, 10)}...
                              </button>
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
