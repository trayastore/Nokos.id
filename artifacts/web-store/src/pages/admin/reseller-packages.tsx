import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Plus, Edit2, Trash2, X, Loader2, Check } from "lucide-react";
import { AppLayout } from "../../components/Layout/AppLayout";
import { getResellerPackages, createResellerPackage, updateResellerPackage, deleteResellerPackage } from "../../lib/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/use-toast";
import type { ResellerPackage } from "../../types";
import { useLocation } from "wouter";

export default function AdminResellerPackages() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [packages, setPackages] = useState<ResellerPackage[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", price: 0, duration: 30, durationType: "days" as "days" | "months" | "permanent",
    benefits: "", productDiscount: 0, panelDiscount: 0,
  });

  useEffect(() => {
    if (!isAdmin) { setLocation("/"); return; }
    getResellerPackages().then(setPackages);
  }, [isAdmin, setLocation]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: "", price: 0, duration: 30, durationType: "days", benefits: "", productDiscount: 0, panelDiscount: 0 });
    setShowForm(true);
  };

  const openEdit = (p: ResellerPackage) => {
    setEditingId(p.id);
    setForm({ name: p.name, price: p.price, duration: p.duration, durationType: p.durationType, benefits: p.benefits.join("\n"), productDiscount: p.productDiscount, panelDiscount: p.panelDiscount });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Nama paket wajib diisi", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const data = { ...form, benefits: form.benefits.split("\n").filter(Boolean) };
      if (editingId) { await updateResellerPackage(editingId, data); toast({ title: "Paket diperbarui!" }); }
      else { await createResellerPackage(data); toast({ title: "Paket ditambahkan!" }); }
      const updated = await getResellerPackages();
      setPackages(updated.sort((a, b) => a.price - b.price));
      setShowForm(false);
    } catch { toast({ title: "Gagal menyimpan", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus paket ini?")) return;
    await deleteResellerPackage(id);
    setPackages(ps => ps.filter(p => p.id !== id));
    toast({ title: "Paket dihapus" });
  };

  const formatDuration = (p: ResellerPackage) => p.durationType === "permanent" ? "Permanen" : `${p.duration} ${p.durationType === "months" ? "Bulan" : "Hari"}`;

  if (!isAdmin) return null;

  return (
    <AppLayout title="Paket Reseller">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">{packages.length} Paket</h2>
            <p className="text-xs text-muted-foreground">Kelola paket upgrade reseller</p>
          </div>
          <button onClick={openAdd} data-testid="btn-add-package" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl text-sm font-bold shadow-sm">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>

        <div className="space-y-3">
          {packages.map(p => (
            <div key={p.id} className="bg-card rounded-2xl border border-card-border p-4" data-testid={`pkg-card-${p.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500" />
                    <p className="font-bold text-sm text-foreground">{p.name}</p>
                  </div>
                  <p className="text-xl font-extrabold text-primary mt-1">Rp {p.price.toLocaleString("id-ID")}</p>
                  <p className="text-xs text-muted-foreground">{formatDuration(p)}</p>
                  {p.productDiscount > 0 && <p className="text-xs text-primary font-medium">Diskon produk: {p.productDiscount}%</p>}
                  {p.benefits.slice(0, 2).map((b, i) => <p key={i} className="text-[11px] text-muted-foreground">• {b}</p>)}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(p)} className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-primary transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
          {packages.length === 0 && (
            <div className="text-center py-12 bg-card rounded-2xl border border-card-border">
              <Crown className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada paket reseller</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="relative bg-card rounded-3xl w-full max-w-sm shadow-2xl border border-card-border my-4 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground">{editingId ? "Edit Paket" : "Tambah Paket"}</h3>
                <button onClick={() => setShowForm(false)}><X className="w-4 h-4" /></button>
              </div>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nama paket *" className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary" />
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Harga (Rp)</label>
                <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Durasi</label>
                  <select value={form.durationType} onChange={e => setForm(f => ({ ...f, durationType: e.target.value as typeof f.durationType }))} className="w-full bg-muted border border-input rounded-2xl px-3 py-3 text-sm outline-none focus:border-primary">
                    <option value="days">Hari</option>
                    <option value="months">Bulan</option>
                    <option value="permanent">Permanen</option>
                  </select>
                </div>
                {form.durationType !== "permanent" && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Jumlah</label>
                    <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))} className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Diskon Produk (%)</label>
                  <input type="number" min={0} max={100} value={form.productDiscount} onChange={e => setForm(f => ({ ...f, productDiscount: +e.target.value }))} className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Diskon Panel (%)</label>
                  <input type="number" min={0} max={100} value={form.panelDiscount} onChange={e => setForm(f => ({ ...f, panelDiscount: +e.target.value }))} className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Benefit (satu per baris)</label>
                <textarea value={form.benefits} onChange={e => setForm(f => ({ ...f, benefits: e.target.value }))} rows={4} placeholder={"Akses panel unlimited\nHarga produk lebih murah"} className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary resize-none" />
              </div>
              <button onClick={handleSave} disabled={saving} className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Simpan</>}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
