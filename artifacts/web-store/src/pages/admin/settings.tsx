import { useEffect, useState } from "react";
import {
  Settings,
  Key,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Megaphone,
} from "lucide-react";
import { AppLayout } from "../../components/Layout/AppLayout";
import {
  getSettings,
  updateSettings,
  subscribeBroadcast,
  updateBroadcast,
} from "../../lib/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/use-toast";
import { useLocation } from "wouter";
import type { BroadcastSetting } from "../../types";

const defaultBroadcast: BroadcastSetting = {
  enabled: false,
  title: "",
  message: "",
  type: "info",
};

export default function AdminSettings() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [qrisApiKey, setQrisApiKey] = useState("");
  const [homeBroadcast, setHomeBroadcast] =
    useState<BroadcastSetting>(defaultBroadcast);
  const [nokosBroadcast, setNokosBroadcast] =
    useState<BroadcastSetting>(defaultBroadcast);

  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      setLocation("/");
      return;
    }

    getSettings().then((s: Record<string, unknown>) => {
      setQrisApiKey((s.qrisApiKey as string) || "");
      setLoading(false);
    });

    const unsubHome = subscribeBroadcast("broadcast_home", (data) => {
      if (data) setHomeBroadcast(data);
    });

    const unsubNokos = subscribeBroadcast("broadcast_nokos", (data) => {
      if (data) setNokosBroadcast(data);
    });

    return () => {
      unsubHome();
      unsubNokos();
    };
  }, [isAdmin, setLocation]);

  const handleSave = async () => {
    setSaving(true);

    try {
      await updateSettings({ qrisApiKey });
      await updateBroadcast("broadcast_home", homeBroadcast);
      await updateBroadcast("broadcast_nokos", nokosBroadcast);

      toast({ title: "Pengaturan disimpan!" });
    } catch {
      toast({ title: "Gagal menyimpan", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const renderBroadcastForm = (
    title: string,
    value: BroadcastSetting,
    setValue: (data: BroadcastSetting) => void,
  ) => (
    <div className="bg-card rounded-3xl border border-card-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-bold text-sm text-foreground">{title}</h3>
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) =>
            setValue({
              ...value,
              enabled: e.target.checked,
            })
          }
        />
        Aktifkan pengumuman
      </label>

      <input
        value={value.title}
        onChange={(e) =>
          setValue({
            ...value,
            title: e.target.value,
          })
        }
        placeholder="Judul pengumuman"
        className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
      />

      <textarea
        value={value.message}
        onChange={(e) =>
          setValue({
            ...value,
            message: e.target.value,
          })
        }
        placeholder="Isi pesan pengumuman"
        rows={4}
        className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
      />

      <select
        value={value.type}
        onChange={(e) =>
          setValue({
            ...value,
            type: e.target.value as BroadcastSetting["type"],
          })
        }
        className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
      >
        <option value="info">Info</option>
        <option value="warning">Warning</option>
        <option value="success">Success</option>
        <option value="danger">Danger</option>
      </select>
    </div>
  );

  if (!isAdmin) return null;

  return (
    <AppLayout title="Pengaturan">
      <div className="space-y-5 max-w-lg mx-auto">
        <div className="mint-gradient rounded-3xl p-5 border border-primary/15">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-5 h-5 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Konfigurasi
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-foreground">
            Pengaturan Sistem
          </h2>
        </div>

        {loading ? (
          <div className="h-40 bg-card rounded-2xl border border-card-border skeleton-pulse" />
        ) : (
          <>
            <div className="bg-card rounded-3xl border border-card-border p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-bold text-sm text-foreground">
                  API Key QRIS (RamaShop)
                </h3>
              </div>

              <p className="text-xs text-muted-foreground -mt-2">
                API Key dari https://ramashop.my.id untuk generate QRIS otomatis.
              </p>

              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={qrisApiKey}
                  onChange={(e) => setQrisApiKey(e.target.value)}
                  placeholder="rg_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  data-testid="input-qris-api-key"
                  className="w-full bg-muted border border-input rounded-2xl px-4 pr-10 py-3 text-sm font-mono focus:outline-none focus:border-primary"
                />

                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5">
                <p className="text-xs font-bold text-amber-800 mb-1">
                  Peringatan Keamanan
                </p>
                <p className="text-[11px] text-amber-700">
                  Jangan pernah membagikan API Key Anda. Simpan dengan aman dan
                  jangan taruh di repositori publik.
                </p>
              </div>
            </div>

            {renderBroadcastForm(
              "Broadcast Homepage",
              homeBroadcast,
              setHomeBroadcast,
            )}

            {renderBroadcastForm(
              "Broadcast Halaman Nokos",
              nokosBroadcast,
              setNokosBroadcast,
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              data-testid="btn-save-settings"
              className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-2xl flex items-center justify-center gap-2 shadow-sm shadow-primary/25 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan Pengaturan
                </>
              )}
            </button>
          </>
        )}
      </div>
    </AppLayout>
  );
}