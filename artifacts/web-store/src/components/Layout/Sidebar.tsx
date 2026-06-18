import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, Server, History, User, Crown, MessageCircle,
  ShieldCheck, LogOut, X, ChevronRight, Store, Smartphone, MonitorSmartphone,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Produk", href: "/products", icon: Package },
  { label: "Panel", href: "/panels", icon: Server },
  { label: "Data APK Premium", href: "/my-accounts", icon: Smartphone },
  { label: "Panel Aktif", href: "/my-panels", icon: MonitorSmartphone },
  { label: "Riwayat Beli", href: "/history", icon: History },
  { label: "Profil", href: "/profile", icon: User },
  { label: "Upgrade Reseller", href: "/upgrade", icon: Crown },
  { label: "Kontak Admin", href: "/contact", icon: MessageCircle },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { userProfile, logout, isAdmin } = useAuth();

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const roleLabel = userProfile?.role === "admin" ? "Admin" : userProfile?.role === "reseller" ? "Reseller" : "User";
  const roleColor = userProfile?.role === "admin" ? "bg-purple-100 text-purple-700" : userProfile?.role === "reseller" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700";

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-card-border h-full fixed left-0 top-0 bottom-0 z-30 shadow-md">
        <SidebarContent
          location={location}
          userProfile={userProfile}
          roleLabel={roleLabel}
          roleColor={roleColor}
          isAdmin={isAdmin}
          onLogout={handleLogout}
          onClose={onClose}
          navItems={navItems}
        />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-card z-50 shadow-2xl lg:hidden flex flex-col"
          >
            <SidebarContent
              location={location}
              userProfile={userProfile}
              roleLabel={roleLabel}
              roleColor={roleColor}
              isAdmin={isAdmin}
              onLogout={handleLogout}
              onClose={onClose}
              navItems={navItems}
              showClose
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

interface SidebarContentProps {
  location: string;
  userProfile: ReturnType<typeof useAuth>["userProfile"];
  roleLabel: string;
  roleColor: string;
  isAdmin: boolean;
  onLogout: () => void;
  onClose: () => void;
  navItems: typeof navItems;
  showClose?: boolean;
}

function SidebarContent({ location, userProfile, roleLabel, roleColor, isAdmin, onLogout, onClose, navItems, showClose }: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-card-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary flex items-center justify-center shadow-sm">
              <Store className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground leading-tight">PremiumStore</p>
              <p className="text-[10px] text-muted-foreground">Digital Shop</p>
            </div>
          </div>
          {showClose && (
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* User info */}
      <div className="mx-4 mt-4 p-3.5 rounded-2xl mint-gradient-card border border-primary/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
            {userProfile?.displayName?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{userProfile?.displayName}</p>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", roleColor)}>{roleLabel}</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className={cn("w-4.5 h-4.5 shrink-0", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground")} />
              <span className="flex-1 truncate">{item.label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-70 shrink-0" />}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-2 pb-1">
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-3.5">Admin</p>
            </div>
            <Link
              href="/admin"
              onClick={onClose}
              data-testid="nav-admin-panel"
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                location.startsWith("/admin")
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              )}
            >
              <ShieldCheck className="w-4.5 h-4.5 shrink-0" />
              <span className="flex-1">Admin Panel</span>
            </Link>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-card-border">
        <button
          onClick={onLogout}
          data-testid="btn-logout"
          className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200"
        >
          <LogOut className="w-4.5 h-4.5" />
          Logout
        </button>
      </div>
    </div>
  );
}
