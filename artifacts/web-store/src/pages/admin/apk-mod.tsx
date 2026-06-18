import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Download,
  Edit2,
  Trash2,
  X,
  Loader2,
  Image,
  Check,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { AppLayout } from "../../components/Layout/AppLayout";
import {
  subscribeApkMods,
  createApkMod,
  updateApkMod,
  deleteApkMod,
} from "../../lib/firestore";
import { uploadToCloudinary } from "../../lib/cloudinary";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/use-toast";
import type { ApkMod } from "../../types";
import { useLocation } from "wouter";

interface ApkModForm {
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  version: string;
  size: string;
  downloadUrl: string;
  rating: number;
  available: boolean;
  features: string;
}

const defaultForm = (): ApkModForm => ({
  name: "",
  category: "",
  description: "",
  imageUrl: "",
  version: "",
  size: "",
  downloadUrl: "",
  rating: 5,
  available: true,
  features: "",
});

export default function AdminApkMod() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [items, setItems] = useState<ApkMod[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ApkModForm>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setLocation("/");
      return;
    }

    return subscribeApkMods(setItems);
  }, [isAdmin, setLocation]);

  const handleEdit = (item: ApkMod) => {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      category: item.category || "",
      description: item.description || "",
      imageUrl: item.imageUrl || "",
      version: item.version || "",
      size: item.size || "",
      downloadUrl: item.downloadUrl || "",
      rating: item.rating || 5,
      available: item.available !== false,
      features: (item.features || []).join("\n"),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Nama APK wajib diisi", variant: "destructive" });
      return;
    }

    if (!form.downloadUrl.trim()) {
      toast({ title: "Link download wajib diisi", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      const data: Omit<ApkMod, "id"> = {
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        imageUrl: form.imageUrl,
        version: form.version.trim(),
        size: form.size.trim(),
        downloadUrl: form.downloadUrl.trim(),
        rating: Number(form.rating) || 5,
        available: form.available,
        features: form.features
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      };

      if (editingId) {
        await updateApkMod(editingId, data);
        toast({ title: "APK Mod diperbarui!" });
      } else {
        await createApkMod(data);
        toast({ title: "APK Mod ditambahkan!" });
      }

      setShowForm(false);
      setEditingId(null);
      setForm(defaultForm());
    } catch (err: unknown) {
      toast({
        title: "Gagal menyimpan APK Mod",
        description: (err as Error)?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus APK Mod ini?")) return;

    await deleteApkMod(id);
    toast({ title: "APK Mod dihapus" });
  };

  const handleMainImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploadingMain(true);

    try {
      const url = await uploadToCloudinary(file);

      setForm((prev) => ({
        ...prev,
        imageUrl: url,
      }));

      toast({ title: "Gambar berhasil diupload" });
    } catch (err: unknown) {
      toast({
        title: "Upload gambar gagal",
        description: (err as Error)?.message,
        variant: "destructive",
      });
    } finally {
      setUploadingMain(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <AppLayout title="Kelola APK Mod">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {items.length} APK Mod
            </h2>
            <p className="text-xs text-muted-foreground">
              Semua APK Mod tampil di halaman frontend
            </p>
          </div>

          <button
            onClick={() => {
              setEditingId(null);
              setForm(defaultForm());
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl text-sm font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah
          </button>
        </div>

        <div className="space-y-2.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-card rounded-2xl border border-card-border p-4 flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Download className="w-6 h-6 text-muted-foreground m-3" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground truncate">
                  {item.name}
                </p>

                <p className="text-xs text-muted-foreground">
                  {item.category || "Tanpa kategori"} •{" "}
                  {item.available !== false ? "Tersedia" : "Nonaktif"}
                </p>

                <p className="text-xs text-primary font-semibold">
                  v{item.version || "-"} • {item.size || "-"}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleEdit(item)}
                  className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center py-12 bg-card rounded-2xl border border-card-border">
              <Download className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                Belum ada APK Mod
              </p>
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
                  {editingId ? "Edit APK Mod" : "Tambah APK Mod"}
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
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Nama APK Mod *"
                  className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                />

                <input
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  placeholder="Kategori (contoh: Editing, Music, AI)"
                  className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                />

                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Deskripsi APK Mod"
                  rows={3}
                  className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Rating (1-5)
                    </label>

                    <input
                      type="number"
                      min={1}
                      max={5}
                      step={0.1}
                      value={form.rating}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          rating: +e.target.value,
                        }))
                      }
                      className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Status
                    </label>

                    <button
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          available: !prev.available,
                        }))
                      }
                      className={`w-full py-3 rounded-2xl border-2 text-sm font-bold transition-all ${
                        form.available
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {form.available ? "Tersedia" : "Nonaktif"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={form.version}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        version: e.target.value,
                      }))
                    }
                    placeholder="Versi APK"
                    className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                  />

                  <input
                    value={form.size}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        size: e.target.value,
                      }))
                    }
                    placeholder="Ukuran file"
                    className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <input
                  value={form.downloadUrl}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      downloadUrl: e.target.value,
                    }))
                  }
                  placeholder="Link download APK *"
                  className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                />

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Fitur Mod (satu per baris)
                  </label>

                  <textarea
                    value={form.features}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        features: e.target.value,
                      }))
                    }
                    placeholder={`Premium unlocked\nTanpa watermark\nTanpa iklan`}
                    rows={3}
                    className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground block">
                    Gambar APK Mod
                  </label>

                  <label className="flex items-center gap-2 bg-muted border-2 border-dashed border-border rounded-2xl p-3 cursor-pointer hover:border-primary/40 transition-colors">
                    {uploadingMain ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <Image className="w-4 h-4 text-muted-foreground" />
                    )}

                    <span className="text-sm text-muted-foreground">
                      {form.imageUrl ? "Ganti gambar APK Mod" : "Upload gambar APK Mod"}
                    </span>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMainImage}
                      className="hidden"
                    />
                  </label>

                  {form.imageUrl && (
                    <img
                      src={form.imageUrl}
                      alt=""
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                  )}
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
                      <Check className="w-4 h-4" />
                      Simpan APK Mod
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