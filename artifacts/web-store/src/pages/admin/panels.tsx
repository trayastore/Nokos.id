import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Server, Edit2, Trash2, X, Loader2, Check, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from "lucide-react";
import { AppLayout } from "../../components/Layout/AppLayout";
import { subscribePanels, createPanel, updatePanel, deletePanel } from "../../lib/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/use-toast";
import type { Panel, PanelVariant } from "../../types";
import { useLocation } from "wouter";

let idCounter = 0;
const genId = () => `pv_${Date.now()}_${++idCounter}`;

function emptyVariant(): PanelVariant {
  return { id: genId(), name: "", price: 0, resellerPrice: 0, description: "", duration: "30 Hari", isActive: true };
}

interface PanelForm {
  name: string;
  description: string;
  imageUrl: string;
  available: boolean;
  variants: PanelVariant[];
}

const defaultForm = (): PanelForm => ({
  name: "",
  description: "",
  imageUrl: "",
  available: true,
  variants: [emptyVariant()],
});

export default function AdminPanels() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [panels, setPanels] = useState<Panel[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PanelForm>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setLocation("/");
      return;
    }

    return subscribePanels(ps =>
      setPanels(
        [...ps].sort((a, b) =>
          String(a?.name ?? "").localeCompare(String(b?.name ?? ""), "id", {
            sensitivity: "base",
          })
        )
      )
    );
  }, [isAdmin, setLocation]);

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm());
    setShowForm(true);
  };

  const openEdit = (p: Panel) => {
    setEditingId(p.id);
    setForm({
      name: p.name || "",
      description: p.description || "",
      imageUrl: p.imageUrl || "",
      available: p.available !== false,
      variants: p.variants?.length ? p.variants : [emptyVariant()],
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Nama panel wajib diisi", variant: "destructive" });
      return;
    }

    if (form.variants.length === 0) {
      toast({ title: "Minimal 1 varian harus ada", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      const data: Omit<Panel, "id"> = {
        name: form.name.trim(),
        description: form.description || "",
        imageUrl: form.imageUrl || "",
        available: form.available,
        variants: form.variants,
      };

      if (editingId) {
        await updatePanel(editingId, data);
        toast({ title: "Panel diperbarui!" });
      } else {
        await createPanel(data);
        toast({ title: "Panel ditambahkan!" });
      }

      setShowForm(false);
    } catch (err: unknown) {
      toast({
        title: "Gagal menyimpan",
        description: (err as Error)?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus panel ini?")) return;

    await deletePanel(id);
    toast({ title: "Panel dihapus" });
  };

  const updateVariant = (vid: string, patch: Partial<PanelVariant>) => {
    setForm(f => ({
      ...f,
      variants: f.variants.map(v => (v.id === vid ? { ...v, ...patch } : v)),
    }));
  };

  if (!isAdmin) return null;

  return (
    <AppLayout title="Kelola Panel">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">{panels.length} Panel</h2>
            <p className="text-xs text-muted-foreground">Setiap panel punya varian durasi & harga</p>
          </div>

          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl text-sm font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>

        <div className="space-y-2.5">
          {panels.map(p => (
            <div
              key={p.id}
              className="bg-card rounded-2xl border border-card-border p-4 flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Server className="w-6 h-6 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground">{p.name || "Panel Tanpa Nama"}</p>

                <p className="text-xs text-muted-foreground">
                  {p.variants?.length || 0} varian • {p.available !== false ? "Tersedia" : "Habis"}
                </p>

                {p.variants?.length > 0 && (
                  <p className="text-xs text-primary font-semibold">
                    Mulai Rp{" "}
                    {Math.min(
                      ...p.variants.map(v => Number(v.price || 0))
                    ).toLocaleString("id-ID")}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(p)}
                  className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {panels.length === 0 && (
            <div className="text-center py-12 bg-card rounded-2xl border border-card-border">
              <Server className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada panel</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowForm(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="relative bg-card rounded-3xl w-full max-w-lg shadow-2xl border border-card-border my-4 overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-card-border sticky top-0 bg-card z-10">
                <h3 className="font-bold text-foreground">
                  {editingId ? "Edit Panel" : "Tambah Panel"}
                </h3>

                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 rounded-xl hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nama panel (contoh: Bot Panel, Server Panel)"
                  className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                />

                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Deskripsi panel (opsional)"
                  rows={2}
                  className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
                />

                <button
                  onClick={() => setForm(f => ({ ...f, available: !f.available }))}
                  className={`w-full py-3 rounded-2xl border-2 text-sm font-bold transition-all ${
                    form.available
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {form.available ? "Status: Tersedia" : "Status: Habis"}
                </button>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Varian Panel
                    </label>

                    <button
                      onClick={() =>
                        setForm(f => ({
                          ...f,
                          variants: [...f.variants, emptyVariant()],
                        }))
                      }
                      className="text-xs text-primary font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Tambah Varian
                    </button>
                  </div>

                  {form.variants.map((v, vi) => (
                    <div
                      key={v.id}
                      className="bg-muted/60 rounded-2xl border border-border overflow-hidden"
                    >
                      <div
                        className="flex items-center justify-between px-3.5 py-3 cursor-pointer"
                        onClick={() =>
                          setExpandedVariant(expandedVariant === v.id ? null : v.id)
                        }
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {v.name || `Varian ${vi + 1}`}
                          </span>

                          {v.duration && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {v.duration}
                            </span>
                          )}

                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                              v.isActive
                                ? "bg-primary/10 text-primary"
                                : "bg-muted-foreground/10 text-muted-foreground"
                            }`}
                          >
                            {v.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setForm(f => ({
                                ...f,
                                variants: f.variants.filter((_, i) => i !== vi),
                              }));
                            }}
                            className="text-destructive p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          {expandedVariant === v.id ? (
                            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedVariant === v.id && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3.5 pb-3.5 space-y-2.5 border-t border-border pt-3">
                              <input
                                value={v.name}
                                onChange={e => updateVariant(v.id, { name: e.target.value })}
                                placeholder="Nama varian (contoh: 1GB 30 Hari)"
                                className="w-full bg-card border border-input rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                              />

                              <input
                                value={v.duration}
                                onChange={e =>
                                  updateVariant(v.id, { duration: e.target.value })
                                }
                                placeholder="Durasi (contoh: 30 Hari, 3 Bulan)"
                                className="w-full bg-card border border-input rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                              />

                              <textarea
                                value={v.description}
                                onChange={e =>
                                  updateVariant(v.id, { description: e.target.value })
                                }
                                placeholder="Deskripsi (contoh: RAM 1GB, CPU 1 Core)"
                                rows={2}
                                className="w-full bg-card border border-input rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary resize-none"
                              />

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-muted-foreground block mb-1">
                                    Harga Normal
                                  </label>

                                  <div className="flex items-center gap-1 bg-card border border-input rounded-xl px-2 py-2">
                                    <span className="text-[10px] text-muted-foreground">
                                      Rp
                                    </span>

                                    <input
                                      type="number"
                                      value={v.price}
                                      onChange={e =>
                                        updateVariant(v.id, {
                                          price: Number(e.target.value || 0),
                                        })
                                      }
                                      className="flex-1 bg-transparent outline-none text-xs font-mono"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[10px] text-muted-foreground block mb-1">
                                    Harga Reseller
                                  </label>

                                  <div className="flex items-center gap-1 bg-card border border-input rounded-xl px-2 py-2">
                                    <span className="text-[10px] text-muted-foreground">
                                      Rp
                                    </span>

                                    <input
                                      type="number"
                                      value={v.resellerPrice}
                                      onChange={e =>
                                        updateVariant(v.id, {
                                          resellerPrice: Number(e.target.value || 0),
                                        })
                                      }
                                      className="flex-1 bg-transparent outline-none text-xs font-mono"
                                    />
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => updateVariant(v.id, { isActive: !v.isActive })}
                                className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl transition-all ${
                                  v.isActive
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {v.isActive ? (
                                  <ToggleRight className="w-4 h-4" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4" />
                                )}

                                {v.isActive ? "Aktif" : "Nonaktif"}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 shadow-md"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Simpan Panel
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}