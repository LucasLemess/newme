"use client";

import type { AuditResult as AuditResultType } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FindingCard } from "@/components/ui/FindingCard";
import {
  FileText,
  Calendar,
  Building2,
  Hash,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface AuditResultProps {
  result: AuditResultType;
  onContestacao?: () => void;
  onAnalise?: () => void;
  onNova?: () => void;
  loadingContestacao?: boolean;
  loadingAnalise?: boolean;
}

function fmtBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CompositionBar({ componentes }: { componentes: NonNullable<AuditResultType["componentes"]> }) {
  const items = [
    { label: "Frete Base", value: componentes.frete_base, color: "bg-blue-500" },
    { label: "ICMS", value: componentes.icms, color: "bg-amber-500" },
    { label: "Ad Valorem", value: componentes.ad_valorem, color: "bg-green-500" },
    { label: "Pedágio", value: componentes.pedagio, color: "bg-red-500" },
    { label: "Outros", value: componentes.outros, color: "bg-text-secondary" },
  ].filter((i) => i.value > 0);

  const total = items.reduce((s, i) => s + i.value, 0);

  return (
    <div className="space-y-3">
      <div className="flex h-6 rounded-lg overflow-hidden gap-px">
        {items.map((item) => (
          <div
            key={item.label}
            className={`${item.color} transition-all duration-700`}
            style={{ width: `${(item.value / total) * 100}%` }}
            title={`${item.label}: ${fmtBRL(item.value)}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
            <span className="text-xs font-mono text-text-secondary">
              {item.label}:{" "}
              <span className="text-text-primary">{fmtBRL(item.value)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuditResultView({
  result,
  onContestacao,
  onAnalise,
  onNova,
  loadingContestacao,
  loadingAnalise,
}: AuditResultProps) {
  return (
    <div className="space-y-5 animate-slide-up">
      {/* Status Header */}
      <div
        className={`border rounded-xl p-5 ${
          result.status === "APROVADO"
            ? "border-green-500/30 bg-green-500/5"
            : result.status === "REPROVADO"
            ? "border-red-500/30 bg-red-500/5"
            : "border-amber-500/30 bg-amber-500/5"
        }`}
      >
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {result.status === "APROVADO" ? (
              <CheckCircle className="text-green-500" size={24} />
            ) : (
              <AlertTriangle
                className={
                  result.status === "REPROVADO"
                    ? "text-red-500"
                    : "text-amber-500"
                }
                size={24}
              />
            )}
            <div>
              <p className="text-text-secondary text-xs font-mono uppercase tracking-wider mb-0.5">
                Resultado da Auditoria
              </p>
              <StatusBadge status={result.status} />
            </div>
          </div>
          {result.totalOvercharge > 0 && (
            <div className="text-right">
              <p className="text-text-secondary text-xs font-mono">
                Total Overcharge
              </p>
              <p className="text-red-500 text-2xl font-mono font-semibold">
                {fmtBRL(result.totalOvercharge)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CT-e Details */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-text-primary font-semibold text-sm mb-4 flex items-center gap-2">
          <FileText size={15} className="text-blue-500" />
          Dados do CT-e
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-text-secondary text-xs font-mono mb-1 flex items-center gap-1">
              <Hash size={10} /> Número / Série
            </p>
            <p className="text-text-primary font-mono text-sm">
              {result.cteNumero}
              {result.cteSerie ? ` / ${result.cteSerie}` : ""}
            </p>
          </div>
          <div>
            <p className="text-text-secondary text-xs font-mono mb-1 flex items-center gap-1">
              <Building2 size={10} /> Transportadora
            </p>
            <p className="text-text-primary text-sm truncate">
              {result.cteEmitente || "—"}
            </p>
          </div>
          <div>
            <p className="text-text-secondary text-xs font-mono mb-1">CNPJ</p>
            <p className="text-text-primary font-mono text-sm">
              {result.cteCNPJ || "—"}
            </p>
          </div>
          <div>
            <p className="text-text-secondary text-xs font-mono mb-1 flex items-center gap-1">
              <Calendar size={10} /> Data Emissão
            </p>
            <p className="text-text-primary font-mono text-sm">
              {result.cteData || "—"}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex justify-between items-center mb-3">
            <p className="text-text-secondary text-xs font-mono">
              Composição do Frete
            </p>
            <p className="text-text-primary font-mono text-sm font-semibold">
              Total: {fmtBRL(result.valorTotal)}
            </p>
          </div>
          {result.componentes && (
            <CompositionBar componentes={result.componentes} />
          )}
        </div>
      </div>

      {/* Findings */}
      {result.findings.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-text-primary font-semibold text-sm mb-4 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500" />
            Divergências Encontradas ({result.findings.length})
          </h3>
          <div className="space-y-3">
            {result.findings.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
          </div>
        </div>
      )}

      {result.findings.length === 0 && (
        <div className="bg-surface border border-green-500/20 rounded-xl p-5 text-center">
          <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
          <p className="text-green-500 font-semibold">Nenhuma divergência encontrada</p>
          <p className="text-text-secondary text-sm mt-1">
            Os valores do CT-e estão em conformidade com o contrato.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {result.findings.length > 0 && (
          <>
            <button
              onClick={onContestacao}
              disabled={loadingContestacao}
              className="flex-1 min-w-[160px] px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-500 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingContestacao ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  Gerando carta...
                </span>
              ) : (
                "📄 Gerar Contestação"
              )}
            </button>
            <button
              onClick={onAnalise}
              disabled={loadingAnalise}
              className="flex-1 min-w-[160px] px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-500 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingAnalise ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  Analisando...
                </span>
              ) : (
                "🧠 Análise Estratégica IA"
              )}
            </button>
          </>
        )}
        <button
          onClick={onNova}
          className="flex-1 min-w-[140px] px-4 py-2.5 bg-surface hover:bg-white/5 border border-border rounded-lg text-text-secondary hover:text-text-primary text-sm font-medium transition-all"
        >
          + Nova Auditoria
        </button>
      </div>
    </div>
  );
}
