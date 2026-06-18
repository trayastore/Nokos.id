import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Star, ShoppingCart, ChevronLeft, ChevronRight, Package,
  Shield, Zap, Check, MessageCircle,
} from "lucide-react";
import { AppLayout } from "../components/Layout/AppLayout";
import { getProduct } from "../lib/firestore";
import { PaymentModal } from "../components/PaymentModal";
import { useAuth } from "../contexts/AuthContext";
import type { Product, ProductVariant } from "../types";

export default function ProductDetail() {
  const [, params] = useRoute("/products/:id");
  const [, setLocation] = useLocation();
  const { isReseller } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [payOpen, setPayOpen] = useState(false);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);

  useEffect(() => {
    if (!params?.id) return;
    getProduct(params.id).then(p => {
      setProduct(p);
      setLoading(false);
    });
  }, [params?.id]);

  if (loading) {
    return (
      <AppLayout title="Detail Produk">
        <div className="space-y-4 animate-pulse">
          <div className="aspect-[4/3] bg-muted rounded-3xl skeleton-pulse" />
          <div className="h-6 bg-muted rounded-full skeleton-pulse w-3/4" />
          <div className="h-4 bg-muted rounded-full skeleton-pulse w-1/2" />
        </div>
      </AppLayout>
    );
  }

  if (!product) {
    return (
      <AppLayout title="Produk Tidak Ditemukan">
        <div className="text-center py-20">
          <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-semibold text-muted-foreground">Produk tidak ditemukan</p>
          <button onClick={() => setLocation("/products")} className="mt-4 text-primary text-sm font-semibold">
            ← Kembali
          </button>
        </div>
      </AppLayout>
    );
  }

  const allImages = [product.imageUrl, ...(product.previewImages || [])].filter(Boolean) as string[];
  const activeVariants = product.variants?.filter(v => v.isActive) ?? [];
  const currentVariant: ProductVariant | undefined = activeVariants[selectedVariantIdx];
  const price = currentVariant
    ? (isReseller && currentVariant.resellerPrice > 0 ? currentVariant.resellerPrice : currentVariant.price)
    : (isReseller && (product.resellerPrice || 0) > 0 ? product.resellerPrice! : product.price);

  const adminWa = import.meta.env.VITE_ADMIN_WHATSAPP || "6285782544861";

  const payItem = product && currentVariant ? {
    type: "product" as const,
    product,
    variantId: currentVariant.id,
    variantName: currentVariant.name,
    price,
    name: `${product.name} - ${currentVariant.name}`,
  } : product ? {
    type: "product" as const,
    product,
    price,
    name: product.name,
  } : null;

  return (
    <AppLayout title="Detail Produk">
      <div className="space-y-5 max-w-lg mx-auto">
        <button onClick={() => setLocation("/products")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>

        {/* Image slider */}
        <div className="relative">
          <div className="aspect-[9/14] sm:aspect-[4/3] rounded-3xl overflow-hidden bg-muted">
            <AnimatePresence mode="wait">
              {allImages.length > 0 ? (
                <motion.img key={imgIdx} src={allImages[imgIdx]} alt={product.name}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-muted-foreground/30" />
                </div>
              )}
            </AnimatePresence>
          </div>
          {allImages.length > 1 && (
            <>
              <button onClick={() => setImgIdx(i => Math.max(0, i - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setImgIdx(i => Math.min(allImages.length - 1, i + 1))}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {allImages.map((_, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    className={`rounded-full transition-all ${i === imgIdx ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`} />
                ))}
              </div>
            </>
          )}
        </div>

        {allImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {allImages.map((img, i) => (
              <button key={i} onClick={() => setImgIdx(i)}
                className={`shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${i === imgIdx ? "border-primary" : "border-transparent"}`}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="bg-card rounded-3xl border border-card-border p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-lg font-extrabold text-foreground">{product.name}</h1>
              <span className="shrink-0 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">
                {product.available !== false ? "Tersedia" : "Habis"}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(product.rating || 5) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{product.rating?.toFixed(1) || "5.0"}</span>
              {product.category && (
                <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{product.category}</span>
              )}
            </div>
          </div>

          {/* Variants */}
          {activeVariants.length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2">Pilih Varian</p>
              <div className="flex flex-wrap gap-2">
                {activeVariants.map((v, i) => (
                  <button key={v.id} onClick={() => setSelectedVariantIdx(i)}
                    data-testid={`variant-${i}`}
                    className={`px-3 py-2 rounded-xl text-xs border-2 transition-all text-left ${selectedVariantIdx === i ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground hover:border-primary/30"}`}>
                    <p className="font-semibold">{v.name}</p>
                    {v.description && <p className="text-[10px] opacity-70 mt-0.5">{v.description}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price */}
          <div className="flex items-end justify-between">
            <div>
              {isReseller && currentVariant?.resellerPrice > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground line-through">Rp {currentVariant.price.toLocaleString("id-ID")}</p>
                  <p className="text-2xl font-extrabold text-primary">Rp {currentVariant.resellerPrice.toLocaleString("id-ID")}</p>
                  <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">Harga Reseller</span>
                </>
              ) : (
                <p className="text-2xl font-extrabold text-primary">Rp {price.toLocaleString("id-ID")}</p>
              )}
            </div>
            <button
              onClick={() => setPayOpen(true)}
              data-testid="btn-buy-now"
              disabled={product.available === false}
              className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-2xl flex items-center gap-2 shadow-md shadow-primary/25 active:scale-[0.98] transition-all disabled:opacity-50">
              <ShoppingCart className="w-4 h-4" /> Beli Sekarang
            </button>
          </div>
        </div>

        {/* Variant description detail */}
        {currentVariant?.description && (
          <div className="bg-card rounded-3xl border border-card-border p-5">
            <h3 className="font-bold text-sm text-foreground mb-2">Detail Varian</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{currentVariant.description}</p>
          </div>
        )}

        {/* Description */}
        <div className="bg-card rounded-3xl border border-card-border p-5">
          <h3 className="font-bold text-sm text-foreground mb-3">Deskripsi Produk</h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{product.description || "Tidak ada deskripsi."}</p>
        </div>

        {/* Benefits */}
        {product.benefits && product.benefits.length > 0 && (
          <div className="bg-card rounded-3xl border border-card-border p-5">
            <h3 className="font-bold text-sm text-foreground mb-3">Keuntungan Produk</h3>
            <div className="space-y-2">
              {product.benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <p className="text-sm text-foreground">{b}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trust badges */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-card rounded-2xl border border-card-border p-3.5 flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-primary shrink-0" />
            <p className="text-xs font-semibold text-foreground">Bergaransi resmi</p>
          </div>
          <div className="bg-card rounded-2xl border border-card-border p-3.5 flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs font-semibold text-foreground">Diproses cepat</p>
          </div>
        </div>

        <a href={`https://wa.me/${adminWa}?text=Halo admin, saya tertarik dengan produk: ${product.name}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4">
          <MessageCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold text-sm">Butuh bantuan?</p>
            <p className="text-xs opacity-80">Chat admin via WhatsApp</p>
          </div>
        </a>
      </div>

      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        item={payItem}
        onSuccess={() => setPayOpen(false)}
      />
    </AppLayout>
  );
}
