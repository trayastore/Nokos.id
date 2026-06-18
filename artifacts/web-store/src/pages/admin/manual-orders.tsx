import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, Package, Server, ChevronDown, ChevronUp, Check, X,
  Loader2, Plus, Trash2, MessageCircle, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { AppLayout } from "../../components/Layout/AppLayout";
import {
  subscribeManualOrders, updateManualOrder, updateTransaction,
  createUserProductData, createUserPanelData,
} from "../../lib/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/use-toast";
import type { ManualOrder, DeliveredField } from "../../types";
import { useLocation } from "wouter";

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

type FilterStatus = "all" | "waiting" | "processing" | "done" | "rejected";

export default function AdminManualOrders() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [orders, setOrders] = useState<ManualOrder[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("waiting");
  const [fieldEdits, setFieldEdits] = useState<Record<string, DeliveredField[]>>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const adminWa = import.meta.env.VITE_ADMIN_WHATSAPP || "6285782544861";

  useEffect(() => {
    if (!isAdmin) { setLocation("/"); return; }
    return subscribeManualOrders(setOrders);
  }, [isAdmin, setLocation]);

  const filtered = orders.filter(o => filterStatus === "all" || o.status === filterStatus);
  const counts = {
    all: orders.length,
    waiting: orders.filter(o => o.status === "waiting").length,
    processing: orders.filter(o => o.status === "processing").length,
    done: orders.filter(o => o.status === "done").length,
    rejected: orders.filter(o => o.status === "rejected").length,
  };

  const getFields = (orderId: string, order: ManualOrder): DeliveredField[] => {
    if (fieldEdits[orderId]) return fieldEdits[orderId];
    if (order.deliveredFields?.length) return [...order.deliveredFields];
    return order.type === "panel"
      ? [
          { key: "Login URL", value: "" },
          { key: "Username", value: "" },
          { key: "Password", value: "" },
          { key: "RAM", value: "" },
          { key: "CPU", value: "" },
          { key: "Expired", value: "" },
        ]
      : [{ key: "Email", value: "" }, { key: "Password", value: "" }];
  };

  const setFields = (orderId: string, fields: DeliveredField[]) => {
    setFieldEdits(prev => ({ ...prev, [orderId]: fields }));
  };

  const addField = (orderId: string, order: ManualOrder) => {
    const fields = getFields(orderId, order);
    setFields(orderId, [...fields, { key: "", value: "" }]);
  };

  const removeField = (orderId: string, order: ManualOrder, idx: number) => {
    const fields = getFields(orderId, order).filter((_, i) => i !== idx);
    setFields(orderId, fields);
  };

  const updateField = (orderId: string, order: ManualOrder, idx: number, patch: Partial<DeliveredField>) => {
    const fields = getFields(orderId, order).map((f, i) => i === idx ? { ...f, ...patch } : f);
    setFields(orderId, fields);
  };

  const handleMarkProcessing = async (order: ManualOrder) => {
    setSaving(s => ({ ...s, [order.id]: true }));
    try {
      await updateManualOrder(order.id, { status: "processing" });
      await updateTransaction(order.transactionId, { orderStatus: "processing" });
      toast({ title: "Status diubah ke Diproses" });
    } catch {
      toast({ title: "Gagal ubah status", variant: "destructive" });
    } finally {
      setSaving(s => ({ ...s, [order.id]: false }));
    }
  };

  const handleDeliver = async (order: ManualOrder) => {
    const fields = getFields(order.id, order);
    const note = adminNotes[order.id] || "";

    if (fields.some(f => !f.key.trim() || !f.value.trim())) {
      toast({ title: "Semua field harus terisi (key dan value)", variant: "destructive" });
      return;
    }

    setSaving(s => ({ ...s, [order.id]: true }));
    try {
      await updateManualOrder(order.id, {
        status: "done",
        deliveredFields: fields,
        adminNote: note || "",
      });
      await updateTransaction(order.transactionId, { orderStatus: "done" });

      if (order.type === "product") {
        await createUserProductData({
          userId: order.userId,
          transactionId: order.transactionId,
          manualOrderId: order.id,
          productId: order.productId || "",
          productName: order.productName || "",
          variantName: order.variantName || "",
          fields,
          isActive: true,
        });
      } else if (order.type === "panel") {
        await createUserPanelData({
          userId: order.userId,
          transactionId: order.transactionId,
          manualOrderId: order.id,
          panelId: order.panelId || "",
          panelName: order.panelName || "",
          variantName: order.panelVariantName || "",
          fields,
          isActive: true,
        });
      }

      setFieldEdits(prev => { const n = { ...prev }; delete n[order.id]; return n; });
      setAdminNotes(prev => { const n = { ...prev }; delete n[order.id]; return n; });
      toast({ title: "Data terkirim! Pesanan selesai." });
    } catch (err) {
      toast({ title: "Gagal kirim data", description: (err as Error)?.message, variant: "destructive" });
    } finally {
      setSaving(s => ({ ...s, [order.id]: false }));
    }
  };

  const handleReject = async (order: ManualOrder) => {
    const note = adminNotes[order.id] || "";
    if (!confirm("Tolak pesanan ini?")) return;

    console.log("Reject order:", order);
    console.log("transactionId:", order.transactionId);

    setSaving(s => ({ ...s, [order.id]: true }));

    try {
      await updateManualOrder(order.id, {
        status: "rejected",
        adminNote: note || "",
      });

      if (order.transactionId) {
        await updateTransaction(order.transactionId, {
          orderStatus: "rejected",
        });
      }

      toast({ title: "Pesanan ditolak" });
    } catch (err) {
      console.error("Gagal reject order:", err);
      toast({
        title: "Gagal",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(s => ({ ...s, [order.id]: false }));
    }
  };

  const buildWaText = (order: ManualOrder, fields: DeliveredField[]) => {
    const label = order.type === "panel" ? "Panel" : "Data APK Premium";
    const lines = [
      `Halo *${order.userName}*! 👋`,
      ``,
      `Pesanan kamu sudah diproses ✅`,
      ``,
      `📦 *Produk:* ${order.productName || order.panelName || "-"}`,
      order.variantName || order.panelVariantName ? `🔖 *Varian:* ${order.variantName || order.panelVariantName}` : "",
      ``,
      `🔑 *${label}:*`,
      ...fields.map(f => `*${f.key}:* ${f.value}`),
      ``,
      `Terima kasih sudah belanja di *PremiumStore*! 🙏`,
    ].filter(l => l !== undefined);
    return encodeURIComponent(lines.join("\n"));
  };

  if (!isAdmin) return null;

  return (
    <AppLayout title="Pesanan Manual">
      <div className="space-y-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}>
          <div className="flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-white" />
            <div>
              <h2 className="text-lg font-extrabold text-white">Pesanan Manual</h2>
              <p className="text-white/70 text-xs">
                {counts.waiting} menunggu • {counts.processing} diproses • {counts.done} selesai
              </p>
            </div>
          </div>
          {counts.waiting > 0 && (
            <div className="mt-3 bg-white/20 rounded-2xl px-3 py-2 inline-flex items-center gap-2">
              <Clock className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-xs">{counts.waiting} pesanan menunggu konfirmasi</span>
            </div>
          )}
        </motion.div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["waiting", "processing", "done", "rejected", "all"] as FilterStatus[]).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-card border border-card-border text-muted-foreground"}`}>
              {s === "all" ? "Semua" : s === "waiting" ? "Menunggu" : s === "processing" ? "Diproses" : s === "done" ? "Selesai" : "Ditolak"}
              {" "}({counts[s]})
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 bg-card rounded-2xl border border-card-border">
            <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Tidak ada pesanan</p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map(order => {
            const cfg = statusConfig[order.status] ?? statusConfig.waiting;
            const StatusIcon = cfg.icon;
            const TypeIcon = order.type === "panel" ? Server : Package;
            const isExpanded = expandedId === order.id;
            const fields = getFields(order.id, order);
            const isSaving = saving[order.id] || false;
            const productTitle = order.productName || order.panelName || "Pesanan";
            const variantTitle = order.variantName || order.panelVariantName;

            return (
              <div key={order.id} className="bg-card rounded-2xl border border-card-border overflow-hidden">
                <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${order.type === "panel" ? "bg-blue-100" : "bg-primary/10"}`}>
                      <TypeIcon className={`w-5 h-5 ${order.type === "panel" ? "text-blue-600" : "text-primary"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{productTitle}</p>
                      {variantTitle && <p className="text-[11px] text-muted-foreground">{variantTitle}</p>}
                      <p className="text-[11px] text-muted-foreground">{order.userName} • {order.userEmail}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.color}`}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{fmtTs(order.createdAt)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-sm">Rp {order.amount.toLocaleString("id-ID")}</p>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground mt-1 ml-auto" /> : <ChevronDown className="w-4 h-4 text-muted-foreground mt-1 ml-auto" />}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <div className="px-4 pb-4 pt-0 border-t border-card-border space-y-4">

                        {/* Buyer note */}
                        {order.buyerNote && (
                          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-3">
                            <p className="text-xs font-bold text-amber-700 mb-1">📝 Catatan Pembeli</p>
                            <p className="text-xs text-amber-600">{order.buyerNote}</p>
                          </div>
                        )}

                        {/* Done view */}
                        {order.status === "done" && order.deliveredFields && (
                          <div className="mt-3 bg-primary/5 border border-primary/20 rounded-2xl p-3.5">
                            <p className="text-xs font-bold text-primary mb-2.5">✅ Data Terkirim</p>
                            <div className="space-y-1.5">
                              {order.deliveredFields.map((f, i) => (
                                <div key={i} className="flex items-center justify-between gap-2">
                                  <span className="text-xs text-muted-foreground">{f.key}:</span>
                                  <span className="text-xs font-mono font-semibold text-foreground break-all">{f.value}</span>
                                </div>
                              ))}
                            </div>
                            {order.buyerWhatsapp && (
                              <a href={`https://wa.me/${order.buyerWhatsapp}?text=${buildWaText(order, order.deliveredFields)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="mt-3 flex items-center gap-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 py-2 px-3 rounded-xl w-fit">
                                <MessageCircle className="w-3.5 h-3.5" /> Kirim Ulang WA
                              </a>
                            )}
                          </div>
                        )}

                        {/* Rejected view */}
                        {order.status === "rejected" && (
                          <div className="mt-3 bg-destructive/5 border border-destructive/20 rounded-2xl p-3 text-xs text-destructive">
                            <p className="font-bold mb-1">❌ Ditolak</p>
                            {order.adminNote && <p>{order.adminNote}</p>}
                          </div>
                        )}

                        {/* Action area */}
                        {(order.status === "waiting" || order.status === "processing") && (
                          <div className="mt-3 space-y-3">
                            {/* Field inputs */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Data yang Dikirim ke User</p>
                                <button onClick={() => addField(order.id, order)}
                                  className="text-xs text-primary font-semibold flex items-center gap-1">
                                  <Plus className="w-3 h-3" /> Field
                                </button>
                              </div>
                              <div className="space-y-2">
                                {fields.map((f, i) => (
                                  <div key={i} className="flex gap-2">
                                    <input
                                      value={f.key}
                                      onChange={e => updateField(order.id, order, i, { key: e.target.value })}
                                      placeholder="Nama field"
                                      className="w-1/3 bg-muted border border-input rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-primary"
                                    />
                                    <input
                                      value={f.value}
                                      onChange={e => updateField(order.id, order, i, { value: e.target.value })}
                                      placeholder="Nilai"
                                      className="flex-1 bg-muted border border-input rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-primary font-mono"
                                    />
                                    <button onClick={() => removeField(order.id, order, i)}
                                      className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Admin note */}
                            <div>
                              <label className="text-xs font-semibold text-muted-foreground block mb-1">Catatan Admin (opsional)</label>
                              <input
                                value={adminNotes[order.id] || ""}
                                onChange={e => setAdminNotes(prev => ({ ...prev, [order.id]: e.target.value }))}
                                placeholder="Catatan internal..."
                                className="w-full bg-muted border border-input rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                              />
                            </div>

                            {/* Buyer WA number for notification */}
                            {order.buyerWhatsapp && (
                              <p className="text-[11px] text-muted-foreground">
                                No WA Pembeli: <span className="font-mono">{order.buyerWhatsapp}</span>
                              </p>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2">
                              {order.status === "waiting" && (
                                <button onClick={() => handleMarkProcessing(order)} disabled={isSaving}
                                  className="flex-1 py-2.5 rounded-2xl border-2 border-blue-300 bg-blue-50 text-blue-700 text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">
                                  <Loader2 className="w-3.5 h-3.5" /> Proses
                                </button>
                              )}
                              <button onClick={() => handleDeliver(order)} disabled={isSaving}
                                className="flex-1 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-sm">
                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Kirim & Selesai</>}
                              </button>
                              <button onClick={() => handleReject(order)} disabled={isSaving}
                                className="py-2.5 px-3 rounded-2xl border-2 border-destructive/30 bg-destructive/5 text-destructive text-xs font-bold disabled:opacity-60 flex items-center justify-center">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* WA notify link */}
                            {order.buyerWhatsapp && (
                              <a href={`https://wa.me/${order.buyerWhatsapp}?text=${buildWaText(order, fields)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 py-2 px-3 rounded-xl">
                                <MessageCircle className="w-3.5 h-3.5" /> Kirim Data via WhatsApp
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}