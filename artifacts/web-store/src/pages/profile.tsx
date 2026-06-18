import { useState, useEffect, useCallback } from "react";
import { Camera, Mail, Lock, Crown, MessageCircle, User, CheckCircle2, Loader2, Clock, Infinity } from "lucide-react";
import { updateEmail, updatePassword } from "firebase/auth";
import { AppLayout } from "../components/Layout/AppLayout";
import { useAuth } from "../contexts/AuthContext";
import { updateUserProfile } from "../lib/firestore";
import { uploadToCloudinary } from "../lib/cloudinary";
import { useToast } from "../hooks/use-toast";

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  expired: boolean;
}

function useCountdown(expiry: string | null | undefined): Countdown | null {
  const calc = useCallback((): Countdown | null => {
    if (!expiry) return null;
    const diff = new Date(expiry).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, expired: true };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      totalMs: diff,
      expired: false,
    };
  }, [expiry]);

  const [countdown, setCountdown] = useState<Countdown | null>(calc);

  useEffect(() => {
    if (!expiry) { setCountdown(null); return; }
    setCountdown(calc());
    const id = setInterval(() => setCountdown(calc()), 1000);
    return () => clearInterval(id);
  }, [expiry, calc]);

  return countdown;
}

function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
        <span className="countdown-digit text-xl font-extrabold text-primary tabular-nums leading-none">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}

function ResellerCountdown({ expiry, role }: { expiry?: string | null; role: string }) {
  const countdown = useCountdown(expiry || null);

  if (!expiry) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Infinity className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">{role} Permanen</p>
            <p className="text-xs text-primary font-medium">Aktif selamanya ✨</p>
          </div>
        </div>
      </div>
    );
  }

  if (!countdown) return null;

  const isExpired = countdown.expired;
  const isUrgent = !isExpired && countdown.days < 1;
  const isWarning = !isExpired && countdown.days < 7;

  const accentColor = isExpired
    ? "text-red-500"
    : isUrgent
    ? "text-red-500"
    : isWarning
    ? "text-amber-500"
    : "text-primary";

  const bgColor = isExpired
    ? "from-red-50 to-red-50/30 border-red-200"
    : isUrgent
    ? "from-red-50 to-red-50/30 border-red-200"
    : isWarning
    ? "from-amber-50 to-amber-50/30 border-amber-200"
    : "from-primary/10 to-primary/5 border-primary/20";

  const blockBg = isExpired || isUrgent
    ? "bg-red-100"
    : isWarning
    ? "bg-amber-100"
    : "bg-primary/10";

  const blockText = isExpired || isUrgent
    ? "text-red-600"
    : isWarning
    ? "text-amber-600"
    : "text-primary";

  return (
    <div className={`rounded-2xl p-4 bg-gradient-to-r ${bgColor} border space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock className={`w-4 h-4 ${accentColor}`} />
          <p className="text-xs font-bold text-foreground">
            {isExpired ? "Masa Aktif Berakhir" : "Sisa Masa Aktif"}
          </p>
        </div>
        {!isExpired && (
          <p className="text-[10px] text-muted-foreground">
            Berakhir {new Date(expiry).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}
      </div>

      {isExpired ? (
        <div className="text-center py-2">
          <p className="text-sm font-bold text-red-500">Membership telah berakhir</p>
          <p className="text-xs text-muted-foreground mt-1">Perpanjang paket reseller kamu</p>
        </div>
      ) : (
        <div className="flex justify-center gap-2">
          {[
            { value: countdown.days, label: "Hari" },
            { value: countdown.hours, label: "Jam" },
            { value: countdown.minutes, label: "Menit" },
            { value: countdown.seconds, label: "Detik" },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div className={`w-14 h-14 rounded-2xl ${blockBg} flex items-center justify-center`}>
                <span className={`text-xl font-extrabold ${blockText} tabular-nums`}>
                  {String(value).padStart(2, "0")}
                </span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      )}

      {isWarning && !isExpired && (
        <p className={`text-[11px] font-semibold text-center ${accentColor}`}>
          {isUrgent ? "⚠️ Kurang dari 24 jam! Segera perpanjang." : `⚠️ Tinggal ${countdown.days} hari lagi!`}
        </p>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { firebaseUser, userProfile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(userProfile?.displayName || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [updatingEmail, setUpdatingEmail] = useState(false);

  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [updatingPass, setUpdatingPass] = useState(false);

  const adminWa = import.meta.env.VITE_ADMIN_WHATSAPP || "6285782544861";
  const isReseller = userProfile?.role === "reseller" || userProfile?.role === "admin";
  const roleLabel = userProfile?.role === "admin" ? "Admin" : userProfile?.role === "reseller" ? "Reseller" : "User";
  const roleStyle = userProfile?.role === "admin"
    ? "bg-purple-100 text-purple-700"
    : isReseller
    ? "bg-blue-100 text-blue-700"
    : "bg-primary/10 text-primary";

  const handleSaveProfile = async () => {
    if (!userProfile || !name.trim()) return;
    setSavingProfile(true);
    try {
      await updateUserProfile(userProfile.id, { displayName: name.trim() });
      await refreshProfile();
      toast({ title: "Profil berhasil disimpan!" });
    } catch {
      toast({ title: "Gagal", description: "Coba lagi.", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadToCloudinary(file);
      await updateUserProfile(userProfile.id, { photoURL: url });
      await refreshProfile();
      toast({ title: "Foto profil diperbarui!" });
    } catch {
      toast({ title: "Gagal upload foto", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!firebaseUser || !newEmail.trim()) return;
    setUpdatingEmail(true);
    try {
      await updateEmail(firebaseUser, newEmail.trim());
      if (userProfile) await updateUserProfile(userProfile.id, { email: newEmail.trim() });
      await refreshProfile();
      toast({ title: "Email berhasil diperbarui!" });
      setNewEmail("");
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message.includes("requires-recent-login")
        ? "Silakan login ulang terlebih dahulu."
        : "Gagal update email.";
      toast({ title: "Gagal", description: msg, variant: "destructive" });
    } finally {
      setUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!firebaseUser || !newPass || !confirmPass) return;
    if (newPass !== confirmPass) { toast({ title: "Password tidak sama", variant: "destructive" }); return; }
    if (newPass.length < 6) { toast({ title: "Password minimal 6 karakter", variant: "destructive" }); return; }
    setUpdatingPass(true);
    try {
      await updatePassword(firebaseUser, newPass);
      toast({ title: "Password berhasil diperbarui!" });
      setNewPass(""); setConfirmPass("");
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message.includes("requires-recent-login")
        ? "Silakan login ulang terlebih dahulu." : "Gagal update password.";
      toast({ title: "Gagal", description: msg, variant: "destructive" });
    } finally {
      setUpdatingPass(false);
    }
  };

  return (
    <AppLayout title="Profil">
      <div className="space-y-4 max-w-lg mx-auto">

        {/* Avatar card */}
        <div className="card-enter bg-card rounded-3xl border border-card-border p-6 space-y-4">
          <div>
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Profil Saya</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Kelola informasi akun, email, dan password kamu.</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold overflow-hidden">
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  userProfile?.displayName?.[0]?.toUpperCase() || "U"
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-lg flex items-center justify-center cursor-pointer shadow-sm transition-transform active:scale-90">
                {uploadingPhoto ? <Loader2 className="w-3 h-3 text-white animate-spin" /> : <Camera className="w-3 h-3 text-white" />}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground truncate">{userProfile?.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{userProfile?.email}</p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${roleStyle}`}>
                  {isReseller && <CheckCircle2 className="w-2.5 h-2.5" />}
                  {roleLabel}
                </span>
                <span className="text-[10px] text-muted-foreground">{userProfile?.totalTransactions || 0} transaksi</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Username
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              data-testid="input-display-name"
              className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary input-smooth"
            />
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            data-testid="btn-save-profile"
            className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-2xl flex items-center justify-center gap-2 shadow-sm shadow-primary/25 disabled:opacity-60 btn-smooth"
          >
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Profil"}
          </button>
        </div>

        {/* Reseller Membership */}
        {isReseller && (
          <div className="card-enter-delay bg-card rounded-3xl border border-card-border p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-foreground">Masa Aktif Membership</h3>
            </div>
            <ResellerCountdown
              expiry={userProfile?.resellerExpiry}
              role={roleLabel}
            />
          </div>
        )}

        {/* Change email */}
        <div className="card-enter-delay bg-card rounded-3xl border border-card-border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-bold text-sm text-foreground">Ubah Email</h3>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Email saat ini: {userProfile?.email}</label>
            <input
              type="email"
              placeholder="Email baru"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              data-testid="input-new-email"
              className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary input-smooth"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">Konfirmasi akan dikirim ke email baru.</p>
          </div>
          <button
            onClick={handleUpdateEmail}
            disabled={updatingEmail || !newEmail}
            data-testid="btn-update-email"
            className="w-full bg-card border border-card-border font-semibold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 btn-smooth hover:border-primary/50"
          >
            {updatingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4" /> Update Email</>}
          </button>
        </div>

        {/* Change password */}
        <div className="card-enter-delay bg-card rounded-3xl border border-card-border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-bold text-sm text-foreground">Ubah Password</h3>
          </div>
          <input
            type="password"
            placeholder="Password baru (min 6 karakter)"
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
            data-testid="input-new-password"
            className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary input-smooth"
          />
          <input
            type="password"
            placeholder="Ulangi password baru"
            value={confirmPass}
            onChange={e => setConfirmPass(e.target.value)}
            data-testid="input-confirm-password"
            className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary input-smooth"
          />
          <button
            onClick={handleUpdatePassword}
            disabled={updatingPass || !newPass || !confirmPass}
            data-testid="btn-update-password"
            className="w-full bg-card border border-card-border font-semibold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 btn-smooth hover:border-primary/50"
          >
            {updatingPass ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4" /> Update Password</>}
          </button>
        </div>

        {/* Contact admin */}
        <a
          href={`https://wa.me/${adminWa}?text=Halo admin PremiumStore, saya butuh bantuan dengan akun saya.`}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="btn-contact-admin-profile"
          className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 btn-smooth hover:bg-green-100"
        >
          <MessageCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold text-sm">Hubungi Admin</p>
            <p className="text-[11px] text-green-600">via WhatsApp</p>
          </div>
        </a>
      </div>
    </AppLayout>
  );
}
