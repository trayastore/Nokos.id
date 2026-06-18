import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Smartphone,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { AppLayout } from "../components/Layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import {
  getNokosOrder,
  updateNokosOrder,
  refundNokosOrder,
  syncWalletFromHistory,
} from "../lib/firestore";
import { getNokosOtp, extractOtp } from "../lib/nokos-api";
import type { NokosOrder } from "../types";

export default function NokosOrderPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [order, setOrder] = useState<NokosOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState<string | null>(null);
  const [sms, setSms] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<string>("waiting");
  const [polling, setPolling] = useState(true);
  const [copied, setCopied] = useState<"otp" | "phone" | "sms" | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(20 * 60);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processedRef = useRef(false);
  const refundProcessedRef = useRef(false);

  const stopTimers = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const stopCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const getOrderExpireMs = (currentOrder: NokosOrder) => {
    const extra = currentOrder as NokosOrder & {
      expiresAt?: string | number | Date;
      expiredAt?: string | number | Date;
      expireAt?: string | number | Date;
      timeout?: string | number;
      createdAt?: string | number | Date | { seconds?: number };
    };

    const mainExpire =
      extra.expiresAt || extra.expiredAt || extra.expireAt || null;

    if (mainExpire) {
      const raw = String(mainExpire);

      if (/^\d+$/.test(raw)) {
        const num = Number(raw);

        if (num > 1000000000000) return num;
        if (num > 1000000000) return num * 1000;
      }

      const ms = new Date(mainExpire as string | number | Date).getTime();

      if (!Number.isNaN(ms)) {
        return ms;
      }
    }

    if (extra.timeout) {
      const timeoutSeconds = Number(extra.timeout);

      if (Number.isFinite(timeoutSeconds) && timeoutSeconds > 0) {
        return Date.now() + timeoutSeconds * 1000;
      }
    }

    if (extra.createdAt) {
      if (
        typeof extra.createdAt === "object" &&
        "seconds" in extra.createdAt &&
        extra.createdAt.seconds
      ) {
        return extra.createdAt.seconds * 1000 + 20 * 60 * 1000;
      }

      const createdMs = new Date(
        extra.createdAt as string | number | Date,
      ).getTime();

      if (!Number.isNaN(createdMs)) {
        return createdMs + 20 * 60 * 1000;
      }
    }

    return Date.now() + 20 * 60 * 1000;
  };

  const formatCountdown = (totalSeconds: number) => {
    const safeSeconds = Math.max(0, totalSeconds);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0",
    )}`;
  };

  const processMainRefund = async (
    currentOrder: NokosOrder,
    status: "cancelled" | "failed",
  ) => {
    if (!id || refundProcessedRef.current) return;

    refundProcessedRef.current = true;

    stopTimers();
    stopCountdown();
    setPolling(false);
    setApiStatus(status);

    await refundNokosOrder(id, status);

    if (currentOrder.userId) {
      await syncWalletFromHistory(currentOrder.userId);
    }

    setOrder((prev) =>
      prev
        ? ({
            ...prev,
            status,
            refunded: true,
          } as NokosOrder)
        : prev,
    );

    toast({
      title: "Pesanan dibatalkan",
      description:
        "Pesanan dibatalkan karena tidak menerima otp dan salo ewallet kamu telah dikembalikan.",
    });
  };

  useEffect(() => {
    if (!id) return;

    let mounted = true;

    getNokosOrder(id)
      .then((o) => {
        if (!mounted) return;

        setOrder(o);

        if (o?.otp) setOtp(o.otp);

        if ((o as NokosOrder & { sms?: string })?.sms) {
          setSms((o as NokosOrder & { sms?: string }).sms || null);
        }

        if (o?.status === "done") {
          setApiStatus("done");
          setPolling(false);
        }

        if (
          o?.status === "received" &&
          !(o as NokosOrder & { otp?: string }).otp
        ) {
          setApiStatus("received");
          setPolling(true);
        }

        if (
          o?.status === "cancelled" ||
          o?.status === "canceled" ||
          o?.status === "failed"
        ) {
          setApiStatus(o.status);
          setPolling(false);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      stopTimers();
      stopCountdown();
    };
  }, [id]);

  useEffect(() => {
    if (!order) return;

    stopCountdown();

    if (
      order.status === "done" ||
      order.status === "cancelled" ||
      order.status === "canceled" ||
      order.status === "failed"
    ) {
      setRemainingSeconds(0);
      return;
    }

    const expireMs = getOrderExpireMs(order);

    const updateCountdown = () => {
      const left = Math.max(0, Math.floor((expireMs - Date.now()) / 1000));

      setRemainingSeconds(left);

      if (left <= 0) {
        stopCountdown();
      }
    };

    updateCountdown();

    countdownRef.current = setInterval(updateCountdown, 1000);

    return () => {
      stopCountdown();
    };
  }, [order]);

  const checkOtp = async (activationId: string) => {
    if (!id || !order || processedRef.current) return;

    try {
      const raw = await getNokosOtp(activationId);
      console.log("OTP RAW RESPONSE:", raw);

      const {
        otp: receivedOtp,
        status,
        sms: receivedSms,
      } = extractOtp(raw);

      const normalizedStatus = String(status || "").toLowerCase();

      setApiStatus(normalizedStatus || "waiting");

      if (receivedSms) setSms(receivedSms);

      const isReceived =
        normalizedStatus === "status_ok" ||
        normalizedStatus === "ok" ||
        normalizedStatus === "received" ||
        normalizedStatus === "success" ||
        normalizedStatus === "done" ||
        normalizedStatus === "completed";

      const isCancelledByMain =
        normalizedStatus === "status_cancel" ||
        normalizedStatus === "cancelled" ||
        normalizedStatus === "canceled" ||
        normalizedStatus === "failed" ||
        normalizedStatus === "expired";

      if (receivedOtp || isReceived) {
        if (receivedOtp) {
          processedRef.current = true;
          setOtp(receivedOtp);
          setPolling(false);
          stopTimers();
          stopCountdown();

          await updateNokosOrder(id, {
            otp: receivedOtp,
            sms: receivedSms || sms || null,
            status: "done",
          } as Partial<NokosOrder>);

          setOrder((prev) =>
            prev
              ? ({
                  ...prev,
                  otp: receivedOtp,
                  sms: receivedSms || sms || null,
                  status: "done",
                } as NokosOrder)
              : prev,
          );

          toast({
            title: "OTP diterima",
            description: `Kode: ${receivedOtp}`,
          });

          return;
        }

        await updateNokosOrder(id, {
          sms: receivedSms || sms || null,
          status: "received",
        } as Partial<NokosOrder>);

        setOrder((prev) =>
          prev
            ? ({
                ...prev,
                sms: receivedSms || sms || null,
                status: "received",
              } as NokosOrder)
            : prev,
        );

        return;
      }

      if (isCancelledByMain) {
        processedRef.current = true;
        await processMainRefund(order, "cancelled");
      }
    } catch {
      // retry next poll
    }
  };

  useEffect(() => {
    if (!order?.nokosOrderId || !polling) return;

    checkOtp(order.nokosOrderId);

    intervalRef.current = setInterval(() => {
      checkOtp(order.nokosOrderId);
    }, 5000);

    timeoutRef.current = setTimeout(() => {
      stopTimers();
      setPolling(false);
      setApiStatus("waiting");

      toast({
        title: "Waktu Habis",
        description:
        "kode otp tidak diterima. pesanan gagal dan saldo akan dikembalikan otomatis ke saldo wallet web.",
      });
    }, 20 * 60 * 1000);

    return () => {
      stopTimers();
    };
  }, [order?.nokosOrderId, polling]);

  const handleCopy = (text: string, key: "otp" | "phone" | "sms") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const fmt = (v: number) => `Rp${v.toLocaleString("id-ID")}`;

  if (loading) {
    return (
      <AppLayout title="Detail Order">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!order) {
    return (
      <AppLayout title="Detail Order">
        <div className="text-center py-20 space-y-3">
          <XCircle className="w-10 h-10 text-muted-foreground mx-auto" />

          <p className="font-bold text-foreground">Order tidak ditemukan</p>

          <button
            onClick={() => navigate("/nokos")}
            className="text-primary text-sm font-bold underline"
          >
            Kembali ke Nokos
          </button>
        </div>
      </AppLayout>
    );
  }

  const orderSms = (order as NokosOrder & { sms?: string }).sms || sms;
  const currentOtp = otp || order.otp || null;

  const isDone = order.status === "done" || !!currentOtp;
  const isReceived = order.status === "received" || apiStatus === "received";
  const isCancelled =
    order.status === "cancelled" ||
    order.status === "canceled" ||
    apiStatus === "cancelled" ||
    apiStatus === "canceled";
  const isFailed = order.status === "failed" || apiStatus === "failed";
  const isActive = !isDone && !isCancelled && !isFailed;
  const isAlmostExpired = remainingSeconds <= 60;

  return (
    <AppLayout title="Detail Order Nokos">
      <div className="space-y-5">
        <button
          onClick={() => navigate("/nokos")}
          className="flex items-center gap-2 text-sm text-muted-foreground font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Beli Nomor Baru
        </button>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl p-5 relative overflow-hidden ${
            isDone
              ? "bg-green-500 text-white"
              : isCancelled || isFailed
                ? "bg-red-500 text-white"
                : "mint-gradient border border-primary/15"
          }`}
        >
          <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />

          <div className="relative z-10 flex items-center gap-3">
            {isDone ? (
              <CheckCircle2 className="w-8 h-8 shrink-0" />
            ) : isCancelled || isFailed ? (
              <XCircle className="w-8 h-8 shrink-0" />
            ) : (
              <Clock className="w-8 h-8 text-primary shrink-0" />
            )}

            <div>
              <h2 className="text-xl font-extrabold">
                {isDone
                  ? "OTP Diterima!"
                  : isCancelled
                    ? "Order Dibatalkan"
                    : isFailed
                      ? "Order Gagal"
                      : isReceived
                        ? "SMS Diterima"
                        : "Menunggu OTP"}
              </h2>

              <p
                className={`text-sm mt-0.5 ${
                  isDone || isCancelled || isFailed
                    ? "text-white/80"
                    : "text-muted-foreground"
                }`}
              >
                {isDone
                  ? "Salin kode OTP di bawah"
                  : isCancelled || isFailed
                    ? "pesanan dibatalkan dan saldo dikembalikan"
                    : isReceived
                      ? "SMS sudah diterima, kode sedang dibaca"
                      : "Menunggu status aktivasi nomor"}
              </p>
            </div>
          </div>
        </motion.div>

        {currentOtp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border-2 border-green-200 rounded-3xl p-5 text-center space-y-3"
          >
            <p className="text-xs font-bold text-green-600 uppercase tracking-wider">
              Kode OTP
            </p>

            <p className="text-5xl font-extrabold text-green-700 tracking-widest">
              {currentOtp}
            </p>

            {orderSms && (
              <p className="text-xs text-green-600 italic">"{orderSms}"</p>
            )}

            <button
              onClick={() => handleCopy(currentOtp, "otp")}
              className="bg-green-500 text-white px-6 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 mx-auto"
            >
              {copied === "otp" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}

              {copied === "otp" ? "Tersalin!" : "Salin OTP"}
            </button>
          </motion.div>
        )}

        {!currentOtp && orderSms && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border-2 border-green-200 rounded-3xl p-5 space-y-3"
          >
            <p className="text-xs font-bold text-green-600 uppercase tracking-wider">
              SMS Masuk
            </p>

            <p className="text-sm text-green-700 font-medium break-words">
              {orderSms}
            </p>

            <button
              onClick={() => handleCopy(orderSms, "sms")}
              className="bg-green-500 text-white px-6 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 mx-auto"
            >
              {copied === "sms" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}

              {copied === "sms" ? "Tersalin!" : "Salin SMS"}
            </button>
          </motion.div>
        )}

        <div className="bg-card border border-card-border rounded-3xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>

              <div className="min-w-0">
                <p className="font-extrabold text-sm text-foreground truncate">
                  {order.serviceName}
                </p>

                <p className="text-xs text-muted-foreground truncate">
                  {order.countryName} · {order.operatorName}
                </p>
              </div>
            </div>

            {isActive && (
              <div
                className={`min-w-[92px] rounded-2xl border px-3 py-2 text-center shrink-0 ${
                  isAlmostExpired
                    ? "bg-red-50 border-red-200"
                    : "bg-primary/10 border-primary/20"
                }`}
              >
                <p
                  className={`text-[10px] font-bold uppercase ${
                    isAlmostExpired ? "text-red-600" : "text-primary"
                  }`}
                >
                  Sisa Waktu
                </p>

                <p
                  className={`text-base font-extrabold leading-tight ${
                    isAlmostExpired ? "text-red-700" : "text-primary"
                  }`}
                >
                  {formatCountdown(remainingSeconds)}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-2xl p-3">
              <p className="text-xs text-muted-foreground font-medium">Harga</p>

              <p className="font-extrabold text-sm mt-0.5">
                {fmt(order.price)}
              </p>
            </div>

            <div className="bg-muted/40 rounded-2xl p-3">
              <p className="text-xs text-muted-foreground font-medium">
                Activation ID
              </p>

              <p className="font-extrabold text-xs mt-0.5 truncate">
                {order.nokosOrderId || "–"}
              </p>
            </div>
          </div>

          <div className="bg-muted/40 rounded-2xl p-3">
            <p className="text-xs text-muted-foreground font-medium">
              Nomor Virtual
            </p>

            <div className="flex items-center justify-between gap-2 mt-0.5">
              <p className="font-extrabold text-lg break-all">
                {order.phone || "Nomor belum tersedia"}
              </p>

              {order.phone && (
                <button
                  onClick={() => handleCopy(order.phone, "phone")}
                  className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0"
                >
                  {copied === "phone" ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {polling && !currentOtp && (
          <div className="bg-card border border-card-border rounded-3xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5 text-primary animate-spin" />
            </div>

            <div>
              <p className="font-bold text-sm">
                {orderSms ? "SMS sudah masuk..." : "Menunggu SMS masuk..."}
              </p>

              <p className="text-xs text-muted-foreground mt-0.5">
                Status: {apiStatus} · Auto-refresh tiap 5 detik
              </p>
            </div>
          </div>
        )}

        {isActive && (
          <div className="bg-orange-50 border border-orange-200 rounded-3xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />

            <div>
              <p className="font-extrabold text-sm text-orange-700">
                Menunggu Status Aktivasi
              </p>

              <p className="text-xs text-orange-600 mt-1 leading-relaxed">
                Jika OTP tidak masuk sampai waktu habis, pesanan akan dibatalkan otomatis oleh 
                sistem yang memantau status aktivasi nomor, dan saldo
                wallet kamu akan dikembalikan otomatis.
              </p>
            </div>
          </div>
        )}

        {(isCancelled || isFailed) && (
          <button
            onClick={() => navigate("/nokos")}
            className="w-full bg-primary text-primary-foreground rounded-2xl p-4 font-bold text-sm flex items-center justify-center gap-2"
          >
            <Smartphone className="w-4 h-4" />
            Beli Nomor Baru
          </button>
        )}
      </div>
    </AppLayout>
  );
}