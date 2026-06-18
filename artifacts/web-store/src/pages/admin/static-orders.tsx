import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Package, Clock, Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { AppLayout } from "../../components/Layout/AppLayout";
import { subscribeManualOrders } from "../../lib/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useLocation } from "wouter";
import type { ManualOrder } from "../../types";

const statusConfig = {
  waiting:    { label: "Menunggu",   color: "bg-amber-100 text-amber-700",         icon: Clock },
  processing: { label: "Diproses",  color: "bg-blue-100 text-blue-700",            icon: Loader2 },
  done:       { label: "Selesai",   color: "bg-primary/10 text-primary",           icon: CheckCircle2 },
  rejected:   { label: "Ditolak",   color: "bg-destructive/10 text-destructive",   icon: XCircle },
};

function fmtTs(ts: unknown): string {
  if (!ts) return "Baru saja";
  if (typeof ts === "object" && ts !== null && "seconds" in (ts as Record<string, unknown>)) {
    return new Date(((ts as { seconds: number }).seconds) * 1000).toLocaleString("id-ID", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }
  return "Baru saja";
}

export default function AdminStaticOrders() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [orders, setOrders] = useState<ManualOrder[]>([]);

  useEffect(() => {
    if (!isAdmin) { setLocation("/"); return; }
    return subscribeManualOrders(all => setOrders(all.filter(o => o.type === "product")));
  }, [isAdmin, setLocation]);

  const waiting = orders.filter(o => o.status === "waiting").length;

  return (
    <AppLayout title="Pesanan Produk">
      <div className="space-y-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mint-gradient rounded-3xl p-5 border border-primary/15">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-5 h-5 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Admin</span>
          </div>
          <h2 className="text-xl font-extrabold text-foreground">Pesanan Produk</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {orders.length} pesanan produk · {waiting > 0 && <span className="font-bold text-amber-600">{waiting} menunggu</span>}
          </p>
        </motion.div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <ExternalLink className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-blue-700">Kelola di Pesanan Manual</p>
            <p className="text-xs text-blue-600 mt-0.5">Untuk memproses, mengisi field data, dan mengirim akun ke buyer, gunakan halaman Pesanan Manual yang memiliki fitur lengkap.</p>
            <button onClick={() => setLocation("/admin/manual-orders")}
              className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-500 px-3 py-1.5 rounded-xl">
              <ExternalLink className="w-3 h-3" /> Buka Pesanan Manual
            </button>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-card-border">
            <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Belum ada pesanan produk</p>
          </div>
        ) : (
          <motion.div variants={{ show: { transition: { staggerChildren: 0.04 } } }} initial="hidden" animate="show" className="space-y-2.5">
            {orders.map(order => {
              const cfg = statusConfig[order.status];
              const StatusIcon = cfg.icon;
              const wa = order.buyerWhatsapp
                ? `https://wa.me/${order.buyerWhatsapp.replace(/\D/g, "").replace(/^0/, "62")}?text=Halo+kak+${encodeURIComponent(order.userName)}%2C+pesanan+kamu+ID+${order.id}`
                : null;

              return (
                <motion.div key={order.id}
                  variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                  className="bg-card rounded-2xl border border-card-border p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{order.productName || "-"}</p>
                      {order.variantName && (
                        <p className="text-[11px] text-muted-foreground">{order.variantName}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {order.userName} · {order.userEmail}
                      </p>
                      {order.buyerWhatsapp && (
                        <p className="text-[11px] text-green-600 font-semibold">WA: {order.buyerWhatsapp}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.color}`}>
                          <StatusIcon className="w-2.5 h-2.5" /> {cfg.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{fmtTs(order.createdAt)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-sm">Rp {order.amount.toLocaleString("id-ID")}</p>
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-lg">
                          WA
                        </a>
                      )}
                    </div>
                  </div>
                  {order.buyerNote && (
                    <p className="mt-2 text-[11px] bg-muted rounded-xl px-3 py-2 text-muted-foreground">
                      📝 {order.buyerNote}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
