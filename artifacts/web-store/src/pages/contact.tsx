import { motion } from "framer-motion";
import { MessageCircle, Phone, Clock, Star, ArrowRight } from "lucide-react";
import { AppLayout } from "../components/Layout/AppLayout";

export default function ContactPage() {
  const adminWa = import.meta.env.VITE_ADMIN_WHATSAPP || "6285782544861";

  const topics = [
    "Saya ingin bertanya tentang produk",
    "Saya ingin upgrade reseller",
    "Saya ada masalah dengan pesanan",
    "Saya ingin beli panel",
    "Saya butuh bantuan teknis",
  ];

  return (
    <AppLayout title="Kontak Admin">
      <div className="space-y-5 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
        >
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">Chat Admin</h2>
            <p className="text-white/80 text-sm mt-1">Respon cepat via WhatsApp</p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-1.5 text-white/90 text-xs">
                <Clock className="w-3.5 h-3.5" />
                <span>24/7 Support</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/90 text-xs">
                <Star className="w-3.5 h-3.5 fill-white" />
                <span>Respon Cepat</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="bg-card rounded-3xl border border-card-border p-5">
          <h3 className="font-bold text-sm text-foreground mb-3">Pilih Topik Pertanyaan</h3>
          <div className="space-y-2">
            {topics.map((topic, i) => (
              <a
                key={i}
                href={`https://wa.me/${adminWa}?text=${encodeURIComponent(topic)}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`btn-topic-${i}`}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-muted hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all group"
              >
                <span className="text-sm text-foreground font-medium">{topic}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
            ))}
          </div>
        </div>

        <a
          href={`https://wa.me/${adminWa}`}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="btn-open-whatsapp"
          className="flex items-center justify-center gap-3 bg-green-500 text-white rounded-3xl p-4 font-bold text-sm shadow-lg shadow-green-500/30 active:scale-[0.98] transition-transform"
        >
          <Phone className="w-5 h-5" />
          Buka WhatsApp Sekarang
        </a>

        <div className="bg-card rounded-3xl border border-card-border p-5 text-center">
          <p className="text-xs text-muted-foreground">Nomor Admin</p>
          <p className="font-bold text-foreground mt-1">+{adminWa}</p>
          <p className="text-xs text-muted-foreground mt-1">Hanya via WhatsApp</p>
        </div>
      </div>
    </AppLayout>
  );
}
