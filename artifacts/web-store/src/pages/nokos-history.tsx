import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  QrCode,
  Smartphone,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Copy,
  RefreshCw,
  ChevronRight,
  BadgeDollarSign,
  MessageCircle,
  Send,
  Instagram,
  Music2,
  Mail,
  Globe2,
} from "lucide-react";
import { useLocation } from "wouter";
import { AppLayout } from "../components/Layout/AppLayout";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  subscribeUserNokosOrders,
  subscribeUserNokosDeposits,
  updateNokosDeposit,
  finalizeNokosDepositPaid,
} from "../lib/firestore";
import {
  checkNokosDeposit,
  extractDepositStatus,
} from "../lib/nokos-api";
import type { NokosOrder, NokosDeposit } from "../types";

type Tab = "orders" | "deposits";
type OrderFilter = "all" | "waiting_otp" | "done" | "cancelled";

const fmt = (v: number) => `Rp${v.toLocaleString("id-ID")}`;

function fmtDate(ts: unknown): string {
  if (!ts) return "–";

  const d =
    typeof ts === "object" && ts !== null && "toDate" in ts
      ? (ts as { toDate: () => Date }).toDate()
      : new Date(ts as string | number);

  const now = new Date();
  const diff = now.getTime() - d.getTime();

  if (diff < 60_000) return "Baru saja";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} mnt lalu`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} jam lalu`;

  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getCountryFlag(countryName?: string): string {
  const name = String(countryName || "").toLowerCase();

  const map: Record<string, string> = {
    indonesia: "🇮🇩",
    malaysia: "🇲🇾",
    thailand: "🇹🇭",
    vietnam: "🇻🇳",
    philippines: "🇵🇭",
    singapore: "🇸🇬",
    cambodia: "🇰🇭",
    laos: "🇱🇦",
    myanmar: "🇲🇲",
    brunei: "🇧🇳",
    usa: "🇺🇸",
    "united states": "🇺🇸",
    russia: "🇷🇺",
    india: "🇮🇳",
    morocco: "🇲🇦",
    "south africa": "🇿🇦",
    china: "🇨🇳",
    japan: "🇯🇵",
    korea: "🇰🇷",
    france: "🇫🇷",
    germany: "🇩🇪",
    brazil: "🇧🇷",
    turkey: "🇹🇷",
    mexico: "🇲🇽",
    egypt: "🇪🇬",
    nigeria: "🇳🇬",
  };

  return map[name] ?? "🌍";
}

function ServiceIcon({ serviceName }: { serviceName?: string }) {
  const name = String(serviceName || "").toLowerCase();

  if (name.includes("whatsapp") || name.includes("wa")) {
    return <MessageCircle className="w-5 h-5 text-primary" />;
  }

  if (name.includes("telegram")) {
    return <Send className="w-5 h-5 text-primary" />;
  }

  if (name.includes("instagram")) {
    return <Instagram className="w-5 h-5 text-primary" />;
  }

  if (name.includes("tiktok")) {
    return <Music2 className="w-5 h-5 text-primary" />;
  }

  if (name.includes("gmail") || name.includes("google") || name.includes("mail")) {
    return <Mail className="w-5 h-5 text-primary" />;
  }

  return <Smartphone className="w-5 h-5 text-primary" />;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    waiting_otp: "bg-yellow-50 text-yellow-700 border-yellow-200",
    done: "bg-green-50 text-green-700 border-green-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
    timeout: "bg-orange-50 text-orange-700 border-orange-200",
    pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
    paid: "bg-green-50 text-green-700 border-green-200",
    expired: "bg-orange-50 text-orange-700 border-orange-200",
    failed: "bg-red-50 text-red-700 border-red-200",
  };

  const labels: Record<string, string> = {
    waiting_otp: "Menunggu OTP",
    done: "Selesai",
    cancelled: "Dibatalkan",
    timeout: "Timeout",
    pending: "Menunggu Bayar",
    paid: "Lunas",
    expired: "Expired",
    failed: "Gagal",
  };

  const icons: Record<string, React.ReactNode> = {
    done: <CheckCircle2 className="w-3 h-3" />,
    paid: <CheckCircle2 className="w-3 h-3" />,
    waiting_otp: <Clock className="w-3 h-3" />,
    pending: <Clock className="w-3 h-3" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
        styles[status] ?? "bg-muted text-muted-foreground border-transparent"
      }`}
    >
      {icons[status] ?? <XCircle className="w-3 h-3" />}
      {labels[status] ?? status}
    </span>
  );
}

function OrderCard({ order }: { order: NokosOrder }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyOtp = () => {
    if (!order.otp) return;

    navigator.clipboard.writeText(order.otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    toast({ title: "OTP disalin!" });
  };

  const flag = getCountryFlag(order.countryName);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-card-border rounded-3xl overflow-hidden"
    >
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <ServiceIcon serviceName={order.serviceName} />
          </div>

          <div className="min-w-0">
            <p className="font-extrabold text-sm text-foreground truncate">
              {order.serviceName}
            </p>

            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              <span className="text-xs">{flag}</span>
              <p className="text-xs text-muted-foreground truncate">
                {order.countryName} · {order.operatorName}
              </p>
            </div>

            <p className="text-[10px] text-muted-foreground mt-0.5">
              {fmtDate(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <StatusBadge status={order.status} />
          <p className="text-xs font-bold text-primary mt-1.5">
            {fmt(order.price)}
          </p>
        </div>
      </div>

      <div className="border-t border-card-border mx-4" />

      <div className="p-4 space-y-2">
        {order.phone && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground font-medium">
              Nomor
            </span>
            <span className="text-xs font-bold font-mono tracking-wide">
              {order.phone}
            </span>
          </div>
        )}

        {order.otp ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-green-600 font-medium">Kode OTP</p>
              <p className="text-xl font-extrabold text-green-700 tracking-[0.2em] mt-0.5">
                {order.otp}
              </p>
            </div>

            <button
              onClick={copyOtp}
              className="bg-green-500 text-white rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5"
            >
              {copied ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? "Disalin" : "Salin"}
            </button>
          </div>
        ) : order.status === "waiting_otp" ? (
          <button
            onClick={() => navigate(`/nokos/order/${order.id}`)}
            className="w-full bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-2xl p-3 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Clock className="w-3.5 h-3.5" />
            Lihat Status OTP
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : null}

        {order.nokosOrderId && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground font-medium">
              Activation ID
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {order.nokosOrderId}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function DepositCard({ deposit }: { deposit: NokosDeposit }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-card-border rounded-3xl p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              deposit.status === "paid"
                ? "bg-green-100"
                : deposit.status === "pending"
                  ? "bg-yellow-100"
                  : "bg-red-100"
            }`}
          >
            <QrCode
              className={`w-5 h-5 ${
                deposit.status === "paid"
                  ? "text-green-600"
                  : deposit.status === "pending"
                    ? "text-yellow-600"
                    : "text-red-500"
              }`}
            />
          </div>

          <div className="min-w-0">
            <p className="font-extrabold text-sm">Topup QRIS</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {fmtDate(deposit.createdAt)}
            </p>

            {deposit.transactionId && (
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                {deposit.transactionId}
              </p>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="font-extrabold text-lg text-primary">
            +{fmt(deposit.amount)}
          </p>
          <div className="mt-1">
            <StatusBadge status={deposit.status} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({
  type,
  filter,
}: {
  type: Tab;
  filter?: OrderFilter;
}) {
  const orderText =
    filter && filter !== "all"
      ? "Tidak ada order dengan status ini"
      : "Belum ada order nomor";

  return (
    <div className="text-center py-16 space-y-3">
      <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mx-auto">
        {type === "orders" ? (
          <Smartphone className="w-8 h-8 text-muted-foreground" />
        ) : (
          <QrCode className="w-8 h-8 text-muted-foreground" />
        )}
      </div>

      <p className="font-bold text-foreground">
        {type === "orders" ? orderText : "Belum ada riwayat topup"}
      </p>

      <p className="text-sm text-muted-foreground">
        {type === "orders"
          ? "Riwayat order akan muncul di sini"
          : "Topup pertamamu akan muncul di sini"}
      </p>
    </div>
  );
}

export default function NokosHistoryPage() {
  const { firebaseUser } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("orders");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");

  const [orders, setOrders] = useState<NokosOrder[]>([]);
  const [deposits, setDeposits] = useState<NokosDeposit[]>([]);

  const [ordersLoading, setOrdersLoading] = useState(true);
  const [depositsLoading, setDepositsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const syncingDepositsRef = useRef<Set<string>>(new Set());

  const syncPendingDeposits = useCallback(async (items: NokosDeposit[]) => {
    const pendingDeposits = items.filter(
      (dep) =>
        dep.id &&
        dep.transactionId &&
        dep.status === "pending" &&
        !syncingDepositsRef.current.has(dep.id),
    );

    if (pendingDeposits.length === 0) return;

    await Promise.all(
      pendingDeposits.map(async (dep) => {
        if (!dep.id || !dep.transactionId) return;

        syncingDepositsRef.current.add(dep.id);

        try {
          const raw = await checkNokosDeposit(dep.transactionId);
          const result = extractDepositStatus(raw);
          const latestStatus = result.status.toLowerCase();

          if (latestStatus === "paid") {
            await finalizeNokosDepositPaid(dep.id);
            return;
          }

          if (latestStatus === "expired" || latestStatus === "failed") {
            await updateNokosDeposit(dep.id, {
              status: latestStatus,
            });
          }
        } catch {
          // biarkan pending, nanti dicoba lagi saat refresh/buka halaman
        } finally {
          syncingDepositsRef.current.delete(dep.id);
        }
      }),
    );
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    const unsubO = subscribeUserNokosOrders(firebaseUser.uid, (data) => {
      setOrders(data);
      setOrdersLoading(false);
    });

    const unsubD = subscribeUserNokosDeposits(firebaseUser.uid, (data) => {
      setDeposits(data);
      setDepositsLoading(false);
    });

    return () => {
      unsubO();
      unsubD();
    };
  }, [firebaseUser]);

  useEffect(() => {
    if (depositsLoading || deposits.length === 0) return;
    syncPendingDeposits(deposits);
  }, [deposits, depositsLoading, syncPendingDeposits]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await syncPendingDeposits(deposits);

      toast({
        title: "Data diperbarui",
      });
    } catch {
      toast({
        title: "Gagal memperbarui data",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const filteredOrders =
    orderFilter === "all"
      ? orders
      : orders.filter((order) => order.status === orderFilter);

  const totalSpent = orders
    .filter((o) => o.status === "done")
    .reduce((s, o) => s + (o.price || 0), 0);

  const totalTopup = deposits
    .filter((d) => d.status === "paid")
    .reduce((s, d) => s + (d.amount || 0), 0);

  const successOrders = orders.filter((o) => o.status === "done").length;

  const filterItems: Array<{ value: OrderFilter; label: string }> = [
    { value: "all", label: "Semua" },
    { value: "waiting_otp", label: "Menunggu OTP" },
    { value: "done", label: "Selesai" },
    { value: "cancelled", label: "Dibatalkan" },
  ];

  return (
    <AppLayout title="Riwayat Nokos">
      <div className="space-y-5">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mint-gradient rounded-3xl p-5 border border-primary/15"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>

            <div>
              <p className="font-extrabold text-sm">Ringkasan Aktivitas</p>
              <p className="text-xs text-muted-foreground">
                Semua transaksi Nokosmu
              </p>
            </div>

            <button
              onClick={handleRefresh}
              className="ml-auto w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card/60 rounded-2xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground font-medium">
                Order Sukses
              </p>
              <p className="text-xl font-extrabold text-primary mt-0.5">
                {successOrders}
              </p>
            </div>

            <div className="bg-card/60 rounded-2xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground font-medium">
                Total Dipakai
              </p>
              <p className="text-sm font-extrabold mt-0.5 text-foreground">
                {fmt(totalSpent)}
              </p>
            </div>

            <div className="bg-card/60 rounded-2xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground font-medium">
                Total Topup
              </p>
              <p className="text-sm font-extrabold mt-0.5 text-green-600">
                {fmt(totalTopup)}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="flex gap-1 bg-muted rounded-2xl p-1">
          {[
            {
              key: "orders" as Tab,
              label: `Order (${filteredOrders.length})`,
              icon: BadgeDollarSign,
            },
            {
              key: "deposits" as Tab,
              label: `Topup (${deposits.length})`,
              icon: QrCode,
            },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                tab === t.key
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "orders" && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filterItems.map((item) => (
              <button
                key={item.value}
                onClick={() => setOrderFilter(item.value)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  orderFilter === item.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-card-border text-muted-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {tab === "orders" && (
            <motion.div
              key="orders"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {ordersLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <EmptyState type="orders" filter={orderFilter} />
              ) : (
                filteredOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </motion.div>
          )}

          {tab === "deposits" && (
            <motion.div
              key="deposits"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {depositsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : deposits.length === 0 ? (
                <EmptyState type="deposits" />
              ) : (
                deposits.map((dep) => (
                  <DepositCard key={dep.id} deposit={dep} />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}