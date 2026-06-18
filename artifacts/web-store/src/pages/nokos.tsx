import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  Globe2,
  Server,
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  Loader2,
  Wallet,
  QrCode,
  X,
  Clock,
  Copy,
  History,
  Search,
} from "lucide-react";
import { useLocation } from "wouter";

import { AppLayout } from "../components/Layout/AppLayout";
import { BroadcastCard } from "../components/BroadcastCard";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  getNokosServices,
  getNokosCountries,
  getNokosPrices,
  placeNokosOrder,
  createNokosDeposit,
  checkNokosDeposit,
  extractServices,
  extractCountries,
  extractPrices,
  extractNokosPriceFromDocs,
  extractOrderResult,
  extractDepositResult,
  extractDepositStatus,
  type PriceInfo,
} from "../lib/nokos-api";
import {
  createNokosOrder,
  createNokosDeposit as saveDeposit,
  updateNokosDeposit,
  getOrCreateWallet,
  subscribeWallet,
  finalizeNokosDepositPaid,
  deductWallet,
  syncWalletFromHistory,
  getSettings,
  subscribeBroadcast,
} from "../lib/firestore";
import type { NokosWallet, BroadcastSetting } from "../types";

type SelectOption = { value: string; label: string; desc?: string };

function CustomSelect({
  label,
  icon: Icon,
  value,
  placeholder,
  options,
  disabled,
  loading,
  onChange,
  searchable,
}: {
  label: string;
  icon?: React.ElementType;
  value: string;
  placeholder: string;
  options: SelectOption[];
  disabled?: boolean;
  loading?: boolean;
  searchable?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.value === value);

  const filtered =
    searchable && query.trim()
      ? options.filter((o) =>
          o.label.toLowerCase().includes(query.toLowerCase()),
        )
      : options;

  const handleOpen = () => {
    setOpen((o) => !o);
    setQuery("");
    if (!open) setTimeout(() => searchRef.current?.focus(), 80);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-foreground flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className={`w-full rounded-3xl border-2 bg-card p-4 text-left transition-all ${
          open
            ? "border-primary shadow-md shadow-primary/10"
            : "border-card-border"
        } disabled:opacity-50`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-3 h-3 animate-spin" />
                Memuat...
              </div>
            ) : (
              <p
                className={`font-extrabold text-sm truncate ${
                  selected ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {selected ? selected.label : placeholder}
              </p>
            )}

            {selected?.desc && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {selected.desc}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selected && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                  setOpen(false);
                }}
                className="w-5 h-5 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/10"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}

            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && !disabled && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bg-card border border-card-border rounded-3xl shadow-lg overflow-hidden"
          >
            {searchable && (
              <div className="p-2 border-b border-card-border">
                <div className="flex items-center gap-2 bg-muted/50 rounded-2xl px-3 py-2.5">
                  <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari layanan..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />

                  {query && (
                    <button onClick={() => setQuery("")} className="shrink-0">
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  {query ? `Tidak ada hasil untuk "${query}"` : "Tidak ada pilihan"}
                </div>
              ) : (
                filtered.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      onChange(item.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`w-full rounded-2xl p-3 text-left transition-all ${
                      value === item.value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-primary/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">
                          {item.label}
                        </p>

                        {item.desc && (
                          <p
                            className={`text-[11px] mt-0.5 truncate ${
                              value === item.value
                                ? "text-primary-foreground/80"
                                : "text-muted-foreground"
                            }`}
                          >
                            {item.desc}
                          </p>
                        )}
                      </div>

                      {value === item.value && (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {searchable && query && filtered.length > 0 && (
              <div className="px-4 py-2 border-t border-card-border text-[10px] text-muted-foreground">
                {filtered.length} hasil dari {options.length} layanan
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TopupModal({
  wallet,
  userId,
  userEmail,
  userName,
  onClose,
  onSuccess,
}: {
  wallet: NokosWallet | null;
  userId: string;
  userEmail: string;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();

  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"input" | "qris" | "done">("input");
  const [loading, setLoading] = useState(false);
  const [qrisUrl, setQrisUrl] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [depositDocId, setDepositDocId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [bonusPercent, setBonusPercent] = useState(0);
  const [creditedAmount, setCreditedAmount] = useState(0);
  const [copied, setCopied] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRef = useRef(false);

  const presets = [10000, 25000, 50000, 100000, 200000, 500000];

  const fmt = (v: number) => `Rp${v.toLocaleString("id-ID")}`;
  const numAmt = parseInt(amount.replace(/\D/g, "")) || 0;

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handlePaidDeposit = async (docId: string, bonusAmount: number) => {
    if (processingRef.current) return;

    processingRef.current = true;

    try {
      const creditAmt = numAmt + bonusAmount;

      await finalizeNokosDepositPaid(docId);

      setCreditedAmount(creditAmt);
      setStep("done");

      toast({
        title: `Saldo +${fmt(creditAmt)} berhasil!${
          bonusPercent > 0 ? ` Termasuk bonus ${bonusPercent}%` : ""
        }`,
      });

      setTimeout(onSuccess, 1500);
    } catch (error) {
      processingRef.current = false;

      toast({
        title: "Gagal menambah saldo wallet",
        description:
          error instanceof Error
            ? error.message
            : "Deposit lunas, tapi wallet gagal diperbarui.",
        variant: "destructive",
      });
    }
  };

  const handleCreate = async () => {
    if (!numAmt || numAmt < 10000) {
      toast({
        title: "Minimal topup Rp10.000",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const raw = await createNokosDeposit(numAmt);
      const result = extractDepositResult(raw);

      if (!result.transactionId || !result.qrisUrl) {
        throw new Error("QRIS tidak tersedia");
      }

      const bonusAmount = Number(result.bonusAmount || 0);

      const docId = await saveDeposit({
        userId,
        userEmail,
        userName,
        amount: numAmt,
        bonusAmount,
        transactionId: result.transactionId,
        qrisUrl: result.qrisUrl,
        expiresAt: result.expiresAt,
        status: "pending",
        walletCredited: false,
      });

      setQrisUrl(result.qrisUrl);
      setTransactionId(result.transactionId);
      setDepositDocId(docId);
      setExpiresAt(result.expiresAt);
      setBonusPercent(Number(result.bonusPercent || 0));
      setStep("qris");

      stopPolling();

      intervalRef.current = setInterval(async () => {
        try {
          const statusRaw = await checkNokosDeposit(result.transactionId);
          const status = extractDepositStatus(statusRaw);

          if (status.status === "paid") {
            stopPolling();
            await handlePaidDeposit(docId, bonusAmount);
            return;
          }

          if (status.status === "expired" || status.status === "failed") {
            stopPolling();

            await updateNokosDeposit(docId, {
              status: status.status,
            });

            toast({
              title: "QRIS expired atau gagal",
              variant: "destructive",
            });

            onClose();
          }
        } catch {
          // retry polling
        }
      }, 5000);
    } catch (error) {
      toast({
        title: "Gagal membuat QRIS",
        description: error instanceof Error ? error.message : "Error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="bg-background rounded-3xl w-full max-w-sm p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold">
              {step === "input"
                ? "Topup Saldo"
                : step === "qris"
                  ? "Bayar via QRIS"
                  : "Topup Berhasil!"}
            </h3>

            {wallet && step === "input" && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Saldo saat ini:{" "}
                <span className="font-bold text-primary">
                  {fmt(wallet.balance)}
                </span>
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === "input" && (
          <>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(String(p))}
                  className={`text-xs font-bold rounded-2xl px-3 py-1.5 border transition-all ${
                    numAmt === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-card-border hover:border-primary"
                  }`}
                >
                  {fmt(p)}
                </button>
              ))}
            </div>

            <input
              type="tel"
              inputMode="numeric"
              placeholder="Jumlah lain..."
              value={numAmt ? fmt(numAmt) : ""}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-card border-2 border-card-border rounded-2xl p-4 font-bold text-sm focus:border-primary focus:outline-none"
            />

            <p className="text-xs text-muted-foreground">
              Min Rp10.000 · QRIS GoPay, OVO, DANA, BCA, Mandiri, dll
            </p>

            <button
              onClick={handleCreate}
              disabled={loading || !numAmt || numAmt < 10000}
              className="w-full bg-primary text-primary-foreground rounded-2xl p-4 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Membuat QRIS...
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  Buat QRIS
                </>
              )}
            </button>
          </>
        )}

        {step === "qris" && (
          <>
            <div className="bg-white rounded-2xl p-3 flex items-center justify-center">
              <img
                src={qrisUrl}
                alt="QRIS"
                className="w-full max-w-[220px]"
              />
            </div>

            <div className="space-y-2 text-center">
              {bonusPercent > 0 && (
                <div className="bg-green-50 rounded-xl px-3 py-2 text-xs font-bold text-green-700">
                  Bonus {bonusPercent}% untuk topup ini
                </div>
              )}

              {expiresAt && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Expired: {new Date(expiresAt).toLocaleTimeString("id-ID")}
                </div>
              )}

              <div className="flex items-center justify-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <p className="text-xs text-muted-foreground">
                  Menunggu pembayaran · polling otomatis
                </p>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(transactionId);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center justify-center gap-1.5 text-xs text-primary font-medium mx-auto"
              >
                {copied ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                ID: {transactionId}
              </button>
            </div>

            {depositDocId && (
              <p className="text-[10px] text-muted-foreground text-center">
                Disimpan di riwayat topup kamu
              </p>
            )}
          </>
        )}

        {step === "done" && (
          <div className="text-center py-4 space-y-3">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>

            <p className="font-extrabold text-xl text-green-700">
              +{fmt(creditedAmount || numAmt)}
            </p>

            <p className="text-sm text-muted-foreground">
              Saldo wallet kamu sudah diperbarui
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function NokosPage() {
  const { firebaseUser, userProfile } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [broadcastNokos, setBroadcastNokos] =
    useState<BroadcastSetting | null>(null);
  const [wallet, setWallet] = useState<NokosWallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);

  const [services, setServices] = useState<SelectOption[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);

  const [countries, setCountries] = useState<SelectOption[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);

  const [prices, setPrices] = useState<PriceInfo[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [nokosMarkup, setNokosMarkup] = useState(0);

  const [service, setService] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [country, setCountry] = useState("");
  const [countryName, setCountryName] = useState("");
  const [server, setServer] = useState("s2");

  const [ordering, setOrdering] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fmt = (v: number) => `Rp${v.toLocaleString("id-ID")}`;

  useEffect(() => {
    const unsub = subscribeBroadcast("broadcast_nokos", setBroadcastNokos);
    return () => unsub();
  }, []);

  const applyMarkup = useCallback(
    (price: number) => {
      const basePrice = Number(price || 0);
      const markup = Number(nokosMarkup || 0);

      if (basePrice <= 0) return 0;
      if (markup <= 0) return Math.round(basePrice);

      return Math.round(basePrice * (1 + markup / 100));
    },
    [nokosMarkup],
  );

  useEffect(() => {
    if (!firebaseUser || !userProfile) return;

    let mounted = true;

    setWalletLoading(true);

    getOrCreateWallet(
      firebaseUser.uid,
      userProfile.email,
      userProfile.displayName,
    )
      .then(async () => {
        await syncWalletFromHistory(firebaseUser.uid);
      })
      .catch(() => {
        if (mounted) setWalletLoading(false);
      });

    const unsub = subscribeWallet(firebaseUser.uid, (walletData) => {
      if (!mounted) return;
      setWallet(walletData);
      setWalletLoading(false);
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [firebaseUser, userProfile]);

  useEffect(() => {
    let mounted = true;

    getSettings()
      .then((settings) => {
        if (!mounted) return;

        const data = settings as Record<string, unknown>;
        const markup =
          typeof data.nokosMarkup === "number" ? data.nokosMarkup : 0;

        setNokosMarkup(markup);
      })
      .catch(() => {
        if (mounted) setNokosMarkup(0);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    setServicesError(null);

    try {
      const raw = await getNokosServices();
      const list = extractServices(raw);

      setServices(
        list.map((s) => ({
          value: s.id,
          label: s.name,
        })),
      );
    } catch (error) {
      setServicesError(error instanceof Error ? error.message : "Gagal");
    } finally {
      setServicesLoading(false);
    }
  }, []);

  const loadCountries = useCallback(async () => {
    setCountriesLoading(true);

    try {
      const raw = await getNokosCountries();
      const list = extractCountries(raw);

      setCountries(
        list.map((c) => ({
          value: c.id,
          label: c.name,
        })),
      );
    } catch {
      toast({
        title: "Gagal memuat negara",
        variant: "destructive",
      });
    } finally {
      setCountriesLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadServices();
    loadCountries();
  }, [loadServices, loadCountries]);

  useEffect(() => {
    let cancelled = false;

    const loadLatestPrices = async () => {
      if (!service || !country) {
        setPrices([]);
        return;
      }

      setPricesLoading(true);
      setPrices([]);

      try {
        const [rawS2, rawS1] = await Promise.all([
          getNokosPrices(service, country, "s2"),
          getNokosPrices(service, country, "s1"),
        ]);

        if (cancelled) return;

        const directS2 = extractNokosPriceFromDocs(
          rawS2,
          service,
          country,
          "s2",
        );

        const directS1 = extractNokosPriceFromDocs(
          rawS1,
          service,
          country,
          "s1",
        );

        const p2 = directS2
          ? [{ ...directS2, cost: applyMarkup(directS2.cost) }]
          : extractPrices(rawS2, service, country).map((p) => ({
              ...p,
              server: "s2",
              serverLabel: "Server Plus (s2)",
              cost: applyMarkup(p.cost),
            }));

        const p1 = directS1
          ? [{ ...directS1, cost: applyMarkup(directS1.cost) }]
          : extractPrices(rawS1, service, country).map((p) => ({
              ...p,
              server: "s1",
              serverLabel: "Server Express (s1)",
              cost: applyMarkup(p.cost),
            }));

        const latestPrices = [...p2, ...p1].filter((p) => p.cost > 0);

        setPrices(latestPrices);

        if (
          latestPrices.length > 0 &&
          !latestPrices.some((p) => p.server === server)
        ) {
          setServer(latestPrices[0].server);
        }
      } catch {
        if (!cancelled) {
          setPrices([]);
        }
      } finally {
        if (!cancelled) {
          setPricesLoading(false);
        }
      }
    };

    loadLatestPrices();

    return () => {
      cancelled = true;
    };
  }, [service, country, applyMarkup]);

  const selectedPrice = prices.find((p) => p.server === server);

  const handleOrder = async () => {
    if (!firebaseUser || !userProfile || !service || !country) return;

    if (!wallet) {
      toast({
        title: "Wallet belum siap",
        variant: "destructive",
      });
      return;
    }

    if (!server) {
      toast({
        title: "Server belum dipilih",
        variant: "destructive",
      });
      return;
    }

    setOrdering(true);

    try {
      const latestRaw = await getNokosPrices(service, country, server);

      const directLatest = extractNokosPriceFromDocs(
        latestRaw,
        service,
        country,
        server as "s1" | "s2",
      );

      const latestPrices = directLatest
        ? [{ ...directLatest, cost: applyMarkup(directLatest.cost) }]
        : extractPrices(latestRaw, service, country).map((p) => ({
            ...p,
            server,
            serverLabel:
              server === "s2" ? "Server Plus (s2)" : "Server Express (s1)",
            cost: applyMarkup(p.cost),
          }));

      const latestPrice = latestPrices.find((p) => p.server === server);

      if (!latestPrice || latestPrice.cost <= 0) {
        throw new Error(
          "Harga terbaru tidak tersedia. Silakan refresh dan coba lagi.",
        );
      }

      const oldPrice = selectedPrice?.cost ?? 0;
      const finalPrice = latestPrice.cost;

      setPrices((prev) => {
        const exists = prev.some((p) => p.server === server);

        if (!exists) {
          return [...prev, latestPrice];
        }

        return prev.map((p) => (p.server === server ? latestPrice : p));
      });

      if (oldPrice > 0 && oldPrice !== finalPrice) {
        toast({
          title: "Harga diperbarui",
          description: `Harga berubah dari ${fmt(oldPrice)} menjadi ${fmt(
            finalPrice,
          )}.`,
        });
      }

      if (wallet.balance < finalPrice) {
        toast({
          title: "Saldo Tidak Cukup",
          description: `Saldo kamu ${fmt(wallet.balance)}. Harga terbaru ${fmt(
            finalPrice,
          )}. Silakan topup dulu.`,
          variant: "destructive",
        });

        setShowTopup(true);
        return;
      }

      const apiResult = await placeNokosOrder(service, country, server);
      console.log("ORDER RAW RESPONSE:", apiResult);

      const { activationId, phone, expiresAt } = extractOrderResult(apiResult);

      if (!activationId) {
        console.log("ORDER PARSED:", {
          activationId,
          phone,
          finalPrice,
          expiresAt,
        });

        throw new Error("Order gagal: tidak ada activation_id");
      }

      await deductWallet(firebaseUser.uid, finalPrice);

      const docId = await createNokosOrder({
        userId: firebaseUser.uid,
        userEmail: userProfile.email,
        userName: userProfile.displayName,
        serviceId: service,
        serviceName,
        countryId: country,
        countryName,
        operatorId: server,
        operatorName: server === "s2" ? "Server Plus" : "Server Express",
        price: finalPrice,
        nokosOrderId: activationId,
        phone,
        otp: null,
        status: "waiting_otp",
        expiresAt,
      });

      navigate(`/nokos/order/${docId}`);
    } catch (error) {
      toast({
        title: "Pembelian Gagal",
        description:
          error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setOrdering(false);
    }
  };

  const handleRefreshPage = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);

    try {
      if (firebaseUser) {
        await syncWalletFromHistory(firebaseUser.uid);
      }

      const settings = await getSettings();
      const data = settings as Record<string, unknown>;
      const latestMarkup =
        typeof data.nokosMarkup === "number" ? data.nokosMarkup : 0;

      setNokosMarkup(latestMarkup);

      await Promise.all([loadServices(), loadCountries()]);

      if (service && country) {
        setPricesLoading(true);

        const [rawS2, rawS1] = await Promise.all([
          getNokosPrices(service, country, "s2"),
          getNokosPrices(service, country, "s1"),
        ]);

        const applyLatestMarkup = (price: number) => {
          const basePrice = Number(price || 0);
          if (basePrice <= 0) return 0;
          if (latestMarkup <= 0) return Math.round(basePrice);
          return Math.round(basePrice * (1 + latestMarkup / 100));
        };

        const directS2 = extractNokosPriceFromDocs(
          rawS2,
          service,
          country,
          "s2",
        );

        const directS1 = extractNokosPriceFromDocs(
          rawS1,
          service,
          country,
          "s1",
        );

        const p2 = directS2
          ? [{ ...directS2, cost: applyLatestMarkup(directS2.cost) }]
          : extractPrices(rawS2, service, country).map((p) => ({
              ...p,
              server: "s2",
              serverLabel: "Server Plus (s2)",
              cost: applyLatestMarkup(p.cost),
            }));

        const p1 = directS1
          ? [{ ...directS1, cost: applyLatestMarkup(directS1.cost) }]
          : extractPrices(rawS1, service, country).map((p) => ({
              ...p,
              server: "s1",
              serverLabel: "Server Express (s1)",
              cost: applyLatestMarkup(p.cost),
            }));

        setPrices([...p2, ...p1].filter((p) => p.cost > 0));
        setPricesLoading(false);
      }

      toast({
        title: "Berhasil refresh",
        description: "Data Nokos berhasil diperbarui.",
      });
    } catch (error) {
      setPricesLoading(false);

      toast({
        title: "Gagal refresh",
        description:
          error instanceof Error ? error.message : "Terjadi kesalahan.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  }, [
    refreshing,
    firebaseUser,
    loadServices,
    loadCountries,
    service,
    country,
    toast,
  ]);

  const walletBalance = wallet?.balance ?? 0;

  const insufficientBalance =
    selectedPrice && selectedPrice.cost > 0 && walletBalance < selectedPrice.cost;

  return (
    <>
      <AppLayout title="Nokos TrayaStore">
        <div className="space-y-5">
          <BroadcastCard broadcast={broadcastNokos} />

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mint-gradient rounded-3xl p-5 border border-primary/15 shadow-sm relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-primary/10 -translate-y-8 translate-x-8" />

            <div className="relative z-10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Saldo Wallet Kamu
                    </p>

                    {walletLoading ? (
                      <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Memuat...
                      </div>
                    ) : (
                      <p className="text-3xl font-extrabold text-primary mt-0.5">
                        {fmt(walletBalance)}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleRefreshPage}
                  disabled={refreshing}
                  className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                </button>
              </div>

              {wallet && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="bg-primary/5 rounded-2xl px-3 py-2">
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Total Topup
                    </p>
                    <p className="text-sm font-extrabold text-primary mt-0.5">
                      {fmt(wallet.totalTopup)}
                    </p>
                  </div>

                  <div className="bg-primary/5 rounded-2xl px-3 py-2">
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Total Terpakai
                    </p>
                    <p className="text-sm font-extrabold text-foreground mt-0.5">
                      {fmt(wallet.totalSpent)}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-primary/10 space-y-3">
                {nokosMarkup > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BadgeDollarSign className="w-3.5 h-3.5" />
                    <span>
                      Markup harga:{" "}
                      <span className="font-bold">{nokosMarkup}%</span>
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate("/nokos/history")}
                    className="flex items-center gap-1.5 border border-primary/30 text-primary rounded-2xl px-3 py-2.5 text-xs font-bold"
                  >
                    <History className="w-3.5 h-3.5" />
                    Riwayat
                  </button>

                  <button
                    onClick={() => setShowTopup(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-2xl px-4 py-2.5 text-xs font-bold shadow-sm shadow-primary/25"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Topup Saldo
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {servicesError && (
            <div className="bg-red-50 border border-red-200 rounded-3xl p-4 text-center">
              <AlertCircle className="w-5 h-5 text-red-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-red-600">
                Gagal memuat layanan
              </p>
              <button
                onClick={loadServices}
                className="mt-2 text-xs font-bold text-primary underline"
              >
                Coba lagi
              </button>
            </div>
          )}

          {!servicesError && (
            <>
              <CustomSelect
                label="Pilih Layanan"
                icon={Smartphone}
                value={service}
                placeholder="WhatsApp, Telegram, dll"
                options={services}
                loading={servicesLoading}
                searchable
                onChange={(val) => {
                  setService(val);
                  setServiceName(
                    services.find((s) => s.value === val)?.label ?? val,
                  );
                  setCountry("");
                  setCountryName("");
                  setPrices([]);
                }}
              />

              <CustomSelect
                label="Pilih Negara"
                icon={Globe2}
                value={country}
                placeholder={service ? "Ketik nama negara..." : "Pilih layanan dulu"}
                disabled={!service}
                loading={countriesLoading}
                options={countries}
                searchable
                onChange={(val) => {
                  setCountry(val);
                  setCountryName(
                    countries.find((c) => c.value === val)?.label ?? val,
                  );
                }}
              />

              <AnimatePresence>
                {(pricesLoading || prices.length > 0) && service && country && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    <label className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Server className="w-4 h-4" />
                      Pilih Server
                    </label>

                    {pricesLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Memuat harga terbaru...
                      </div>
                    ) : (
                      prices.map((p) => (
                        <button
                          key={p.server}
                          type="button"
                          onClick={() => setServer(p.server)}
                          className={`w-full rounded-3xl border-2 p-4 text-left transition-all ${
                            server === p.server
                              ? "border-primary bg-primary/5"
                              : "border-card-border bg-card"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                                  server === p.server
                                    ? "bg-primary/15"
                                    : "bg-muted"
                                }`}
                              >
                                <BadgeDollarSign
                                  className={`w-5 h-5 ${
                                    server === p.server
                                      ? "text-primary"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              </div>

                              <div>
                                <p className="font-extrabold text-sm">
                                  {p.serverLabel}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Stok: {p.count.toLocaleString("id-ID")} nomor
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="font-extrabold text-primary text-lg">
                                {fmt(p.cost)}
                              </p>

                              {server === p.server && (
                                <div className="flex items-center justify-end gap-1 mt-1">
                                  {walletBalance >= p.cost ? (
                                    <span className="text-[10px] text-green-600 font-bold">
                                      ✓ Saldo cukup
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-red-500 font-bold">
                                      ⚠ Saldo kurang
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    )}

                    {!pricesLoading && prices.length === 0 && (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        Tidak ada stok untuk kombinasi ini
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {insufficientBalance && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-orange-50 border border-orange-200 rounded-3xl p-4 flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-orange-700">
                        Saldo Tidak Cukup
                      </p>
                      <p className="text-xs text-orange-600 mt-0.5">
                        Butuh {fmt(selectedPrice!.cost)}, saldo kamu{" "}
                        {fmt(walletBalance)}. Kurang{" "}
                        {fmt(selectedPrice!.cost - walletBalance)}.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowTopup(true)}
                      className="bg-orange-500 text-white text-xs font-bold rounded-xl px-3 py-1.5 shrink-0"
                    >
                      Topup
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                disabled={!service || !country || !selectedPrice || ordering}
                onClick={handleOrder}
                className="w-full bg-primary text-primary-foreground rounded-2xl p-4 flex items-center justify-center gap-2 font-bold text-sm shadow-md shadow-primary/25 disabled:opacity-50 disabled:shadow-none active:scale-[0.98] transition-all"
              >
                {ordering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    Beli Nomor {selectedPrice ? `· ${fmt(selectedPrice.cost)}` : ""}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </AppLayout>

      <AnimatePresence>
        {showTopup && firebaseUser && userProfile && (
          <TopupModal
            wallet={wallet}
            userId={firebaseUser.uid}
            userEmail={userProfile.email}
            userName={userProfile.displayName}
            onClose={() => setShowTopup(false)}
            onSuccess={() => setShowTopup(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}