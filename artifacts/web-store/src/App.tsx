import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";

const AuthPage = lazy(() => import("./pages/auth"));
const Dashboard = lazy(() => import("./pages/dashboard"));
const ProductsPage = lazy(() => import("./pages/products"));
const ProductDetail = lazy(() => import("./pages/product-detail"));
const PanelsPage = lazy(() => import("./pages/panels"));
const MyAccountsPage = lazy(() => import("./pages/my-accounts"));
const MyPanelsPage = lazy(() => import("./pages/my-panels"));
const HistoryPage = lazy(() => import("./pages/history"));
const ProfilePage = lazy(() => import("./pages/profile"));
const UpgradePage = lazy(() => import("./pages/upgrade"));
const ContactPage = lazy(() => import("./pages/contact"));
const NokosPage = lazy(() => import("./pages/nokos"));
const NokosOrderPage = lazy(() => import("./pages/nokos-order"));
const NokosHistoryPage = lazy(() => import("./pages/nokos-history"));
const AdminDashboard = lazy(() => import("./pages/admin/index"));
const AdminProducts = lazy(() => import("./pages/admin/products"));
const AdminPanels = lazy(() => import("./pages/admin/panels"));
const AdminManualOrders = lazy(() => import("./pages/admin/manual-orders"));
const AdminStaticOrders = lazy(() => import("./pages/admin/static-orders"));
const AdminPanelOrders = lazy(() => import("./pages/admin/panel-orders"));
const AdminTransactions = lazy(() => import("./pages/admin/transactions"));
const AdminResellerPackages = lazy(
  () => import("./pages/admin/reseller-packages"),
);
const AdminUsers = lazy(() => import("./pages/admin/users"));
const AdminSettings = lazy(() => import("./pages/admin/settings"));
const AdminTestimonials = lazy(() => import("./pages/admin/testimonials"));
const AdminNokos = lazy(() => import("./pages/admin/nokos"));
const ApkModPage = lazy(() => import("./pages/apk-mod"));
const ApkModDetailPage = lazy(() => import("./pages/apk-mod-detail"));
const AdminApkMod = lazy(() => import("./pages/admin/apk-mod"));

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.16),transparent_48%)]" />

      <div className="relative flex flex-col items-center gap-8">
        <div className="relative w-44 h-44 flex items-center justify-center [perspective:900px]">
          <motion.div
            className="relative w-24 h-24"
            style={{
              transformStyle: "preserve-3d",
            }}
            animate={{
              rotateX: [18, 18],
              rotateY: [0, 720],
            }}
            transition={{
              rotateY: {
                duration: 5,
                repeat: Infinity,
                ease: "linear",
              },
              y: {
                duration: 4,
                repeat: Infinity,
                ease: "linear",
              },
            }}
          >
            {/* Front */}
            <div className="absolute inset-0 border-2 border-emerald-400/90 bg-emerald-300/5 rounded-2xl shadow-[0_0_35px_rgba(16,185,129,0.45)] [transform:translateZ(48px)]" />

            {/* Back */}
            <div className="absolute inset-0 border-2 border-emerald-300/45 bg-emerald-300/5 rounded-2xl [transform:rotateY(180deg)_translateZ(48px)]" />

            {/* Right */}
            <div className="absolute inset-0 border-2 border-emerald-300/60 bg-emerald-300/5 rounded-2xl [transform:rotateY(90deg)_translateZ(48px)]" />

            {/* Left */}
            <div className="absolute inset-0 border-2 border-emerald-300/60 bg-emerald-300/5 rounded-2xl [transform:rotateY(-90deg)_translateZ(48px)]" />

            {/* Top */}
            <div className="absolute inset-0 border-2 border-emerald-200/50 bg-emerald-300/5 rounded-2xl [transform:rotateX(90deg)_translateZ(48px)]" />

            {/* Bottom */}
            <div className="absolute inset-0 border-2 border-emerald-500/50 bg-emerald-300/5 rounded-2xl [transform:rotateX(-90deg)_translateZ(48px)]" />

            <div className="absolute inset-0 flex items-center justify-center [transform:translateZ(54px)]">
              <span className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(16,185,129,0.9)]">
                
              </span>
            </div>
          </motion.div>

          {[0, 1, 2, 3].map((i) => {
            const pos = [
              "left-4 top-8",
              "right-5 top-10",
              "left-8 bottom-6",
              "right-8 bottom-8",
            ][i];

            return (
              <motion.div
                key={i}
                className={`absolute ${pos} w-3 h-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50`}
                animate={{
                  y: [0, -14, 0],
                  opacity: [0.35, 1, 0.35],
                  scale: [0.8, 1.25, 0.8],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  delay: i * 0.18,
                  ease: "easeInOut",
                }}
              />
            );
          })}
        </div>

        <div className="text-center">
          <motion.h2
            className="text-lg font-extrabold text-foreground"
            animate={{
              opacity: [0.65, 1, 0.65],
              y: [0, -2, 0],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
           Traya sedang menyiapkan
          </motion.h2>

          <p className="text-xs text-muted-foreground mt-1">
            Memuat halaman dengan aman...
          </p>

          <div className="w-44 h-1.5 bg-primary/10 rounded-full overflow-hidden mt-4 mx-auto">
            <motion.div
              className="h-full w-20 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent"
              animate={{
                x: [-90, 190],
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
function ProtectedRoute({
  component: Component,
  adminOnly = false,
}: {
  component: React.ComponentType;
  adminOnly?: boolean;
}) {
  const { firebaseUser, userProfile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!firebaseUser) return <Redirect to="/auth" />;
  if (adminOnly && userProfile?.role !== "admin") return <Redirect to="/" />;

  return <Component />;
}

function Routes() {
  const { firebaseUser, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Switch>
        <Route path="/auth">
          {firebaseUser ? <Redirect to="/" /> : <AuthPage />}
        </Route>

        <Route path="/">
          <ProtectedRoute component={Dashboard} />
        </Route>

        <Route path="/products">
          <ProtectedRoute component={ProductsPage} />
        </Route>

        <Route path="/products/:id">
          <ProtectedRoute component={ProductDetail} />
        </Route>

        <Route path="/panels">
          <ProtectedRoute component={PanelsPage} />
        </Route>

        <Route path="/my-accounts">
          <ProtectedRoute component={MyAccountsPage} />
        </Route>

        <Route path="/my-panels">
          <ProtectedRoute component={MyPanelsPage} />
        </Route>

        <Route path="/panel-aktif">
          <Redirect to="/my-panels" />
        </Route>

        <Route path="/history">
          <ProtectedRoute component={HistoryPage} />
        </Route>

        <Route path="/profile">
          <ProtectedRoute component={ProfilePage} />
        </Route>

        <Route path="/upgrade">
          <ProtectedRoute component={UpgradePage} />
        </Route>

        <Route path="/contact">
          <ProtectedRoute component={ContactPage} />
        </Route>

        <Route path="/nokos">
          <ProtectedRoute component={NokosPage} />
        </Route>

        <Route path="/nokos/order/:id">
          <ProtectedRoute component={NokosOrderPage} />
        </Route>

        <Route path="/nokos/history">
          <ProtectedRoute component={NokosHistoryPage} />
        </Route>

        <Route path="/apk-mod">
          <ProtectedRoute component={ApkModPage} />
        </Route>

        <Route path="/apk-mod/:id">
          <ProtectedRoute component={ApkModDetailPage} />
        </Route>

        <Route path="/admin">
          <ProtectedRoute component={AdminDashboard} adminOnly />
        </Route>

        <Route path="/admin/products">
          <ProtectedRoute component={AdminProducts} adminOnly />
        </Route>

        <Route path="/admin/apk-mod">
          <ProtectedRoute component={AdminApkMod} adminOnly />
        </Route>

        <Route path="/admin/panels">
          <ProtectedRoute component={AdminPanels} adminOnly />
        </Route>

        <Route path="/admin/nokos">
          <ProtectedRoute component={AdminNokos} adminOnly />
        </Route>

        <Route path="/admin/manual-orders">
          <ProtectedRoute component={AdminManualOrders} adminOnly />
        </Route>

        <Route path="/admin/static-orders">
          <ProtectedRoute component={AdminStaticOrders} adminOnly />
        </Route>

        <Route path="/admin/panel-orders">
          <ProtectedRoute component={AdminPanelOrders} adminOnly />
        </Route>

        <Route path="/admin/transactions">
          <ProtectedRoute component={AdminTransactions} adminOnly />
        </Route>

        <Route path="/admin/reseller-packages">
          <ProtectedRoute component={AdminResellerPackages} adminOnly />
        </Route>

        <Route path="/admin/users">
          <ProtectedRoute component={AdminUsers} adminOnly />
        </Route>

        <Route path="/admin/settings">
          <ProtectedRoute component={AdminSettings} adminOnly />
        </Route>

        <Route path="/admin/testimonials">
          <ProtectedRoute component={AdminTestimonials} adminOnly />
        </Route>

        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
        <Routes />
      </WouterRouter>
      <Toaster />
    </AuthProvider>
  );
}