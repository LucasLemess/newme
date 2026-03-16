import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  color?: "green" | "amber" | "red" | "blue" | "default";
  loading?: boolean;
}

const colorMap = {
  green: {
    icon: "text-green-500",
    value: "text-green-500",
    border: "border-green-500/20",
    glow: "glow-green",
  },
  amber: {
    icon: "text-amber-500",
    value: "text-amber-500",
    border: "border-amber-500/20",
    glow: "glow-amber",
  },
  red: {
    icon: "text-red-500",
    value: "text-red-500",
    border: "border-red-500/20",
    glow: "glow-red",
  },
  blue: {
    icon: "text-blue-500",
    value: "text-blue-500",
    border: "border-blue-500/20",
    glow: "",
  },
  default: {
    icon: "text-text-secondary",
    value: "text-text-primary",
    border: "border-border",
    glow: "",
  },
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "default",
  loading = false,
}: MetricCardProps) {
  const colors = colorMap[color];

  return (
    <div
      className={clsx(
        "bg-surface border rounded-lg p-5 card-hover",
        colors.border,
        colors.glow
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-text-secondary text-xs font-mono uppercase tracking-widest">
          {title}
        </p>
        {Icon && (
          <Icon
            size={16}
            className={clsx(colors.icon, "opacity-70 flex-shrink-0")}
          />
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-8 bg-border/50 rounded animate-pulse w-3/4" />
          {subtitle && <div className="h-3 bg-border/30 rounded animate-pulse w-1/2" />}
        </div>
      ) : (
        <>
          <p
            className={clsx(
              "text-2xl font-mono font-semibold tracking-tight",
              colors.value
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-text-secondary text-xs mt-1 font-mono">{subtitle}</p>
          )}
        </>
      )}
    </div>
  );
}
