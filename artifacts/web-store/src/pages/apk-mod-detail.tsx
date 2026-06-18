import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import {
ArrowLeft,
Download,
Star,
Shield,
Zap,
MessageCircle,
CheckCircle2,
} from "lucide-react";
import { AppLayout } from "../components/Layout/AppLayout";
import { getApkMod } from "../lib/firestore";
import type { ApkMod } from "../types";

export default function ApkModDetailPage() {
const [, params] = useRoute("/apk-mod/:id");
const [, setLocation] = useLocation();

const [item, setItem] = useState<ApkMod | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
if (!params?.id) return;

getApkMod(params.id)
  .then((data) => {
    setItem(data);
  })
  .finally(() => {
    setLoading(false);
  });

}, [params?.id]);

if (loading) {
return (
<AppLayout title="Detail APK Mod">
<div className="text-center py-10 text-muted-foreground">
Memuat...
</div>
</AppLayout>
);
}

if (!item) {
return (
<AppLayout title="Detail APK Mod">
<div className="text-center py-10 text-muted-foreground">
APK Mod tidak ditemukan.
</div>
</AppLayout>
);
}

return (
<AppLayout title="Detail APK Mod">
<div className="space-y-5">
<button
onClick={() => setLocation("/apk-mod")}
className="flex items-center gap-2 text-sm text-muted-foreground font-semibold"
>
<ArrowLeft className="w-4 h-4" />
Kembali
</button>

    <div className="rounded-3xl overflow-hidden bg-card border border-card-border">
      <img
        src={item.imageUrl}
        alt={item.name}
        className="w-full aspect-square object-cover"
      />
    </div>

    <div className="bg-card border border-card-border rounded-3xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-extrabold text-lg text-foreground">
            {item.name}
          </h2>

          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span>{item.rating || 5}</span>
            <span>•</span>
            <span>{item.category}</span>
          </div>
        </div>

        <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-full">
          Tersedia
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="rounded-2xl bg-primary/5 p-3">
          <p className="text-[10px] text-muted-foreground">Versi</p>
          <p className="font-bold text-sm">
            {item.version || "-"}
          </p>
        </div>

        <div className="rounded-2xl bg-primary/5 p-3">
          <p className="text-[10px] text-muted-foreground">Ukuran</p>
          <p className="font-bold text-sm">
            {item.size || "-"}
          </p>
        </div>
      </div>

      <a
        href={item.downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 w-full bg-primary text-primary-foreground rounded-2xl p-4 flex items-center justify-center gap-2 font-bold text-sm shadow-md shadow-primary/25"
      >
        <Download className="w-5 h-5" />
        Download APK
      </a>
    </div>

    <div className="bg-card border border-card-border rounded-3xl p-4">
      <h3 className="font-extrabold text-sm text-foreground mb-3">
        Deskripsi APK Mod
      </h3>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {item.description}
      </p>
    </div>

    <div className="bg-card border border-card-border rounded-3xl p-4">
      <h3 className="font-extrabold text-sm text-foreground mb-3">
        Fitur Mod
      </h3>

      <div className="space-y-3">
        {(item.features || []).map((feature) => (
          <div key={feature} className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              {feature}
            </p>
          </div>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div className="bg-card border border-card-border rounded-2xl p-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        <p className="text-xs font-bold">File pilihan</p>
      </div>

      <div className="bg-card border border-card-border rounded-2xl p-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-yellow-500" />
        <p className="text-xs font-bold">Download cepat</p>
      </div>
    </div>

    <a
      href="https://wa.me/6285782544861?text=Halo admin, saya butuh bantuan APK Mod."
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 bg-green-50 border border-green-100 text-green-700 rounded-2xl p-4"
    >
      <MessageCircle className="w-5 h-5" />

      <div>
        <p className="font-bold text-sm">Butuh bantuan?</p>
        <p className="text-[11px]">
          Chat admin via WhatsApp
        </p>
      </div>
    </a>
  </div>
</AppLayout>

);
}