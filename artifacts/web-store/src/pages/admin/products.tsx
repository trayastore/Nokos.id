import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Package, Edit2, Trash2, X, Loader2, Image, Check, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from "lucide-react";
import { AppLayout } from "../../components/Layout/AppLayout";
import { subscribeProducts, createProduct, updateProduct, deleteProduct } from "../../lib/firestore";
import { uploadToCloudinary } from "../../lib/cloudinary";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/use-toast";
import type { Product, ProductVariant } from "../../types";
import { useLocation } from "wouter";

let idCounter = 0;
const genId = () => `v_${Date.now()}_${++idCounter}`;

function emptyVariant(): ProductVariant {
  return { id: genId(), name: "", price: 0, resellerPrice: 0, description: "", isActive: true };
}

interface ProductForm {
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  previewImages: string[];
  price: number;
  resellerPrice: number;
  rating: number;
  available: boolean;
  benefits: string;
  variants: ProductVariant[];
}

const defaultForm = (): ProductForm => ({
  name: "",
  description: "",
  category: "",
  imageUrl: "",
  previewImages: [],
  price: 0,
  resellerPrice: 0,
  rating: 5,
  available: true,
  benefits: "",
  variants: [emptyVariant()],
});

export default function AdminProducts() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) { setLocation("/"); return; }
    return subscribeProducts(setProducts);
  }, [isAdmin, setLocation]);

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description || "",
      category: p.category || "",
      imageUrl: p.imageUrl || "",
      previewImages: p.previewImages || [],
      price: p.price,
      resellerPrice: p.resellerPrice || 0,
      rating: p.rating || 5,
      available: p.available !== false,
      benefits: (p.benefits || []).join("\n"),
      variants: p.variants?.length ? p.variants : [emptyVariant()],
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Nama produk wajib diisi", variant: "destructive" });
      return;
    }
    if (form.variants.length === 0) {
      toast({ title: "Minimal 1 varian harus ada", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const startingPrice = form.variants.find(v => v.isActive)?.price ?? form.variants[0]?.price ?? 0;
      const startingReseller = form.variants.find(v => v.isActive)?.resellerPrice ?? form.variants[0]?.resellerPrice ?? 0;
      const data: Omit<Product, "id"> = {
        name: form.name.trim(),
        description: form.description || "",
        category: form.category || "",
        imageUrl: form.imageUrl || "",
        previewImages: form.previewImages || [],
        price: startingPrice,
        resellerPrice: startingReseller,
        rating: Number(form.rating) || 5,
        available: form.available,
        benefits: form.benefits.split("\n").map(b => b.trim()).filter(Boolean),
        variants: form.variants,
      };
      if (editingId) {
        await updateProduct(editingId, data);
        toast({ title: "Produk diperbarui!" });
      } else {
        await createProduct(data);
        toast({ title: "Produk ditambahkan!" });
      }
      setShowForm(false);
      setEditingId(null);
      setForm(defaultForm());
    } catch (err: unknown) {
      toast({ title: "Gagal menyimpan", description: (err as Error)?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus produk ini?")) return;
    await deleteProduct(id);
    toast({ title: "Produk dihapus" });
  };

  const handleMainImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMain(true);
    try {
      const url = await uploadToCloudinary(file);
      setForm(f => ({ ...f, imageUrl: url }));
    } finally {
      setUploadingMain(false);
    }
  };

  const handlePreviewImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const url = await uploadToCloudinary(file);
      setForm(f => ({ ...f, previewImages: [...f.previewImages, url] }));
    }
  };

  const updateVariant = (vid: string, patch: Partial<ProductVariant>) => {
    setForm(f => ({
      ...f,
      variants: f.variants.map(v => v.id === vid ? { ...v, ...patch } : v),
    }));
  };

  if (!isAdmin) return null;

  return (
    <AppLayout title="Kelola Produk">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">{products.length} Produk</h2>
            <p className="text-xs text-muted-foreground">Semua produk manual (admin fulfills)</p>
          </div>
          <button
            onClick={() => { setEditingId(null); setForm(defaultForm()); setShowForm(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl text-sm font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>

        <div className="space-y-2.5">
          {products.map(p => (
            <div key={p.id} className="bg-card rounded-2xl border border-card-border p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-6 h-6 text-muted-foreground m-3" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.variants?.length || 0} varian • {p.available !== false ? "Tersedia" : "Habis"}
                </p>
                <p className="text-xs text-primary font-semibold">
                  Mulai Rp {(p.price || 0).toLocaleString("id-ID")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => handleEdit(p)} className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-primary transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(p.id)} className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div className="text-center py-12 bg-card rounded-2xl border border-card-border">
              <Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Belum ada produk</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
              className="relative bg-card rounded-3xl w-full max-w-lg shadow-2xl border border-card-border my-4 overflow-hidden">

              <div className="flex items-center justify-between p-5 border-b border-card-border sticky top-0 bg-card z-10">
                <h3 className="font-bold text-foreground">{editingId ? "Edit Produk" : "Tambah Produk"}</h3>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-muted"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nama produk *"
                  className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                />
                <input
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="Kategori (contoh: Netflix, Spotify)"
                  className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                />
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Deskripsi produk"
                  rows={3}
                  className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Rating (1-5)</label>
                    <input type="number" min={1} max={5} step={0.1} value={form.rating}
                      onChange={e => setForm(f => ({ ...f, rating: +e.target.value }))}
                      className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Status</label>
                    <button onClick={() => setForm(f => ({ ...f, available: !f.available }))}
                      className={`w-full py-3 rounded-2xl border-2 text-sm font-bold transition-all ${form.available ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>
                      {form.available ? "Tersedia" : "Habis"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Keuntungan (satu per baris)</label>
                  <textarea value={form.benefits} onChange={e => setForm(f => ({ ...f, benefits: e.target.value }))}
                    placeholder="Akses premium tanpa limit&#10;Garansi 30 hari" rows={3}
                    className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none" />
                </div>

                {/* Images */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground block">Gambar Produk</label>
                  <label className="flex items-center gap-2 bg-muted border-2 border-dashed border-border rounded-2xl p-3 cursor-pointer hover:border-primary/40 transition-colors">
                    {uploadingMain ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Image className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">{form.imageUrl ? "Ganti gambar utama" : "Upload gambar utama"}</span>
                    <input type="file" accept="image/*" onChange={handleMainImage} className="hidden" />
                  </label>
                  {form.imageUrl && <img src={form.imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover" />}
                  <label className="flex items-center gap-2 bg-muted border-2 border-dashed border-border rounded-2xl p-3 cursor-pointer hover:border-primary/40 transition-colors">
                    <Image className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload preview (boleh lebih dari 1)</span>
                    <input type="file" accept="image/*" multiple onChange={handlePreviewImage} className="hidden" />
                  </label>
                  {form.previewImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {form.previewImages.map((url, i) => (
                        <div key={i} className="relative shrink-0">
                          <img src={url} alt="" className="w-16 h-24 rounded-xl object-cover" />
                          <button onClick={() => setForm(f => ({ ...f, previewImages: f.previewImages.filter((_, j) => j !== i) }))}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Variants */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Varian Produk</label>
                    <button onClick={() => setForm(f => ({ ...f, variants: [...f.variants, emptyVariant()] }))}
                      className="text-xs text-primary font-semibold flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Tambah Varian
                    </button>
                  </div>

                  {form.variants.map((v, vi) => (
                    <div key={v.id} className="bg-muted/60 rounded-2xl border border-border overflow-hidden">
                      <div
                        className="flex items-center justify-between px-3.5 py-3 cursor-pointer"
                        onClick={() => setExpandedVariant(expandedVariant === v.id ? null : v.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {v.name || `Varian ${vi + 1}`}
                          </span>
                          {v.price > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              Rp {v.price.toLocaleString("id-ID")}
                            </span>
                          )}
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${v.isActive ? "bg-primary/10 text-primary" : "bg-muted-foreground/10 text-muted-foreground"}`}>
                            {v.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, variants: f.variants.filter((_, i) => i !== vi) })); }}
                            className="text-destructive hover:text-destructive/80 p-1">
                            <X className="w-3.5 h-3.5" />
                          </button>
                          {expandedVariant === v.id ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedVariant === v.id && (
                          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                            className="overflow-hidden">
                            <div className="px-3.5 pb-3.5 space-y-2.5 border-t border-border pt-3">
                              <input
                                value={v.name}
                                onChange={e => updateVariant(v.id, { name: e.target.value })}
                                placeholder="Nama varian (contoh: 1 Bulan, 3 Bulan)"
                                className="w-full bg-card border border-input rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                              />
                              <textarea
                                value={v.description}
                                onChange={e => updateVariant(v.id, { description: e.target.value })}
                                placeholder="Deskripsi varian (opsional)"
                                rows={2}
                                className="w-full bg-card border border-input rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary resize-none"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-muted-foreground block mb-1">Harga Normal</label>
                                  <div className="flex items-center gap-1 bg-card border border-input rounded-xl px-2 py-2">
                                    <span className="text-[10px] text-muted-foreground">Rp</span>
                                    <input type="number" value={v.price}
                                      onChange={e => updateVariant(v.id, { price: +e.target.value })}
                                      className="flex-1 bg-transparent outline-none text-xs font-mono" />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted-foreground block mb-1">Harga Reseller</label>
                                  <div className="flex items-center gap-1 bg-card border border-input rounded-xl px-2 py-2">
                                    <span className="text-[10px] text-muted-foreground">Rp</span>
                                    <input type="number" value={v.resellerPrice}
                                      onChange={e => updateVariant(v.id, { resellerPrice: +e.target.value })}
                                      className="flex-1 bg-transparent outline-none text-xs font-mono" />
                                  </div>
                                </div>
                              </div>
                              <button onClick={() => updateVariant(v.id, { isActive: !v.isActive })}
                                className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl transition-all ${v.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                {v.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                {v.isActive ? "Aktif" : "Nonaktif"}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>

                <button onClick={handleSave} disabled={saving}
                  className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 shadow-md">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Simpan Produk</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
