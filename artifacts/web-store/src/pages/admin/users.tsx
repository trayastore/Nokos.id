import { useEffect, useState } from "react";
import { Users, Search, Crown, Shield, User } from "lucide-react";
import { AppLayout } from "../../components/Layout/AppLayout";
import { getAllUsers, updateUserProfile } from "../../lib/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/use-toast";
import type { User as UserType } from "../../types";
import { useLocation } from "wouter";

export default function AdminUsers() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isAdmin) { setLocation("/"); return; }
    getAllUsers().then(us => { setUsers(us); setLoading(false); });
  }, [isAdmin, setLocation]);

  const handleRoleChange = async (uid: string, role: UserType["role"]) => {
    await updateUserProfile(uid, { role });
    setUsers(us => us.map(u => u.id === uid ? { ...u, role } : u));
    toast({ title: "Role diperbarui!" });
  };

  const filtered = users.filter(u =>
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const roleConfig = {
    admin: { label: "Admin", bg: "bg-purple-100 text-purple-700", icon: Shield },
    reseller: { label: "Reseller", bg: "bg-blue-100 text-blue-700", icon: Crown },
    user: { label: "User", bg: "bg-muted text-muted-foreground", icon: User },
  };

  if (!isAdmin) return null;

  return (
    <AppLayout title="Kelola Pengguna">
      <div className="space-y-4">
        <div className="bg-card rounded-2xl border border-card-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-bold text-foreground">TOTAL PENGGUNA</span>
            </div>
            <span className="text-2xl font-extrabold text-foreground">{users.length}</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama atau email..."
              className="w-full bg-muted border border-input rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-2.5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-card rounded-2xl border border-card-border skeleton-pulse" />)}</div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(user => {
              const rc = roleConfig[user.role] || roleConfig.user;
              return (
                <div key={user.id} className="bg-card rounded-2xl border border-card-border p-3.5 flex items-center gap-3" data-testid={`user-${user.id}`}>
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                    {user.displayName?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <p className="text-[10px] text-muted-foreground">{user.totalTransactions || 0} transaksi</p>
                  </div>
                  <div className="shrink-0">
                    <select
                      value={user.role}
                      onChange={e => handleRoleChange(user.id, e.target.value as UserType["role"])}
                      className={`text-[10px] font-bold px-2 py-1 rounded-full border-0 cursor-pointer ${rc.bg}`}
                      data-testid={`select-role-${user.id}`}
                    >
                      <option value="user">User</option>
                      <option value="reseller">Reseller</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 bg-card rounded-2xl border border-card-border">
                <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Tidak ada pengguna ditemukan</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
