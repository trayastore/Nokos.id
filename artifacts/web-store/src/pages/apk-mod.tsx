import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Package,
  Shield,
  Zap,
  Headphones,
  Search,
  Star,
  Download,
} from "lucide-react";
import { AppLayout } from "../components/Layout/AppLayout";
import { subscribeApkMods } from "../lib/firestore";
import type { ApkMod } from "../types";

const spring = {
  type: "spring",
  stiffness: 220,
  damping: 18,
  mass: 0.8,
};

export default function ApkModPage() {
  const [, setLocation] = useLocation();
  const [apkMods, setApkMods] = useState<ApkMod[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");

  useEffect(() => {
    const unsub = subscribeApkMods((items) => {
      setApkMods(items.filter((item) => item.available));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const categories = useMemo(() => {
    return [
      "Semua",
      ...new Set(
        apkMods
          .map((item) => item.category)
          .filter(Boolean)
      ),
    ];
  }, [apkMods]);

  const filtered = useMemo(() => {
    return apkMods.filter((item) => {
      const matchSearch = item.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchCategory =
        category === "Semua" || item.category === category;

      return matchSearch && matchCategory;
    });
  }, [apkMods, search, category]);

  return (
    <AppLayout title="APK Mod">
      <div className="space-y-5">
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={spring}
          className="mint-gradient rounded-3xl p-5 border border-primary/15 shadow-sm"
        >
          <div className="flex items-center gap-2 text-primary font-extrabold text-xs tracking-wider">
            <Package className="w-4 h-4" />
            APK MOD
          </div>

          <h2 className="text-2xl font-extrabold text-foreground mt-3">
            APK Mod Premium
          </h2>

          <p className="text-sm text-muted-foreground mt-1">
            Download APK mod pilihan dengan tampilan rapi dan cepat.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.06,
              },
            },
          }}
          className="grid grid-cols-2 gap-3"
        >
          {[
            { icon: Shield, title: "Aman", desc: "File aman udah di uji sebelum dipublikasi" },
            { icon: Zap, title: "Cepat", desc: "Download mudah dan cepat" },
            { icon: Download, title: "Gratis", desc: "Tanpa biaya pembayaran apapun" },
            { icon: Headphones, title: "Support", desc: "Admin siap support 24/7 via WhatsApp" },
          ].map((item) => (
            <motion.div
              key={item.title}
              variants={{
                hidden: {
                  opacity: 0,
                  y: 18,
                  scale: 0.96,
                },
                show: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: spring,
                },
              }}
              whileTap={{ scale: 0.96 }}
              className="bg-card border border-card-border rounded-2xl p-4"
            >
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <item.icon className="w-5 h-5 text-primary" />
              </div>

              <p className="font-bold text-sm text-foreground">
                {item.title}
              </p>

              <p className="text-[11px] text-muted-foreground mt-0.5">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileTap={{ scale: 0.98 }}
          transition={spring}
          className="flex items-center gap-3 bg-card border border-card-border rounded-2xl px-4 py-3"
        >
          <Search className="w-5 h-5 text-muted-foreground" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari APK mod..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="flex gap-2 overflow-x-auto pb-1"
        >
          {categories.map((item) => (
            <motion.button
              key={item}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 15,
              }}
              onClick={() => setCategory(item)}
              className={`px-4 py-2 rounded-2xl text-sm font-bold border shrink-0 ${
                category === item
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-card-border"
              }`}
            >
              {item}
            </motion.button>
          ))}
        </motion.div>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={spring}
            className="text-center py-12 text-muted-foreground text-sm"
          >
            Memuat APK Mod...
          </motion.div>
        )}

        {!loading && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={spring}
            className="text-center py-12 bg-card border border-card-border rounded-3xl"
          >
            <Package className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />

            <p className="font-bold text-foreground">
              Belum ada APK Mod
            </p>

            <p className="text-sm text-muted-foreground mt-1">
              Admin belum menambahkan APK Mod.
            </p>
          </motion.div>
        )}

        {!loading && filtered.length > 0 && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: {
                  staggerChildren: 0.06,
                },
              },
            }}
            className="grid grid-cols-2 gap-4"
          >
            {filtered.map((item) => (
              <motion.button
                key={item.id}
                variants={{
                  hidden: {
                    opacity: 0,
                    y: 25,
                    scale: 0.95,
                  },
                  show: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: spring,
                  },
                }}
                whileHover={{
                  y: -4,
                  scale: 1.02,
                }}
                whileTap={{
                  scale: 0.95,
                }}
                transition={spring}
                onClick={() => setLocation(`/apk-mod/${item.id}`)}
                className="bg-card border border-card-border rounded-3xl overflow-hidden text-left shadow-xs"
              >
                <div className="relative aspect-square bg-muted">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-muted-foreground/40" />
                    </div>
                  )}

                  {item.available && (
                    <span className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-full">
                      Tersedia
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-extrabold text-sm text-foreground line-clamp-1">
                    {item.name}
                  </h3>

                  <div className="flex items-center gap-1 mt-2">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />

                    <span className="text-xs text-muted-foreground">
                      {item.rating || 5}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    v{item.version || "-"} • {item.size || "-"}
                  </p>

                  <p className="text-primary font-extrabold mt-2 text-sm">
                    Download
                  </p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}