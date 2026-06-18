import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Package, Star, Shield, Zap, Headphones, DollarSign, Search, Filter } from "lucide-react";
import { AppLayout } from "../components/Layout/AppLayout";
import { subscribeProducts } from "../lib/firestore";
import { useAuth } from "../contexts/AuthContext";
import type { Product } from "../types";

const features = [
  { icon: Shield, title: "Bergaransi", desc: "Semua produk premium bergaransi resmi dari admin." },
  { icon: DollarSign, title: "Harga Murah", desc: "Harga terjangkau, lebih murah dari pasaran." },
  { icon: Zap, title: "Proses Cepat", desc: "Pengiriman otomatis setelah pembayaran dikonfirmasi." },
  { icon: Headphones, title: "Support Admin", desc: "Tim support siap membantu 24/7 via WhatsApp." },
];

export default function ProductsPage() {
  const [, setLocation] = useLocation();
  const { isReseller } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");

  useEffect(() => {
    const unsub = subscribeProducts((prods) => {
      setProducts(prods.filter(p => p.available !== false));
      setLoading(false);
    });
    return unsub;
  }, []);

  const categories = ["Semua", ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Semua" || p.category === category;
    return matchSearch && matchCat;
  });

  return (
    <AppLayout title="Produk">
      <div className="space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mint-gradient rounded-3xl p-5 border border-primary/15"
        >
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-5 h-5 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Produk Digital</span>
          </div>
          <h2 className="text-xl font-extrabold text-foreground">Produk Premium Pilihan</h2>
          <p className="text-sm text-muted-foreground mt-1">Berbagai produk digital bergaransi dengan harga terbaik.</p>
        </motion.div>

        {/* Why features */}
        <div className="grid grid-cols-2 gap-2.5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              className="bg-card border border-card-border rounded-2xl p-3.5"
            >
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <f.icon className="w-4 h-4 text-primary" />
              </div>
              <p className="font-bold text-xs text-foreground">{f.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Search & filter */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Cari produk..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-search-products"
              className="w-full bg-card border border-card-border rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  category === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card border border-card-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card rounded-3xl border border-card-border overflow-hidden">
                <div className="aspect-square bg-muted skeleton-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-3.5 bg-muted rounded-full skeleton-pulse w-3/4" />
                  <div className="h-3 bg-muted rounded-full skeleton-pulse w-1/2" />
                  <div className="h-4 bg-muted rounded-full skeleton-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-semibold text-muted-foreground">Belum ada produk</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Coba kata kunci lain</p>
          </div>
        ) : (
          <motion.div
            variants={{ show: { transition: { staggerChildren: 0.06 } } }}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          >
            {filtered.map(product => (
              <motion.button
                key={product.id}
                variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
                onClick={() => setLocation(`/products/${product.id}`)}
                data-testid={`card-product-${product.id}`}
                className="bg-card rounded-3xl border border-card-border overflow-hidden text-left card-lift shadow-xs hover:shadow-md transition-all"
              >
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className="text-[10px] font-bold bg-primary/90 text-primary-foreground px-2 py-0.5 rounded-full">
                      {product.available !== false ? "Tersedia" : "Habis"}
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-bold text-xs text-foreground leading-tight line-clamp-2">{product.name}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-[10px] text-muted-foreground">{product.rating?.toFixed(1) || "5.0"}</span>
                  </div>
                  <div className="mt-2">
                    {isReseller && product.resellerPrice ? (
                      <>
                        <p className="text-[10px] text-muted-foreground line-through">Rp {product.price.toLocaleString("id-ID")}</p>
                        <p className="text-xs font-extrabold text-primary">Rp {product.resellerPrice.toLocaleString("id-ID")}</p>
                        <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">Harga Reseller</span>
                      </>
                    ) : (
                      <p className="text-xs font-extrabold text-primary">Rp {product.price.toLocaleString("id-ID")}</p>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
