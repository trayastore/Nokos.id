import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server, ChevronDown, ChevronUp, Copy, CheckCircle2, Clock,
  ExternalLink, MessageCircle, RefreshCw,
} from "lucide-react";
import { AppLayout } from "../components/Layout/AppLayout";
import { subscribeUserPanelData } from "../lib/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import type { UserPanelData } from "../types";

function fmtTs(ts: unknown): string {
  if (!ts) return "-";
  if (typeof ts === "object" && ts !== null && "seconds" in (ts as Record<string, unknown>)) {
    return new Date(((ts as { seconds: number }).seconds) * 1000).toLocaleDateString("id-ID", {
      day: "numeric", month: "long", year: "numeric",
    });
  }
  return "-";
}

export default function MyPanelsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<UserPanelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const adminWa = import.meta.env.VITE_ADMIN_WHATSAPP || "6285782544861";

  useEffect(() => {
    if (authLoading) return;
    if (!userProfile) { setLoading(false); return; }
    return subscribeUserPanelData(userProfile.id, data => {
      setItems(data);
      setLoading(false);
    });
  }, [userProfile, authLoading]);

  const handleCopy = (text: string, label = "Disalin!") => {
    navigator.clipboard.writeText(text);
    toast({ title: label });
  };

  const handleCopyAll = (item: UserPanelData) => {
    const text = item.fields.map(f => `${f.key}: ${f.value}`).join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: "Semua data panel disalin!" });
  };

  const getFieldValue = (item: UserPanelData, key: string): string =>
    item.fields.find(f => f.key.toLowerCase() === key.toLowerCase())?.value ?? "";

  return (
    <AppLayout title="Panel Aktif">
      <div className="space-y-4">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-5 relative overflow-hidden border border-blue-200"
          style={{ background: "linear-gradient(135deg, #eff6ff, #dbeafe)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Server className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Panel Aktif</span>
          </div>
          <h2 className="text-xl font-extrabold text-foreground">Panel Aktifku</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Memuat..." : `${items.filter(i => i.isActive).length} panel aktif`}
          </p>
        </motion.div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-24 bg-card rounded-2xl border border-card-border skeleton-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Server className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-semibold text-muted-foreground">Belum ada panel aktif</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Beli panel dan tunggu admin menyiapkan aksesnya</p>
            <a href={`https://wa.me/${adminWa}?text=Halo admin, saya ingin membeli panel`}
              target="_blank" rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 px-4 py-2.5 rounded-2xl">
              <MessageCircle className="w-4 h-4" /> Hubungi Admin
            </a>
          </div>
        ) : (
          <motion.div
            variants={{ show: { transition: { staggerChildren: 0.07 } } }}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {items.map(item => {
              const isExpanded = expandedId === item.id;
              const loginUrl = getFieldValue(item, "Login URL") || getFieldValue(item, "URL") || getFieldValue(item, "login url");

              return (
                <motion.div key={item.id}
                  variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                  className={`bg-card rounded-2xl border overflow-hidden ${item.isActive ? "border-blue-200" : "border-card-border"}`}>

                  <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${item.isActive ? "bg-blue-100" : "bg-muted"}`}>
                        <Server className={`w-5 h-5 ${item.isActive ? "text-blue-600" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{item.panelName}</p>
                        {item.variantName && (
                          <p className="text-[11px] text-muted-foreground">{item.variantName}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${item.isActive ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"}`}>
                            {item.isActive
                              ? <><CheckCircle2 className="w-2.5 h-2.5" /> Aktif</>
                              : <><Clock className="w-2.5 h-2.5" /> Kadaluarsa</>}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Sejak: {fmtTs(item.deliveredAt)}
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
                        <div className="px-4 pb-4 pt-0 border-t border-card-border space-y-3">
                          {/* Login URL shortcut */}
                          {loginUrl && (
                            <div className="mt-3">
                              <a href={loginUrl.startsWith("http") ? loginUrl : `https://${loginUrl}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl px-4 py-2.5 text-sm font-bold">
                                <ExternalLink className="w-4 h-4" /> Buka Login Panel
                              </a>
                            </div>
                          )}

                          {/* All fields */}
                          <div className="bg-muted/60 rounded-2xl p-3.5 space-y-2.5">
                            <p className="text-xs font-bold text-muted-foreground">🖥️ Akses Panel</p>
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
                            <button onClick={() => handleCopyAll(item)}
                              className="mt-1 w-full text-xs font-semibold text-blue-700 bg-blue-50 py-2 rounded-xl flex items-center justify-center gap-1.5">
                              <RefreshCw className="w-3 h-3" /> Salin Semua Data
                            </button>
                          </div>

                          {item.expiresAt && (
                            <p className="text-center text-[11px] text-muted-foreground">
                              Expired: <span className="font-semibold">{new Date(item.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                            </p>
                          )}

                          <a href={`https://wa.me/${adminWa}?text=Halo admin, ada masalah dengan panel saya: ${item.panelName}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 py-2 px-3 rounded-xl w-fit">
                            <MessageCircle className="w-3.5 h-3.5" /> Laporkan Masalah
                          </a>
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
