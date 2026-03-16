"use client";

import { useEffect, useState, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getDashboardMetrics, getHistory } from "@/lib/api";
import type { DashboardMetrics, AuditHistoryItem, AuditStatus } from "@/lib/types";
import {
  FileSearch,
  TrendingUp,
  DollarSign,
  BarChart2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

function fmtBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ProgressBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs font-mono mb-1.5">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-primary">
          {value} <span className="text-text-secondary">({pct.toFixed(1)}%)</span>
        </span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentAudits, setRecentAudits] = useState<AuditHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, h] = await Promise.all([
        getDashboardMetrics(),
        getHistory({ limit: 10 }),
      ]);
      setMetrics(m);
      setRecentAudits(h.data as AuditHistoryItem[]);
    } catch {
      // silently handle - may not have backend configured
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const total = metrics
    ? metrics.statusCounts.APROVADO +
      metrics.statusCounts["ATENÇÃO"] +
      metrics.statusCounts.REPROVADO
    : 0;

  const maxOvercharge = metrics?.transportadoraRanking?.[0]?.overcharge ?? 1;

  return (
    <div className="flex flex-col h-full overflow-auto">
      <TopBar title="Dashboard" subtitle="Visão geral da auditoria de fretes" />

      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-text-primary font-semibold">
              Painel de Controle
            </h2>
            <p className="text-text-secondary text-sm font-mono">
              Métricas em tempo real
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-blue-500/30 transition-all text-sm"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="CT-es Auditados"
            value={loading ? "..." : metrics?.totalAuditados ?? 0}
            icon={FileSearch}
            color="blue"
            loading={loading}
          />
          <MetricCard
            title="Taxa de Divergência"
            value={loading ? "..." : `${metrics?.taxaDivergencia ?? 0}%`}
            subtitle="dos CT-es auditados"
            icon={TrendingUp}
            color={
              (metrics?.taxaDivergencia ?? 0) > 30
                ? "red"
                : (metrics?.taxaDivergencia ?? 0) > 10
                ? "amber"
                : "green"
            }
            loading={loading}
          />
          <MetricCard
            title="Total Recuperável"
            value={loading ? "..." : fmtBRL(metrics?.totalRecuperavel ?? 0)}
            subtitle="overcharge identificado"
            icon={DollarSign}
            color="red"
            loading={loading}
          />
          <MetricCard
            title="Volume Auditado"
            value={loading ? "..." : fmtBRL(metrics?.volumeTotal ?? 0)}
            subtitle="valor total de fretes"
            icon={BarChart2}
            color="default"
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="text-text-primary font-semibold text-sm mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Status das Auditorias
            </h3>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-6 bg-border/30 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <ProgressBar
                  label="Aprovado"
                  value={metrics?.statusCounts.APROVADO ?? 0}
                  total={total}
                  color="bg-green-500"
                />
                <ProgressBar
                  label="Atenção"
                  value={metrics?.statusCounts["ATENÇÃO"] ?? 0}
                  total={total}
                  color="bg-amber-500"
                />
                <ProgressBar
                  label="Reprovado"
                  value={metrics?.statusCounts.REPROVADO ?? 0}
                  total={total}
                  color="bg-red-500"
                />
              </>
            )}
          </div>

          {/* Transportadora Ranking */}
          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="text-text-primary font-semibold text-sm mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Overcharge por Transportadora
            </h3>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-6 bg-border/30 rounded animate-pulse" />
                ))}
              </div>
            ) : metrics?.transportadoraRanking.length === 0 ? (
              <p className="text-text-secondary text-sm font-mono text-center py-6">
                Nenhum dado disponível ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {metrics?.transportadoraRanking.map((t) => (
                  <div key={t.name}>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-text-secondary truncate max-w-[60%]">
                        {t.name}
                      </span>
                      <span className="text-red-500">
                        {fmtBRL(t.overcharge)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500/60 rounded-full transition-all duration-700"
                        style={{
                          width: `${(t.overcharge / maxOvercharge) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Audits Table */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-text-primary font-semibold text-sm">
              Últimas Auditorias
            </h3>
            <Link
              href="/history"
              className="text-xs text-blue-500 hover:text-blue-400 font-mono transition-colors"
            >
              Ver todas →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["CT-e", "Transportadora", "Data", "Valor Total", "Overcharge", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-mono text-text-secondary uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(6)].map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-border/30 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : recentAudits.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-text-secondary text-xs font-mono"
                    >
                      Nenhuma auditoria realizada ainda.{" "}
                      <Link href="/audit" className="text-green-500 hover:underline">
                        Iniciar primeira auditoria →
                      </Link>
                    </td>
                  </tr>
                ) : (
                  recentAudits.map((audit) => (
                    <tr
                      key={audit.id}
                      className="border-b border-border/50 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-text-primary">
                        {audit.cte_numero}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary max-w-[150px] truncate">
                        {audit.cte_emitente || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-text-secondary">
                        {audit.cte_data || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-text-primary">
                        {fmtBRL(audit.valor_total)}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-red-500">
                        {audit.total_overcharge > 0
                          ? fmtBRL(audit.total_overcharge)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={audit.status as AuditStatus} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
