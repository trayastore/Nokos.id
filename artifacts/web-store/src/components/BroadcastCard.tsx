import { AlertCircle, CheckCircle2, Info, Megaphone, XCircle } from "lucide-react";
import type { BroadcastSetting } from "../types";

interface BroadcastCardProps {
  broadcast: BroadcastSetting | null;
}

export function BroadcastCard({ broadcast }: BroadcastCardProps) {
  if (!broadcast || !broadcast.enabled || !broadcast.message.trim()) {
    return null;
  }

  const type = broadcast.type || "info";

  const styleMap = {
    info: {
      card: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-100",
      iconBox: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200",
      icon: Info,
    },
    warning: {
      card: "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-900/40 dark:bg-yellow-950/40 dark:text-yellow-100",
      iconBox: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-200",
      icon: AlertCircle,
    },
    success: {
      card: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100",
      iconBox: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
      icon: CheckCircle2,
    },
    danger: {
      card: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100",
      iconBox: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200",
      icon: XCircle,
    },
  };

  const current = styleMap[type];
  const Icon = current.icon;

  return (
    <div
      className={`mb-4 overflow-hidden rounded-2xl border p-4 shadow-sm ${current.card}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${current.iconBox}`}
        >
          <Icon size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Megaphone size={15} className="shrink-0 opacity-80" />
            <h3 className="truncate text-sm font-bold">
              {broadcast.title?.trim() || "Pengumuman"}
            </h3>
          </div>

          <p className="whitespace-pre-line text-sm leading-relaxed opacity-90">
            {broadcast.message}
          </p>
        </div>
      </div>
    </div>
  );
}