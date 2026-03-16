import type { AuditStatus, Severity } from "@/lib/types";
import clsx from "clsx";

interface StatusBadgeProps {
  status?: AuditStatus;
  severity?: Severity;
  className?: string;
}

export function StatusBadge({ status, severity, className }: StatusBadgeProps) {
  if (status) {
    const config = {
      APROVADO: {
        label: "APROVADO",
        cls: "bg-green-500/10 text-green-500 border border-green-500/30",
      },
      "ATENÇÃO": {
        label: "ATENÇÃO",
        cls: "bg-amber-500/10 text-amber-500 border border-amber-500/30",
      },
      REPROVADO: {
        label: "REPROVADO",
        cls: "bg-red-500/10 text-red-500 border border-red-500/30",
      },
    };
    const c = config[status];
    return (
      <span
        className={clsx(
          "inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono font-medium tracking-wider",
          c.cls,
          className
        )}
      >
        {c.label}
      </span>
    );
  }

  if (severity) {
    const config = {
      high: { label: "ALTA", cls: "bg-red-500/10 text-red-500 border border-red-500/30" },
      medium: { label: "MÉDIA", cls: "bg-amber-500/10 text-amber-500 border border-amber-500/30" },
      low: { label: "BAIXA", cls: "bg-blue-500/10 text-blue-500 border border-blue-500/30" },
    };
    const c = config[severity];
    return (
      <span
        className={clsx(
          "inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium",
          c.cls,
          className
        )}
      >
        {c.label}
      </span>
    );
  }

  return null;
}
