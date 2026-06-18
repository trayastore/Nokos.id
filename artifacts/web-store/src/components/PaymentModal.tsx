import { useState, useEffect, useRef, useCallback } from "react";
import { X, Loader2, Copy, Download, Shield, Clock, AlertTriangle, CheckCircle2, MessageCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  createTransaction, createManualOrder, upgradeUserToReseller, updateTransaction,
  getRecentPendingTransaction,
} from "../lib/firestore";
import { createQrisPayment, checkDepositStatus, isDepositSuccess } from "../lib/ramashop";
import { useToast } from "../hooks/use-toast";
import type { Product, Panel, ResellerPackage } from "../types";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  item: {
    type: "product" | "panel" | "reseller";
    product?: Product;
    panel?: Panel;
    resellerPackage?: ResellerPackage;
    variantId?: string;
    variantName?: string;
    panelVariantId?: string;
    panelVariantName?: string;
    price: number;
    name: string;
    buyerNote?: string;
  } | null;
  onSuccess?: () => void;
}

type PayStep = "confirm" | "qris" | "success";

interface QrisInfo {
  depositId: string;
  qrImage: string;
  qrString: string;
  totalAmount: number;
  expiredAt?: string;
}

function AnimatedCheck() {
  return (
    <svg viewBox="0 0 52 52" className="w-full h-full" style={{ filter: "drop-shadow(0 0 8px rgba(52,211,153,0.5))" }}>
      <circle cx="26" cy="26" r="24" fill="none" stroke="url(#checkGrad)" strokeWidth="2.5"
        strokeDasharray="151" strokeDashoffset="0"
        style={{ animation: "checkCircle 0.5s cubic-bezier(0.65,0,0.45,1) forwards" }} />
      <path fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
        d="M14 27 l9 9 l15 -16" strokeDasharray="40" strokeDashoffset="40"
        style={{ animation: "checkMark 0.4s 0.4s cubic-bezier(0.65,0,0.45,1) forwards" }} />
      <defs>
        <linearGradient id="checkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(152,60%,50%)" />
          <stop offset="100%" stopColor="hsl(160,55%,38%)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Confetti() {
  const dots = [
    { color: "#4ade80", left: "10%", delay: "0s", size: 8 },
    { color: "#60a5fa", left: "25%", delay: "0.1s", size: 6 },
    { color: "#facc15", left: "40%", delay: "0.05s", size: 7 },
    { color: "#f472b6", left: "55%", delay: "0.15s", size: 5 },
    { color: "#34d399", left: "70%", delay: "0.08s", size: 9 },
    { color: "#a78bfa", left: "85%", delay: "0.12s", size: 6 },
    { color: "#fb923c", left: "18%", delay: "0.2s", size: 5 },
    { color: "#38bdf8", left: "60%", delay: "0.18s", size: 7 },
    { color: "#f87171", left: "78%", delay: "0.07s", size: 6 },
    { color: "#4ade80", left: "92%", delay: "0.22s", size: 5 },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ borderRadius: "inherit" }}>
      {dots.map((d, i) => (
        <span key={i} style={{
          position: "absolute", top: "-10px", left: d.left,
          width: d.size, height: d.size, borderRadius: "50%",
          background: d.color,
          animation: `confettiFall 0.9s ${d.delay} cubic-bezier(0.25,0.46,0.45,0.94) forwards`,
        }} />
      ))}
    </div>
  );
}

export function PaymentModal({ open, onClose, item, onSuccess }: PaymentModalProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<PayStep>("confirm");
  const [animKey, setAnimKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [qrisInfo, setQrisInfo] = useState<QrisInfo | null>(null);
  const [txId, setTxId] = useState("");
  const [buyerNote, setBuyerNote] = useState("");
  const [buyerWhatsapp, setBuyerWhatsapp] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [expired, setExpired] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const txIdRef = useRef("");
  const successProcessingRef = useRef(false);

  const adminWa = import.meta.env.VITE_ADMIN_WHATSAPP || "6285782544861";

  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const goToStep = useCallback((s: PayStep) => {
    setAnimKey(k => k + 1);
    setStep(s);
  }, []);

  useEffect(() => {
    if (!qrisInfo?.expiredAt || step !== "qris") { stopTimer(); return; }
    const calc = () => Math.max(0, Math.floor((new Date(qrisInfo.expiredAt!).getTime() - Date.now()) / 1000));
    setTimeLeft(calc());
    setExpired(calc() === 0);
    stopTimer();
    timerRef.current = setInterval(() => {
      const left = calc();
      setTimeLeft(left);
      if (left === 0) { setExpired(true); stopTimer(); stopPoll(); }
    }, 1000);
    return () => stopTimer();
  }, [qrisInfo, step, stopTimer, stopPoll]);

  useEffect(() => {
    if (!open) {
      stopPoll(); stopTimer();
      setStep("confirm"); setAnimKey(0);
      setQrisInfo(null); setTxId(""); txIdRef.current = ""; successProcessingRef.current = false;
      setBuyerNote(""); setBuyerWhatsapp(""); setTimeLeft(0); setExpired(false);
    }
  }, [open, stopPoll, stopTimer]);

  useEffect(() => () => { stopPoll(); stopTimer(); }, [stopPoll, stopTimer]);

  if (!item) return null;

  const fmtTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const timerColor = expired ? "#ef4444" : timeLeft < 30 ? "#ef4444" : timeLeft < 120 ? "#f59e0b" : "#10b981";
  const timerBg = expired ? "rgba(239,68,68,0.1)" : timeLeft < 30 ? "rgba(239,68,68,0.1)" : timeLeft < 120 ? "rgba(245,158,11,0.08)" : "rgba(16,185,129,0.08)";

  /* ── Post-payment handler ── */
  const handlePaymentSuccess = async (currentTxId: string) => {
    if (!userProfile || !item) return;
    try {
      if (item.type === "reseller" && item.resellerPackage) {
        const expiry = await upgradeUserToReseller(userProfile.id, item.resellerPackage);
        await updateTransaction(currentTxId, {
          paymentStatus: "paid",
          orderStatus: "done",
          resellerActiveUntil: expiry,
        });
      } else if (item.type === "product" && item.product) {
        const manualOrderId = await createManualOrder({
          transactionId: currentTxId,
          userId: userProfile.id,
          userEmail: userProfile.email,
          userName: userProfile.displayName,
          buyerWhatsapp: buyerWhatsapp.trim() || "",
          type: "product",
          productId: item.product.id,
          productName: item.product.name,
          variantId: item.variantId,
          variantName: item.variantName,
          amount: item.price,
          buyerNote: buyerNote.trim() || "",
          status: "waiting",
        });
        await updateTransaction(currentTxId, {
          paymentStatus: "paid",
          orderStatus: "waiting_admin",
          manualOrderId,
        });
      } else if (item.type === "panel" && item.panel) {
        const manualOrderId = await createManualOrder({
          transactionId: currentTxId,
          userId: userProfile.id,
          userEmail: userProfile.email,
          userName: userProfile.displayName,
          buyerWhatsapp: buyerWhatsapp.trim() || "",
          type: "panel",
          panelId: item.panel.id,
          panelName: item.panel.name,
          panelVariantId: item.panelVariantId,
          panelVariantName: item.panelVariantName,
          amount: item.price,
          buyerNote: buyerNote.trim() || "",
          status: "waiting",
        });
        await updateTransaction(currentTxId, {
          paymentStatus: "paid",
          orderStatus: "waiting_admin",
          manualOrderId,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Pembayaran diterima tapi gagal buat order", description: msg, variant: "destructive" });
    }
  };

  const handleCheckStatus = async (info: QrisInfo = qrisInfo!, silent = false) => {
    if (!info?.depositId) return;
    if (!silent) setChecking(true);
    try {
      const res = await checkDepositStatus(info.depositId);
      if (isDepositSuccess(res.status)) {
        if (successProcessingRef.current) return;
        successProcessingRef.current = true;
        stopPoll();
        const currentTxId = txIdRef.current;
        await handlePaymentSuccess(currentTxId);
        goToStep("success");
        // onSuccess deferred to success-screen dismiss so the animation plays fully
      } else if (!silent) {
        toast({ title: "Belum terbayar", description: "Selesaikan pembayaran dan cek kembali." });
      }
    } catch {
      if (!silent) toast({ title: "Gagal cek status", variant: "destructive" });
    } finally {
      if (!silent) setChecking(false);
    }
  };

  const startPolling = (info: QrisInfo) => {
    stopPoll();
    handleCheckStatus(info, true);
    pollRef.current = setInterval(() => handleCheckStatus(info, true), 5000);
  };

  const handleCreateQris = async () => {
    if (!userProfile) return;
    setLoading(true);
    let newTxId = "";
    try {
      // Check for existing pending transaction (anti-duplicate: within 10 minutes)
      const txType = item.type === "reseller" ? "reseller_upgrade" : item.type;
      const existingTx = await getRecentPendingTransaction(
        userProfile.id,
        txType as "product" | "panel" | "reseller_upgrade",
        {
          productId: item.product?.id,
          variantId: item.variantId,
          panelId: item.panel?.id,
          panelVariantId: item.panelVariantId,
          resellerPackageId: item.resellerPackage?.id,
        },
      );
      if (existingTx?.qrisDepositId) {
        newTxId = existingTx.id;
        setTxId(newTxId);
        txIdRef.current = newTxId;
        const info: QrisInfo = {
          depositId: existingTx.qrisDepositId,
          qrImage: existingTx.qrisImage || "",
          qrString: "",
          totalAmount: existingTx.amount,
        };
        setQrisInfo(info);
        goToStep("qris");
        startPolling(info);
        toast({ title: "Melanjutkan pembayaran sebelumnya" });
        return;
      }

      const txData: Parameters<typeof createTransaction>[0] = {
        userId: userProfile.id,
        userEmail: userProfile.email || "",
        userName: userProfile.displayName || "",
        type: item.type === "reseller" ? "reseller_upgrade" : item.type,
        amount: item.price,
        method: "qris",
        paymentStatus: "pending",
        orderStatus: "pending_payment",
      };

      if (buyerNote.trim()) {
        txData.buyerNote = buyerNote.trim();
      }

      if (item.type === "product" && item.product) {
        txData.productId = item.product.id;
        txData.productName = item.product.name;
        txData.variantId = item.variantId || "";
        txData.variantName = item.variantName || "";
      }

      if (item.type === "panel" && item.panel) {
        txData.panelId = item.panel.id;
        txData.panelName = item.panel.name;
        txData.panelVariantId = item.panelVariantId || "";
        txData.panelVariantName = item.panelVariantName || "";
      }

      if (item.type === "reseller" && item.resellerPackage) {
        txData.resellerPackageId = item.resellerPackage.id;
        txData.resellerPackageName = item.resellerPackage.name;
      }

      newTxId = await createTransaction(txData);
      setTxId(newTxId);
      txIdRef.current = newTxId;

      const qres = await createQrisPayment(item.price);

      if (!qres.success && !qres.status) {
        const msg = qres.message || "";
        let userMsg = "Gagal membuat QRIS. Coba lagi.";
        if (!msg && !qres.data) {
          userMsg = "API Key QRIS belum dikonfigurasi. Set di Admin → Pengaturan.";
        } else if (msg.toLowerCase().includes("api key") || msg.toLowerCase().includes("unauthorized")) {
          userMsg = "API Key tidak valid. Periksa Pengaturan Admin.";
        } else if (msg.toLowerCase().includes("balance") || msg.toLowerCase().includes("saldo")) {
          userMsg = "Saldo RamaShop tidak cukup. Hubungi admin.";
        } else if (msg) {
          userMsg = msg;
        }
        toast({ title: "Gagal membuat QRIS", description: userMsg, variant: "destructive" });
        await updateTransaction(newTxId, { paymentStatus: "failed", orderStatus: "cancelled" });
        return;
      }

      if (!qres.data?.depositId) {
        toast({ title: "Gagal membuat QRIS", description: "Response API kosong. Pastikan API Key QRIS benar.", variant: "destructive" });
        return;
      }

      const info: QrisInfo = {
        depositId: qres.data.depositId,
        qrImage: qres.data.qrImage || "",
        qrString: qres.data.qrString || "",
        totalAmount: qres.data.totalAmount || item.price,
        expiredAt: qres.data.expiredAt,
      };

      await updateTransaction(newTxId, {
        qrisDepositId: info.depositId,
        qrisImage: info.qrImage || "",
      });
      setQrisInfo(info);
      goToStep("qris");
      startPolling(info);
    } catch (err) {
      const msg = (err as Error)?.message ?? String(err);
      toast({ title: "Gagal membuat QRIS", description: msg || "Coba lagi atau hubungi admin.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, label = "Disalin!") => {
    navigator.clipboard.writeText(text);
    toast({ title: label });
  };

  const handleDownloadQr = () => {
    if (!qrisInfo?.qrImage) return;
    const a = document.createElement("a");
    a.href = qrisInfo.qrImage;
    a.download = `QRIS-${qrisInfo.depositId}.png`;
    a.target = "_blank";
    a.click();
  };

  const successMsg = item.type === "reseller"
    ? "Selamat! Role kamu sudah diupgrade ke Reseller 🎉"
    : "Pembayaran diterima! Admin akan segera memproses pesananmu.";

  const successSub = item.type === "reseller"
    ? "Nikmati harga spesial reseller di semua produk."
    : "Cek \"Data APK Premium\" atau \"Panel Aktif\" setelah admin selesai.";

  return (
    <>
      <style>{`
        @keyframes modalIn { from { opacity:0; transform:scale(0.92) translateY(16px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes stepIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes checkCircle { from { stroke-dashoffset:151; } to { stroke-dashoffset:0; } }
        @keyframes checkMark { from { stroke-dashoffset:40; } to { stroke-dashoffset:0; } }
        @keyframes successPop { 0% { opacity:0; transform:scale(0.4) rotate(-10deg); } 60% { transform:scale(1.1) rotate(3deg); } 100% { opacity:1; transform:scale(1) rotate(0deg); } }
        @keyframes confettiFall { from { transform:translateY(0) rotate(0deg); opacity:1; } to { transform:translateY(180px) rotate(540deg); opacity:0; } }
        @keyframes pulseGlow { 0%,100% { box-shadow:0 0 0 0 rgba(52,211,153,0.4); } 50% { box-shadow:0 0 0 12px rgba(52,211,153,0); } }
      `}</style>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={step === "qris" ? undefined : () => { stopPoll(); onClose(); }} />

          <div className="relative bg-card rounded-3xl shadow-2xl w-full max-w-sm border border-card-border overflow-hidden max-h-[92vh] overflow-y-auto"
            style={{ animation: "modalIn 0.35s cubic-bezier(0.34,1.3,0.64,1) both" }}>

            {/* STEP: CONFIRM */}
            {step === "confirm" && (
              <div key="confirm" style={{ animation: "stepIn 0.3s cubic-bezier(0.34,1.3,0.64,1) both" }}>
                <div className="flex items-start justify-between p-5 border-b border-card-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Pembayaran QRIS</p>
                    <p className="font-bold text-foreground text-sm mt-0.5 truncate">{item.name}</p>
                    {item.variantName && <p className="text-[11px] text-muted-foreground mt-0.5">{item.variantName}</p>}
                    {item.panelVariantName && <p className="text-[11px] text-muted-foreground mt-0.5">{item.panelVariantName}</p>}
                  </div>
                  <button onClick={() => { stopPoll(); onClose(); }} className="ml-3 p-2 rounded-xl hover:bg-muted transition-colors flex-shrink-0">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div className="rounded-2xl p-4 text-center" style={{ background: "linear-gradient(135deg, hsl(152,60%,42%), hsl(160,55%,35%))" }}>
                    <p className="text-white/80 text-[11px] font-semibold uppercase tracking-widest mb-1">💳 Total Pembayaran</p>
                    <p className="text-white text-3xl font-extrabold">Rp {item.price.toLocaleString("id-ID")}</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                      Nomor WhatsApp <span className="font-normal">(untuk notifikasi pesanan)</span>
                    </label>
                    <input
                      type="tel"
                      value={buyerWhatsapp}
                      onChange={e => setBuyerWhatsapp(e.target.value.replace(/[^0-9+]/g, ""))}
                      placeholder="Contoh: 08xxxxxxxxxx"
                      className="w-full bg-muted rounded-2xl px-3 py-2.5 text-sm border border-input focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                      Catatan untuk admin <span className="font-normal">(opsional)</span>
                    </label>
                    <textarea
                      value={buyerNote}
                      onChange={e => setBuyerNote(e.target.value)}
                      placeholder="Contoh: akun baru, region Indonesia..."
                      className="w-full bg-muted rounded-2xl p-3 text-sm border border-input focus:outline-none focus:border-primary resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="bg-primary/5 rounded-2xl p-3.5 flex gap-2.5">
                    <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Pembayaran Aman via QRIS</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Semua pesanan diproses manual oleh admin. Data dikirim setelah konfirmasi.</p>
                    </div>
                  </div>

                  <button onClick={handleCreateQris} disabled={loading}
                    className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-primary/30 disabled:opacity-60 text-sm btn-smooth">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Membuat QRIS...</> : <>Buat QRIS & Bayar</>}
                  </button>
                </div>
              </div>
            )}

            {/* STEP: QRIS */}
            {step === "qris" && qrisInfo && (
              <div key={`qris-${animKey}`} style={{ animation: "stepIn 0.35s cubic-bezier(0.34,1.3,0.64,1) both" }}>
                <div className="flex items-start justify-between p-5 border-b border-card-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Scan QRIS</p>
                    <p className="font-bold text-foreground text-sm mt-0.5 truncate">{item.name}</p>
                  </div>
                  <button onClick={() => { stopPoll(); onClose(); }} className="ml-3 p-2 rounded-xl hover:bg-muted transition-colors flex-shrink-0">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div className="rounded-2xl p-3 text-center" style={{ background: "linear-gradient(135deg, hsl(152,60%,42%), hsl(160,55%,35%))" }}>
                    <p className="text-white/75 text-[10px] font-semibold uppercase tracking-widest">💳 TOTAL PEMBAYARAN</p>
                    <p className="text-white text-2xl font-extrabold mt-0.5">Rp {qrisInfo.totalAmount.toLocaleString("id-ID")}</p>
                  </div>

                  {qrisInfo.expiredAt && (
                    <div className="flex items-center justify-between rounded-2xl px-4 py-2.5"
                      style={{ background: timerBg, border: `1.5px solid ${timerColor}30` }}>
                      <div className="flex items-center gap-2">
                        {expired
                          ? <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: timerColor }} />
                          : <Clock className="w-4 h-4 flex-shrink-0" style={{ color: timerColor }} />}
                        <span className="text-xs font-semibold" style={{ color: timerColor }}>
                          {expired ? "QRIS kadaluarsa" : timeLeft < 120 ? "Segera bayar!" : "Sisa waktu bayar"}
                        </span>
                      </div>
                      <span className="font-mono font-extrabold text-base tabular-nums"
                        style={{ color: timerColor, minWidth: "3.5rem", textAlign: "right" }}>
                        {expired ? "00:00" : fmtTime(timeLeft)}
                      </span>
                    </div>
                  )}

                  <div className="relative mx-auto w-56 h-56">
                    <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-xl" style={{ borderColor: timerColor }} />
                    <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-xl" style={{ borderColor: timerColor }} />
                    <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-xl" style={{ borderColor: timerColor }} />
                    <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-xl" style={{ borderColor: timerColor }} />
                    <div className="absolute inset-2 rounded-xl overflow-hidden bg-white flex items-center justify-center">
                      {qrisInfo.qrImage ? (
                        <img src={qrisInfo.qrImage} alt="QRIS"
                          className="w-full h-full object-contain p-1 transition-all duration-300"
                          style={{ filter: expired ? "grayscale(1) opacity(0.35)" : "none" }}
                          crossOrigin="anonymous" />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          <p className="text-xs text-muted-foreground">Memuat QR...</p>
                        </div>
                      )}
                      {expired && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 backdrop-blur-[2px]">
                          <AlertTriangle className="w-9 h-9 text-red-500" />
                          <p className="text-xs font-bold text-red-500 text-center px-2">QR Code Kadaluarsa</p>
                          <p className="text-[10px] text-red-400 text-center">Buat QRIS baru</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-[10px] font-bold text-muted-foreground tracking-widest mb-2">METODE PEMBAYARAN</p>
                    <div className="flex justify-center gap-1.5 flex-wrap">
                      {["DANA", "OVO", "GOPAY", "ShopeePay", "LinkAja"].map(m => (
                        <span key={m} className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">{m}</span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-muted rounded-2xl p-3 text-center space-y-1">
                    <p className="text-[10px] font-mono text-muted-foreground">REF: {qrisInfo.depositId.toUpperCase()}</p>
                    {txId && <p className="text-[10px] font-mono text-muted-foreground">TRX: {txId.slice(0, 8).toUpperCase()}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleCopy(qrisInfo.qrString, "QRIS String disalin!")}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border-2 border-border bg-muted hover:border-primary/40 transition-colors text-xs font-semibold">
                      <Copy className="w-3.5 h-3.5" /> Salin QRIS
                    </button>
                    <button onClick={handleDownloadQr}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border-2 border-border bg-muted hover:border-primary/40 transition-colors text-xs font-semibold">
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>

                  <button onClick={() => handleCheckStatus(undefined, false)} disabled={checking || expired}
                    className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-primary/25 disabled:opacity-60 text-sm">
                    {checking ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengecek...</> : <><CheckCircle2 className="w-4 h-4" /> Sudah Bayar, Cek Status</>}
                  </button>

                  <p className="text-center text-[11px] text-muted-foreground">
                    Status otomatis diperbarui setiap 5 detik
                  </p>
                </div>
              </div>
            )}

            {/* STEP: SUCCESS */}
            {step === "success" && (
              <div key={`success-${animKey}`} style={{ animation: "stepIn 0.4s cubic-bezier(0.34,1.3,0.64,1) both" }} className="relative">
                <Confetti />
                <div className="p-8 flex flex-col items-center text-center gap-5">
                  <div className="w-24 h-24" style={{ animation: "successPop 0.6s 0.1s cubic-bezier(0.34,1.3,0.64,1) both" }}>
                    <AnimatedCheck />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-extrabold text-foreground">Pembayaran Berhasil! 🎉</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{successMsg}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">{successSub}</p>
                  </div>

                  {item.type !== "reseller" && (
                    <a
                      href={`https://wa.me/${adminWa}?text=Halo admin, saya baru saja melakukan pembayaran untuk: ${item.name}. Mohon segera diproses. Terima kasih!`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-2xl px-4 py-2.5 text-xs font-semibold"
                    >
                      <MessageCircle className="w-4 h-4" /> Konfirmasi ke Admin via WA
                    </a>
                  )}

                  <button onClick={() => { onSuccess?.(); onClose(); }}
                    className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-2xl shadow-md shadow-primary/25 text-sm">
                    Lihat Riwayat Transaksi
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}