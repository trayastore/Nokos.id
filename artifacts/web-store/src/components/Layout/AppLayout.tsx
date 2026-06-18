import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const { userProfile } = useAuth();

  const roleBg =
    userProfile?.role === "admin"
      ? "bg-purple-500"
      : userProfile?.role === "reseller"
      ? "bg-blue-500"
      : "bg-primary";

  useEffect(() => {
    if (!userProfile?.id) return;

    const tutorialKey = `sidebar_tutorial_seen_${userProfile.id}`;
    const seen = localStorage.getItem(tutorialKey);

    if (!seen) {
      setTimeout(() => {
        setShowTutorial(true);
      }, 600);
    }
  }, [userProfile?.id]);

  const finishTutorial = () => {
    if (userProfile?.id) {
      localStorage.setItem(
        `sidebar_tutorial_seen_${userProfile.id}`,
        "true"
      );
    }

    setShowTutorial(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 bg-card/90 backdrop-blur-md border-b border-card-border px-4 h-14 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSidebarOpen(true);
                finishTutorial();
              }}
              className={cn(
                "lg:hidden p-2 rounded-xl hover:bg-muted transition-colors",
                showTutorial &&
                  "relative z-[9999] bg-card ring-4 ring-primary/40 shadow-2xl"
              )}
              data-testid="btn-menu"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>

            {title && (
              <h1 className="text-base font-bold text-foreground truncate">
                {title}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-xl">
              <div
                className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold",
                  roleBg
                )}
              >
                {userProfile?.displayName?.[0]?.toUpperCase() || "U"}
              </div>

              <span className="text-xs font-semibold text-foreground hidden sm:inline truncate max-w-[80px]">
                {userProfile?.displayName}
              </span>

              {(userProfile?.role === "reseller" ||
                userProfile?.role === "admin") && (
                <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                  ✓
                </span>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full page-enter">
          {children}
        </main>
      </div>

      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{
              opacity: 0,
              y: -10,
              scale: 0.95,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: -10,
              scale: 0.95,
            }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 18,
            }}
            className="fixed top-16 left-4 z-[9998] w-[270px]"
          >
            <div className="relative bg-card border border-card-border rounded-3xl shadow-2xl p-4">
              <div className="absolute -top-2 left-6 w-4 h-4 bg-card rotate-45 border-l border-t border-card-border" />

              <p className="font-extrabold text-sm text-foreground">
                Tekan menu sidebar
              </p>

              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Tekan tombol menu di kiri atas untuk melihat lebih banyak menu.
              </p>

              <button
                onClick={finishTutorial}
                className="mt-3 w-full bg-primary text-primary-foreground rounded-2xl py-2.5 text-xs font-bold"
              >
                Mengerti
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}