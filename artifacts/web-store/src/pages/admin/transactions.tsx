import { useEffect, useState } from "react";
import {
  History, Package, Server, Crown, Clock, CheckCircle2, XCircle,
  AlertCircle, Search, CreditCard,
} from "lucide-react";
import { AppLayout } from "../../components/Layout/AppLayout";
import { subscribeAllTransactions } from "../../lib/firestore";
import { useAuth } from "../../contexts/AuthContext";
import type { Transaction, PaymentStatus, OrderStatus } from "../../types";
import { useLocation } from "wouter";

const payStatusConfig: Record<PaymentStatus, { label: string; color: string }> = {
  pending: { label: "Belum Bayar",  color: "bg-amber-100 text-amber-700" },
  paid:    { label: "Lunas",        color: "bg-blue-100 text-blue-700" },
  failed:  { label: "Gagal Bayar", color: "bg-destructive/10 text-destructive" },
  expired: { label: "Expired",     color: "bg-muted text-muted-foreground" },
};

const orderStatusConfig: Record<OrderStatus, { label: string; color: string }> = {
  pending_payment: { label: "Belum Bayar",    color: "bg-amber-100 text-amber-700" },
  waiting_admin:   { label: "Menunggu Admin", color: "bg-orange-100 text-orange-700" },
  processing:      { label: "Diproses",       color: "bg-blue-100 text-blue-700" },
  done:            { label: "Selesai",        color: "bg-primary/10 text-primary" },
  cancelled:       { label: "Batal",          color: "bg-muted text-muted-foreground" },
  rejected:        { label: "Ditolak",        color: "bg-destructive/10 text-destructive" },
};

function fmtTs(ts: unknown): string {
  if (!ts) return "-";
  if (typeof ts === "object" && ts !== null && "seconds" in (ts as Record<string, unknown>)) {
    return new Date(((ts as { seconds: number }).seconds) * 1000).toLocaleString("id-ID", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }
  return "-";
}

export default function AdminTransactions() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "product" | "panel" | "reseller_upgrade">("all");

  useEffect(() => {
    if (!isAdmin) { setLocation("/"); return; }
    return subscribeAllTransactions(txs => {
      setTransactions(txs);
      setLoading(false);
    });
  }, [isAdmin, setLocation]);

  const filtered = transactions.filter(tx => {
    const matchSearch =
      tx.userName?.toLowerCase().includes(search.toLowerCase()) ||
      tx.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
      tx.productName?.toLowerCase().includes(search.toLowerCase()) ||
      tx.panelName?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || tx.type === filterType;
    return matchSearch && matchType;
  });

  const typeIcon = { product: Package, panel: Server, reseller_upgrade: Crown };

  if (!isAdmin) return null;

  return (
    <AppLayout title="Semua Transaksi">
      <div className="space-y-4">
        <div className="bg-card rounded-2xl border border-card-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">{transactions.length} Total Transaksi</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama, email, produk..."
              className="w-full bg-muted border border-input rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {(["all", "product", "panel", "reseller_upgrade"] as const).map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filterType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {t === "all" ? "Semua" : t === "product" ? "Produk" : t === "panel" ? "Panel" : "Reseller"}
                {" "}({t === "all" ? transactions.length : transactions.filter(tx => tx.type === t).length})
              </button>
            ))}
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 text-xs text-primary/80 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Semua pesanan diproses manual di menu <strong>Pesanan Manual</strong>. Halaman ini hanya untuk melihat riwayat transaksi.
        </div>

        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-card rounded-2xl border border-card-border skeleton-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-card-border">
            <History className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Tidak ada transaksi</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(tx => {
              const payStatus = tx.paymentStatus ? payStatusConfig[tx.paymentStatus] : payStatusConfig.pending;
              const orderStatus = tx.orderStatus ? orderStatusConfig[tx.orderStatus] : null;
              const TypeIcon = typeIcon[tx.type] || Package;
              const isReseller = tx.type === "reseller_upgrade";
              const title = tx.productName || tx.panelName || (isReseller ? "Upgrade Reseller" : tx.type);
              const sub = tx.variantName || tx.panelVariantName;

              return (
                <div key={tx.id}
                  className={`bg-card rounded-2xl border p-4 ${isReseller ? "border-amber-200" : "border-card-border"}`}
                  data-testid={`admin-tx-${tx.id}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isReseller ? "bg-amber-100" : "bg-primary/10"}`}>
                      <TypeIcon className={`w-4 h-4 ${isReseller ? "text-amber-600" : "text-primary"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{title}</p>
                      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
                      <p className="text-xs text-muted-foreground">{tx.userName} • {tx.userEmail}</p>
                      <p className="text-xs font-bold text-foreground mt-0.5">
                        Rp {tx.amount.toLocaleString("id-ID")} • {tx.method?.toUpperCase()}
                      </p>
                      {isReseller && tx.resellerPackageName && (
                        <p className="text-[10px] text-amber-600 font-semibold">Paket: {tx.resellerPackageName}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">{fmtTs(tx.createdAt)}</p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${payStatus.color}`}>
                        {payStatus.label}
                      </span>
                      {tx.paymentStatus === "paid" && orderStatus && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${orderStatus.color}`}>
                          {orderStatus.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
