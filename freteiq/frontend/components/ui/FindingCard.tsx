import type { Finding } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";

interface FindingCardProps {
  finding: Finding;
}

const severityIcon = {
  high: AlertCircle,
  medium: AlertTriangle,
  low: Info,
};

const severityBorder = {
  high: "border-red-500/30 bg-red-500/5",
  medium: "border-amber-500/30 bg-amber-500/5",
  low: "border-blue-500/30 bg-blue-500/5",
};

const tipoLabel: Record<string, string> = {
  ICMS: "ICMS",
  TARIFA_KG: "Tarifa/kg",
  AD_VALOREM: "Ad Valorem",
  CUBAGEM: "Cubagem",
  PEDAGIO: "Pedágio",
  INCONSISTENCIA_TOTAL: "Inconsistência Total",
  SEM_CONTRATO: "Sem Contrato",
};

export function FindingCard({ finding }: FindingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = severityIcon[finding.severity];

  return (
    <div
      className={clsx(
        "border rounded-lg p-4 transition-all duration-200",
        severityBorder[finding.severity]
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          size={16}
          className={clsx(
            "shrink-0 mt-0.5",
            finding.severity === "high" && "text-red-500",
            finding.severity === "medium" && "text-amber-500",
            finding.severity === "low" && "text-blue-500"
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">
              {tipoLabel[finding.tipo] || finding.tipo}
            </span>
            <StatusBadge severity={finding.severity} />
            {finding.diferenca !== 0 && (
              <span
                className={clsx(
                  "text-xs font-mono font-semibold ml-auto",
                  finding.diferenca > 0 ? "text-red-500" : "text-green-500"
                )}
              >
                {finding.diferenca > 0 ? "+" : ""}
                R$ {Math.abs(finding.diferenca).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
          <p className="text-text-primary text-sm leading-relaxed">{finding.descricao}</p>

          {finding.fundamentacao && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-text-secondary hover:text-blue-500 mt-2 transition-colors"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              <span>Fundamentação contratual</span>
            </button>
          )}

          {expanded && (
            <div className="mt-2 pt-2 border-t border-border/50 text-xs text-text-secondary leading-relaxed font-mono bg-surface/50 rounded p-2 animate-fade-in">
              {finding.fundamentacao}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
