import { useEffect, useState, useCallback, useRef } from "react";  
import { motion } from "framer-motion";  
import {  
  Smartphone, RefreshCw, Wallet, CheckCircle2, Clock,  
  XCircle, AlertCircle, Loader2, Settings2, Users, Plus, Minus,  
} from "lucide-react";  
import { AppLayout } from "../../components/Layout/AppLayout";  
import { useToast } from "@/hooks/use-toast";  
import {  
  subscribeAllNokosOrders,  
  subscribeNokosDeposits,  
  getSettings,  
  updateSettings,  
  subscribeAllWallets,  
  adminAdjustWallet,
  updateNokosDeposit,
} from "../../lib/firestore";  
import {
  syncNokosBalance,
  extractBalance,
  checkNokosDeposit,
  extractDepositStatus,
} from "../../lib/nokos-api";  
import type { NokosOrder, NokosDeposit, NokosWallet } from "../../types";  

const fmt = (v: number) => `Rp${v.toLocaleString("id-ID")}`;

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;

    if (typeof obj.seconds === "number") {
      return obj.seconds * 1000;
    }

    if (typeof obj.toDate === "function") {
      try {
        return (obj.toDate() as Date).getTime();
      } catch {
        return 0;
      }
    }
  }

  return 0;
}

function getDisplayDepositStatus(dep: NokosDeposit): string {
  if (dep.status !== "pending") return dep.status;

  const expiredAt = toMillis((dep as unknown as Record<string, unknown>).expiresAt);

  if (expiredAt > 0 && expiredAt < Date.now()) {
    return "expired";
  }

  return dep.status;
}

function StatusBadge({ status }: { status: string }) {  
  const map: Record<string, string> = {  
    waiting_otp: "bg-yellow-50 text-yellow-600",  
    done: "bg-green-50 text-green-600",  
    cancelled: "bg-red-50 text-red-600",  
    timeout: "bg-orange-50 text-orange-600",  
    pending: "bg-yellow-50 text-yellow-600",  
    paid: "bg-green-50 text-green-600",  
    expired: "bg-orange-50 text-orange-600",  
    failed: "bg-red-50 text-red-600",  
  };  
  const label: Record<string, string> = {  
    waiting_otp: "Menunggu OTP", done: "Selesai", cancelled: "Dibatalkan",  
    timeout: "Timeout", pending: "Menunggu Bayar", paid: "Lunas",  
    expired: "Expired", failed: "Gagal",  
  };  
  return (  
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${map[status] ?? "bg-muted text-muted-foreground"}`}>  
      {status === "done" || status === "paid" ? <CheckCircle2 className="w-3 h-3" />  
        : status === "waiting_otp" || status === "pending" ? <Clock className="w-3 h-3" />  
        : <XCircle className="w-3 h-3" />}  
      {label[status] ?? status}  
    </span>  
  );  
}  

function AdjustModal({  
  wallet, onClose,  
}: { wallet: NokosWallet; onClose: () => void }) {  
  const { toast } = useToast();  
  const [amount, setAmount] = useState("");  
  const [saving, setSaving] = useState(false);  
  const numAmt = parseInt(amount.replace(/\D/g, "")) || 0;  

  const apply = async (sign: 1 | -1) => {  
    if (!numAmt) return;  
    setSaving(true);  
    try {  
      await adminAdjustWallet(wallet.userId, sign * numAmt, wallet.userEmail, wallet.userName);  
      toast({ title: `Saldo ${sign > 0 ? "ditambah" : "dikurangi"} ${fmt(numAmt)} untuk ${wallet.userName}` });  
      onClose();  
    } catch (e) {  
      toast({ title: "Gagal", description: e instanceof Error ? e.message : "Error", variant: "destructive" });  
    } finally {  
      setSaving(false);  
    }  
  };  

  return (  
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>  
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}  
        className="bg-background rounded-3xl w-full max-w-sm p-5 space-y-4"  
      >  
        <div>  
          <h3 className="text-lg font-extrabold">Atur Saldo Manual</h3>  
          <p className="text-xs text-muted-foreground mt-0.5">{wallet.userName} · saldo: <span className="font-bold text-primary">{fmt(wallet.balance)}</span></p>  
        </div>  
        <input type="tel" inputMode="numeric" placeholder="Jumlah (Rp)"  
          value={numAmt ? fmt(numAmt) : ""}  
          onChange={e => setAmount(e.target.value.replace(/\D/g, ""))}  
          className="w-full bg-card border-2 border-card-border rounded-2xl p-4 font-bold text-sm focus:border-primary focus:outline-none"  
        />  
        <div className="grid grid-cols-2 gap-3">  
          <button onClick={() => apply(1)} disabled={saving || !numAmt}  
            className="bg-green-500 text-white rounded-2xl p-3 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"  
          >  
            <Plus className="w-4 h-4" /> Tambah  
          </button>  
          <button onClick={() => apply(-1)} disabled={saving || !numAmt}  
            className="bg-red-500 text-white rounded-2xl p-3 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"  
          >  
            <Minus className="w-4 h-4" /> Kurangi  
          </button>  
        </div>  
        <button onClick={onClose} className="w-full text-sm text-muted-foreground py-2">Batal</button>  
      </motion.div>  
    </div>  
  );  
}  

type Tab = "orders" | "deposits" | "wallets" | "settings";  

export default function AdminNokos() {  
  const { toast } = useToast();
  const checkedDepositRef = useRef<Set<string>>(new Set());

  const [tab, setTab] = useState<Tab>("wallets");  
  const [apiBalance, setApiBalance] = useState<number | null>(null);  
  const [balanceLoading, setBalanceLoading] = useState(false);  
  const [balanceError, setBalanceError] = useState<string | null>(null);  

  const [orders, setOrders] = useState<NokosOrder[]>([]);  
  const [deposits, setDeposits] = useState<NokosDeposit[]>([]);  
  const [wallets, setWallets] = useState<NokosWallet[]>([]);  
  const [adjustTarget, setAdjustTarget] = useState<NokosWallet | null>(null);  

  const [markup, setMarkup] = useState<number>(0);  
  const [markupSaving, setMarkupSaving] = useState(false);  

  useEffect(() => {  
    getSettings().then(s => {  
      const data = s as Record<string, unknown>;  
      setMarkup(typeof data.nokosMarkup === "number" ? data.nokosMarkup : 0);  
    });  
  }, []);  

  useEffect(() => {  
    const unsub1 = subscribeAllNokosOrders(setOrders);  
    const unsub2 = subscribeNokosDeposits(setDeposits);  
    const unsub3 = subscribeAllWallets(setWallets);  
    return () => { unsub1(); unsub2(); unsub3(); };  
  }, []);

  useEffect(() => {
    const pendingDeposits = deposits.filter(dep => dep.status === "pending");

    if (pendingDeposits.length === 0) return;

    pendingDeposits.forEach(async dep => {
      if (!dep.id) return;
      if (checkedDepositRef.current.has(dep.id)) return;

      checkedDepositRef.current.add(dep.id);

      try {
        const expiredAt = toMillis((dep as unknown as Record<string, unknown>).expiresAt);

        if (expiredAt > 0 && expiredAt < Date.now()) {
          await updateNokosDeposit(dep.id, { status: "expired" });
          return;
        }

        if (dep.transactionId) {
          const raw = await checkNokosDeposit(dep.transactionId);
          const result = extractDepositStatus(raw);
          const status = String(result.status || "").toLowerCase();

          if (["paid", "success", "sukses", "settlement", "completed"].includes(status)) {
            await updateNokosDeposit(dep.id, { status: "paid" });
            return;
          }

          if (["expired", "failed", "cancelled", "canceled"].includes(status)) {
            await updateNokosDeposit(dep.id, {
              status: status === "canceled" ? "cancelled" : status,
            });
            return;
          }
        }
      } catch {
        checkedDepositRef.current.delete(dep.id);
      }
    });
  }, [deposits]);

  const syncBalance = useCallback(async () => {  
    setBalanceLoading(true); setBalanceError(null);  
    try {  
      const raw = await syncNokosBalance();  
      setApiBalance(extractBalance(raw));  
      toast({ title: "Saldo API berhasil disync" });  
    } catch (e) {  
      setBalanceError(e instanceof Error ? e.message : "Gagal");  
      toast({ title: "Gagal sync saldo", variant: "destructive" });  
    } finally { setBalanceLoading(false); }  
  }, [toast]);  

  useEffect(() => { syncBalance(); }, [syncBalance]);  

  const saveMarkup = async () => {  
    setMarkupSaving(true);  
    try { await updateSettings({ nokosMarkup: markup }); toast({ title: "Markup disimpan" }); }  
    catch { toast({ title: "Gagal menyimpan", variant: "destructive" }); }  
    finally { setMarkupSaving(false); }  
  };  

  const totalUserBalance = wallets.reduce((s, w) => s + (w.balance || 0), 0);  
  const totalUserTopup = wallets.reduce((s, w) => s + (w.totalTopup || 0), 0);  

  const tabs: { key: Tab; label: string }[] = [  
    { key: "wallets", label: `Wallet (${wallets.length})` },  
    { key: "orders", label: `Order (${orders.length})` },  
    { key: "deposits", label: `Topup (${deposits.length})` },  
    { key: "settings", label: "Setting" },  
  ];  

  return (  
    <>  
      <AppLayout title="Admin Nokos">  
        <div className="space-y-5">  
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}  
            className="rounded-3xl p-5 bg-green-500 text-white relative overflow-hidden"  
          >  
            <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />  
            <div className="relative z-10">  
              <div className="flex items-start justify-between gap-3">  
                <div className="flex items-center gap-3">  
                  <Smartphone className="w-8 h-8" />  
                  <div>  
                    <h2 className="text-xl font-extrabold">Admin Nokos</h2>  
                    <p className="text-white/80 text-xs mt-0.5">Saldo API nokos.co.id</p>  
                  </div>  
                </div>  
                <button onClick={syncBalance} disabled={balanceLoading}  
                  className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"  
                >  
                  <RefreshCw className={`w-4 h-4 ${balanceLoading ? "animate-spin" : ""}`} />  
                </button>  
              </div>  

              <div className="mt-4 pt-4 border-t border-white/20">  
                <div className="flex items-end gap-3">  
                  <Wallet className="w-5 h-5 text-white/70" />  
                  <div>  
                    <p className="text-white/70 text-xs font-medium">Saldo API nokos.co.id</p>  
                    {balanceLoading ? (  
                      <div className="flex items-center gap-2 text-white text-sm mt-0.5"><Loader2 className="w-4 h-4 animate-spin" /> Memuat...</div>  
                    ) : balanceError ? (  
                      <div className="flex items-center gap-2 text-white text-sm mt-0.5"><AlertCircle className="w-4 h-4" /> {balanceError}</div>  
                    ) : (  
                      <p className="text-3xl font-extrabold text-white mt-0.5">{apiBalance !== null ? fmt(apiBalance) : "–"}</p>  
                    )}  
                  </div>  
                </div>  
              </div>  

              <div className="mt-3 grid grid-cols-2 gap-2">  
                <div className="bg-white/15 rounded-2xl p-3">  
                  <p className="text-white/70 text-[10px] font-medium">Total Saldo User</p>  
                  <p className="text-white font-extrabold text-sm mt-0.5">{fmt(totalUserBalance)}</p>  
                </div>  
                <div className="bg-white/15 rounded-2xl p-3">  
                  <p className="text-white/70 text-[10px] font-medium">Total Topup Semua User</p>  
                  <p className="text-white font-extrabold text-sm mt-0.5">{fmt(totalUserTopup)}</p>  
                </div>  
              </div>  
            </div>  
          </motion.div>  

          <div className="flex gap-1 bg-muted rounded-2xl p-1 overflow-x-auto">  
            {tabs.map(t => (  
              <button key={t.key} onClick={() => setTab(t.key)}  
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${tab === t.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}  
              >  
                {t.label}  
              </button>  
            ))}  
          </div>  

          {tab === "wallets" && (  
            <div className="space-y-3">  
              {wallets.length === 0 && (  
                <div className="text-center py-10 space-y-2">  
                  <Users className="w-10 h-10 text-muted-foreground mx-auto" />  
                  <p className="text-sm text-muted-foreground">Belum ada user yang memiliki wallet nokos</p>  
                </div>  
              )}  
              {wallets.map(w => (  
                <div key={w.id} className="bg-card border border-card-border rounded-3xl p-4 space-y-3">  
                  <div className="flex items-start justify-between gap-3">  
                    <div className="min-w-0">  
                      <p className="font-extrabold text-sm text-foreground truncate">{w.userName || "User"}</p>  
                      <p className="text-xs text-muted-foreground truncate">{w.userEmail}</p>  
                    </div>  
                    <p className="font-extrabold text-lg text-primary shrink-0">{fmt(w.balance)}</p>  
                  </div>  

                  <div className="grid grid-cols-2 gap-2">  
                    <div className="bg-green-50 rounded-2xl p-2.5">  
                      <p className="text-[10px] text-green-600 font-medium">Total Topup</p>  
                      <p className="font-bold text-xs text-green-700 mt-0.5">{fmt(w.totalTopup || 0)}</p>  
                    </div>  
                    <div className="bg-muted/40 rounded-2xl p-2.5">  
                      <p className="text-[10px] text-muted-foreground font-medium">Total Terpakai</p>  
                      <p className="font-bold text-xs mt-0.5">{fmt(w.totalSpent || 0)}</p>  
                    </div>  
                  </div>  

                  <button onClick={() => setAdjustTarget(w)}  
                    className="w-full border border-primary/30 text-primary rounded-2xl py-2 text-xs font-bold flex items-center justify-center gap-2"  
                  >  
                    <Wallet className="w-3.5 h-3.5" /> Atur Saldo Manual  
                  </button>  
                </div>  
              ))}  
            </div>  
          )}  

          {tab === "orders" && (  
            <div className="space-y-3">  
              {orders.length === 0 && (  
                <div className="text-center py-10 text-muted-foreground text-sm">Belum ada order nokos</div>  
              )}  
              {orders.map(order => (  
                <div key={order.id} className="bg-card border border-card-border rounded-3xl p-4 space-y-3">  
                  <div className="flex items-start justify-between gap-3">  
                    <div className="min-w-0">  
                      <p className="font-extrabold text-sm truncate">{order.serviceName}</p>  
                      <p className="text-xs text-muted-foreground">{order.countryName} · {order.operatorName}</p>  
                      <p className="text-xs text-muted-foreground">{order.userEmail}</p>  
                    </div>  
                    <StatusBadge status={order.status} />  
                  </div>  
                  <div className="grid grid-cols-2 gap-2">  
                    {order.phone && (  
                      <div className="bg-muted/40 rounded-2xl p-2.5">  
                        <p className="text-[10px] text-muted-foreground font-medium">Nomor</p>  
                        <p className="font-bold text-xs mt-0.5">{order.phone}</p>  
                      </div>  
                    )}  
                    {order.otp && (  
                      <div className="bg-green-50 rounded-2xl p-2.5">  
                        <p className="text-[10px] text-green-600 font-medium">OTP</p>  
                        <p className="font-extrabold text-sm text-green-700 mt-0.5 tracking-widest">{order.otp}</p>  
                      </div>  
                    )}  
                    <div className="bg-muted/40 rounded-2xl p-2.5">  
                      <p className="text-[10px] text-muted-foreground font-medium">Harga</p>  
                      <p className="font-bold text-xs mt-0.5">{fmt(order.price)}</p>  
                    </div>  
                    <div className="bg-muted/40 rounded-2xl p-2.5">  
                      <p className="text-[10px] text-muted-foreground font-medium">Activation ID</p>  
                      <p className="font-bold text-xs mt-0.5 truncate">{order.nokosOrderId || "–"}</p>  
                    </div>  
                  </div>  
                </div>  
              ))}  
            </div>  
          )}  

          {tab === "deposits" && (  
            <div className="space-y-3">  
              <div className="bg-blue-50 border border-blue-200 rounded-3xl p-4 text-sm text-blue-700">  
                <p className="font-bold">Cara kerja topup:</p>  
                <p className="mt-1 text-xs leading-relaxed">  
                  User topup via QRIS langsung ke nokos.co.id → saldo API bertambah → saldo wallet user di app bertambah otomatis.  
                  Semua transaksi tercatat di sini.  
                </p>  
              </div>  
              {deposits.length === 0 && (  
                <div className="text-center py-10 text-muted-foreground text-sm">Belum ada riwayat topup</div>  
              )}  
              {deposits.map(dep => (  
                <div key={dep.id} className="bg-card border border-card-border rounded-3xl p-4 space-y-2">  
                  <div className="flex items-start justify-between gap-3">  
                    <div className="min-w-0">  
                      <p className="font-extrabold text-sm">{fmt(dep.amount)}</p>  
                      <p className="text-xs text-muted-foreground mt-0.5">{dep.userEmail} · {dep.userName}</p>  
                      {dep.transactionId && (  
                        <p className="text-[10px] text-muted-foreground">ID: {dep.transactionId}</p>  
                      )}  
                    </div>  
                    <StatusBadge status={getDisplayDepositStatus(dep)} />  
                  </div>  
                </div>  
              ))}  
            </div>  
          )}  

          {tab === "settings" && (  
            <div className="space-y-4">  
              <div className="bg-card border border-card-border rounded-3xl p-5 space-y-4">  
                <div className="flex items-center gap-3">  
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">  
                    <Settings2 className="w-5 h-5 text-primary" />  
                  </div>  
                  <div>  
                    <p className="font-extrabold text-sm">Markup Harga</p>  
                    <p className="text-xs text-muted-foreground">Persentase di atas harga API</p>  
                  </div>  
                </div>  
                <div className="flex items-center gap-3">  
                  <input type="number" min={0} max={500} value={markup} onChange={e => setMarkup(Number(e.target.value))}  
                    className="flex-1 rounded-2xl border border-card-border bg-muted/30 p-3 text-sm outline-none focus:border-primary"  
                    placeholder="Contoh: 10 = +10%"  
                  />  
                  <span className="text-sm font-bold text-muted-foreground">%</span>  
                </div>  
                {markup > 0 && (  
                  <p className="text-xs text-muted-foreground bg-muted/40 rounded-2xl p-3">  
                    Contoh: harga API Rp1.000 → user bayar Rp{Math.round(1000 * (1 + markup / 100)).toLocaleString("id-ID")}  
                  </p>  
                )}  
                <button onClick={saveMarkup} disabled={markupSaving}  
                  className="w-full bg-primary text-primary-foreground rounded-2xl p-3 font-bold text-sm flex items-center justify-center gap-2"  
                >  
                  {markupSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}  
                  {markupSaving ? "Menyimpan..." : "Simpan"}  
                </button>  
              </div>  

              <div className="bg-muted/30 rounded-3xl p-4 text-xs text-muted-foreground space-y-1">  
                <p className="font-bold">Sistem Wallet:</p>  
                <p>• Setiap user punya saldo wallet sendiri di Firestore</p>  
                <p>• Topup QRIS → saldo API nokos.co.id naik → wallet user naik</p>  
                <p>• Beli nomor → wallet user berkurang sebesar harga API</p>  
                <p>• Admin bisa atur saldo manual di tab "Wallet"</p>  
                <p>• API Key: dari env NOKOS_API_KEY (tidak tampil di frontend)</p>  
              </div>  
            </div>  
          )}  
        </div>  
      </AppLayout>  

      {adjustTarget && (  
        <AdjustModal wallet={adjustTarget} onClose={() => setAdjustTarget(null)} />  
      )}  
    </>  
  );  
}