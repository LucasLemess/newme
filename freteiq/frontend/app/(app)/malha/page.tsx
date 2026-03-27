"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/ui/MetricCard";
import {
  getNetworkLanes,
  getNetworkSummary,
  seedDemoShipments,
  importShipmentsCsv,
} from "@/lib/api";
import type { LaneMetrics, NetworkSummary, LaneClassificacao } from "@/lib/types";
import {
  Network,
  TrendingDown,
  Clock,
  CheckCircle,
  RefreshCw,
  Upload,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  XCircle,
  FlaskConical,
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(v?: number) {
  if (v == null) return "N/D";
  return `${(v * 100).toFixed(1)}%`;
}

const classConfig: Record<
  LaneClassificacao,
  { label: string; color: string; dot: string; bg: string }
> = {
  critica: {
    label: "Crítica",
    color: "text-red-500",
    dot: "bg-red-500",
    bg: "bg-red-500/10 border-red-500/30",
  },
  atencao: {
    label: "Atenção",
    color: "text-amber-500",
    dot: "bg-amber-500",
    bg: "bg-amber-500/10 border-amber-500/30",
  },
  boa: {
    label: "Boa",
    color: "text-blue-500",
    dot: "bg-blue-500",
    bg: "bg-blue-500/10 border-blue-500/30",
  },
  otima: {
    label: "Ótima",
    color: "text-green-500",
    dot: "bg-green-500",
    bg: "bg-green-500/10 border-green-500/30",
  },
};

function ClassBadge({ c }: { c: LaneClassificacao }) {
  const cfg = classConfig[c];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono border",
        cfg.bg,
        cfg.color
      )}
    >
      <span className={clsx("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-green-500"
      : score >= 50
      ? "bg-blue-500"
      : score >= 30
      ? "bg-amber-500"
      : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono text-text-primary">{score}</span>
    </div>
  );
}

export default function MalhaPage() {
  const [lanes, setLanes] = useState<LaneMetrics[]>([]);
  const [summary, setSummary] = useState<NetworkSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [filter, setFilter] = useState<LaneClassificacao | "todas">("todas");
  const [error, setError] = useState<string | null>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [l, s] = await Promise.all([getNetworkLanes(), getNetworkSummary()]);
      setLanes(l);
      setSummary(s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSeedDemo() {
    setSeeding(true);
    try {
      const r = await seedDemoShipments();
      if (r.success) await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSeeding(false);
    }
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const r = await importShipmentsCsv(file);
      alert(`Importados ${r.inserted} embarques.${r.errors.length ? `\n\nAvisos:\n${r.errors.join("\n")}` : ""}`);
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setImporting(false);
      if (csvRef.current) csvRef.current.value = "";
    }
  }

  const filteredLanes =
    filter === "todas" ? lanes : lanes.filter((l) => l.classificacao === filter);

  const hasData = !loading && lanes.length > 0;
  const isEmpty = !loading && lanes.length === 0;

  return (
    <div className="flex flex-col h-full overflow-auto">
      <TopBar
        title="Malha"
        subtitle="Analytics estratégico da rede de transportes"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-text-primary font-semibold">Análise de Lanes</h2>
            <p className="text-text-secondary text-sm font-mono">
              Performance por rota e transportadora
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary text-sm transition-all"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Atualizar
            </button>
            <input
              ref={csvRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCsvImport}
            />
            <button
              onClick={() => csvRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-blue-400 hover:border-blue-500/30 text-sm transition-all disabled:opacity-50"
            >
              <Upload size={14} />
              {importing ? "Importando…" : "Importar CSV"}
            </button>
            <button
              onClick={handleSeedDemo}
              disabled={seeding}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-green-500/30 text-green-500 hover:bg-green-500/5 text-sm transition-all disabled:opacity-50"
            >
              <FlaskConical size={14} />
              {seeding ? "Carregando…" : "Demo"}
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Lanes Ativas"
            value={loading ? "..." : summary?.total_lanes ?? 0}
            icon={Network}
            color="blue"
            loading={loading}
          />
          <MetricCard
            title="Taxa de Pontualidade"
            value={loading ? "..." : pct(summary?.taxa_pontualidade_geral)}
            subtitle="média da malha"
            icon={CheckCircle}
            color={
              (summary?.taxa_pontualidade_geral ?? 1) < 0.75
                ? "red"
                : (summary?.taxa_pontualidade_geral ?? 1) < 0.90
                ? "amber"
                : "green"
            }
            loading={loading}
          />
          <MetricCard
            title="Custo Total"
            value={loading ? "..." : fmtBRL(summary?.custo_total ?? 0)}
            subtitle="período analisado"
            icon={TrendingDown}
            color="default"
            loading={loading}
          />
          <MetricCard
            title="Economia Potencial"
            value={loading ? "..." : fmtBRL(summary?.economia_potencial ?? 0)}
            subtitle="estimativa de saving"
            icon={Sparkles}
            color="green"
            loading={loading}
          />
        </div>

        {/* Status lane summary */}
        {hasData && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "critica" as const, icon: XCircle, label: "Críticas", val: summary?.lanes_criticas ?? 0, color: "text-red-500 border-red-500/20 bg-red-500/5" },
              { key: "atencao" as const, icon: AlertTriangle, label: "Atenção", val: summary?.lanes_atencao ?? 0, color: "text-amber-500 border-amber-500/20 bg-amber-500/5" },
              { key: "boa" as const, icon: CheckCircle, label: "Boas / Ótimas", val: summary?.lanes_boas ?? 0, color: "text-green-500 border-green-500/20 bg-green-500/5" },
            ].map(({ key, icon: Icon, label, val, color }) => (
              <button
                key={key}
                onClick={() => setFilter(filter === key ? "todas" : key)}
                className={clsx(
                  "flex items-center gap-3 p-4 rounded-lg border transition-all",
                  filter === key ? color : "border-border bg-surface hover:bg-white/[0.02]"
                )}
              >
                <Icon size={18} className={filter === key ? "" : "text-text-secondary"} />
                <div className="text-left">
                  <p className="text-lg font-bold font-mono">{val}</p>
                  <p className="text-xs text-text-secondary">{label}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="bg-surface border border-border rounded-lg p-12 text-center">
            <Network size={40} className="text-text-secondary mx-auto mb-4" />
            <h3 className="text-text-primary font-semibold mb-2">
              Nenhum dado de malha encontrado
            </h3>
            <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
              Importe um CSV com histórico de embarques ou carregue dados de demonstração
              para começar a analisar sua rede de transportes.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => csvRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-blue-400 hover:border-blue-500/30 text-sm transition-all"
              >
                <Upload size={14} /> Importar CSV
              </button>
              <button
                onClick={handleSeedDemo}
                disabled={seeding}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-500 hover:bg-green-500/20 text-sm transition-all"
              >
                <FlaskConical size={14} />
                {seeding ? "Carregando…" : "Carregar Demo"}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm font-mono">
            {error}
          </div>
        )}

        {/* Lanes Table */}
        {hasData && (
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-text-primary font-semibold text-sm">
                {filter === "todas" ? "Todas as Lanes" : `Lanes ${classConfig[filter].label}s`}
                <span className="ml-2 text-text-secondary font-normal text-xs">
                  ({filteredLanes.length})
                </span>
              </h3>
              {filter !== "todas" && (
                <button
                  onClick={() => setFilter("todas")}
                  className="text-xs text-blue-500 hover:text-blue-400 font-mono"
                >
                  Ver todas →
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      "Lane (Origem → Destino)",
                      "Transportadora",
                      "Modal",
                      "Score",
                      "Status",
                      "Embarques",
                      "Custo Médio",
                      "Custo/kg",
                      "LT Médio",
                      "Pontualidade",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-mono text-text-secondary uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? [...Array(6)].map((_, i) => (
                        <tr key={i} className="border-b border-border/50">
                          {[...Array(10)].map((__, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-4 bg-border/30 rounded animate-pulse" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : filteredLanes.map((lane) => (
                        <tr
                          key={lane.lane_id}
                          className="border-b border-border/50 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-text-primary whitespace-nowrap">
                            {lane.origem}
                            <span className="text-text-secondary mx-1">→</span>
                            {lane.destino}
                          </td>
                          <td className="px-4 py-3 text-xs text-text-secondary max-w-[140px] truncate">
                            {lane.transportadora}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono px-1.5 py-0.5 bg-border/40 rounded text-text-secondary">
                              {lane.modalidade}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <ScoreBar score={lane.lane_score} />
                          </td>
                          <td className="px-4 py-3">
                            <ClassBadge c={lane.classificacao} />
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-text-secondary text-right">
                            {lane.total_embarques}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-text-primary whitespace-nowrap">
                            {fmtBRL(lane.custo_medio_por_embarque)}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-text-secondary whitespace-nowrap">
                            {lane.custo_medio_por_kg != null
                              ? `R$ ${lane.custo_medio_por_kg.toFixed(2)}/kg`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-text-secondary">
                            {lane.lead_time_medio != null
                              ? `${lane.lead_time_medio.toFixed(1)}d`
                              : "—"}
                          </td>
                          <td
                            className={clsx(
                              "px-4 py-3 text-xs font-mono",
                              lane.taxa_pontualidade == null
                                ? "text-text-secondary"
                                : lane.taxa_pontualidade >= 0.9
                                ? "text-green-500"
                                : lane.taxa_pontualidade >= 0.75
                                ? "text-amber-500"
                                : "text-red-500"
                            )}
                          >
                            {pct(lane.taxa_pontualidade)}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quick actions */}
        {hasData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Link
              href="/malha/cenarios"
              className="flex items-center justify-between p-5 bg-surface border border-border rounded-lg hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group"
            >
              <div>
                <h3 className="text-text-primary font-semibold text-sm mb-1">
                  Simular Cenários
                </h3>
                <p className="text-text-secondary text-xs">
                  Troca de transportadora, milk-run, cross-dock, frequência
                </p>
              </div>
              <ArrowRight
                size={16}
                className="text-text-secondary group-hover:text-blue-400 transition-colors"
              />
            </Link>
            <Link
              href="/malha/relatorio"
              className="flex items-center justify-between p-5 bg-surface border border-border rounded-lg hover:border-green-500/30 hover:bg-green-500/5 transition-all group"
            >
              <div>
                <h3 className="text-text-primary font-semibold text-sm mb-1 flex items-center gap-2">
                  <Sparkles size={14} className="text-green-500" />
                  Relatório Estratégico IA
                </h3>
                <p className="text-text-secondary text-xs">
                  Análise completa com recomendações de redesenho da malha
                </p>
              </div>
              <ArrowRight
                size={16}
                className="text-text-secondary group-hover:text-green-400 transition-colors"
              />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
