import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Package,
  Server,
  Crown,
  History,
  Users,
  Settings,
  ChevronRight,
  LayoutDashboard,
  ClipboardList,
  ShieldCheck,
  Star,
  Smartphone,
  Download,
} from "lucide-react";
import { AppLayout } from "../../components/Layout/AppLayout";
import { getProducts, getPanels, getAllTransactions, getManualOrders, getAllUsers } from "../../lib/firestore";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState({ products: 0, panels: 0, transactions: 0, users: 0, manualOrders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) { setLocation("/"); return; }
    Promise.all([
      getProducts(), getPanels(), getAllTransactions(), getAllUsers(), getManualOrders()
    ]).then(([prods, panels, txs, users, orders]) => {
      setStats({
        products: prods.length,
        panels: panels.length,
        transactions: txs.length,
        users: users.length,
        manualOrders: orders.filter(o => o.status === "waiting" || o.status === "processing").length,
      });
      setLoading(false);
    });
  }, [isAdmin, setLocation]);

  if (!isAdmin) return null;

  const menu = [
    { label: "Pesanan Manual", desc: "Proses dan kirim data ke pembeli", icon: ClipboardList, href: "/admin/manual-orders", color: "bg-orange-50 text-orange-600", badge: stats.manualOrders, badgeAlert: stats.manualOrders > 0 },
    { label: "Kelola Produk", desc: "Tambah, edit, hapus produk digital", icon: Package, href: "/admin/products", color: "bg-emerald-50 text-emerald-600", badge: stats.products },
    { label: "Kelola Panel", desc: "Kelola daftar panel dengan varian", icon: Server, href: "/admin/panels", color: "bg-blue-50 text-blue-600", badge: stats.panels },
    {
      label: "Kelola APK Mod",
      desc: "Tambah, edit, hapus APK Mod",
      icon: Download,
      href: "/admin/apk-mod",
      color: "bg-pink-50 text-pink-600",
    },
    { label: "Kelola Nokos", desc: "Tambah, edit, hapus layanan nokos", icon: Smartphone, href: "/admin/nokos", color: "bg-green-50 text-green-600" },
    { label: "Paket Reseller", desc: "Atur paket upgrade membership reseller", icon: Crown, href: "/admin/reseller-packages", color: "bg-amber-50 text-amber-600" },
    { label: "Riwayat Transaksi", desc: "Semua transaksi pembayaran", icon: History, href: "/admin/transactions", color: "bg-purple-50 text-purple-600", badge: stats.transactions },
    { label: "User Management", desc: "Daftar dan kelola semua pengguna", icon: Users, href: "/admin/users", color: "bg-pink-50 text-pink-600", badge: stats.users },
    { label: "Testimoni", desc: "Kelola testimoni pembeli", icon: Star, href: "/admin/testimonials", color: "bg-yellow-50 text-yellow-600" },
    { label: "Pengaturan", desc: "API Key QRIS & konfigurasi sistem", icon: Settings, href: "/admin/settings", color: "bg-slate-100 text-slate-600" },
  ];

  return (
    <AppLayout title="Admin Panel">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
        >
          <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
          <div className="flex items-center gap-3 relative z-10">
            <ShieldCheck className="w-8 h-8 text-white" />
            <div>
              <h2 className="text-xl font-extrabold text-white">Admin Panel</h2>
              <p className="text-white/70 text-xs mt-0.5">Kelola seluruh toko dari sini</p>
            </div>
          </div>
          {stats.manualOrders > 0 && (
            <div className="mt-3 bg-white/20 backdrop-blur-sm rounded-2xl px-3 py-2 inline-flex items-center gap-2 relative z-10">
              <ClipboardList className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-xs">{stats.manualOrders} pesanan menunggu diproses</span>
            </div>
          )}
          {!loading && (
            <div className="mt-3 grid grid-cols-3 gap-2 relative z-10">
              {[
                { label: "Produk", val: stats.products },
                { label: "Pengguna", val: stats.users },
                { label: "Transaksi", val: stats.transactions },
              ].map(s => (
                <div key={s.label} className="bg-white/10 rounded-2xl p-2.5 text-center">
                  <p className="text-white font-extrabold text-lg leading-none">{s.val}</p>
                  <p className="text-white/70 text-[10px] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {menu.map((item) => (
            <motion.button
              key={item.label}
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
              onClick={() => setLocation(item.href)}
              className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-card-border text-left hover:border-primary/30 hover:shadow-sm transition-all group card-lift"
            >
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-foreground">{item.label}</p>
                  {item.badge !== undefined && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeAlert ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </motion.button>
          ))}
        </motion.div>
      </div>
    </AppLayout>
  );
}