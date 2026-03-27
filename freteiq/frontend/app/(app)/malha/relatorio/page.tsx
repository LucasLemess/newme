"use client";

import { useEffect, useState, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { generateNetworkReport, getLatestNetworkReport } from "@/lib/api";
import type { NetworkReport } from "@/lib/types";
import {
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Clock,
  FileText,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MarkdownBlock({ content }: { content: string }) {
  // Simple markdown-to-JSX renderer for the report content
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} className="text-text-primary font-bold text-base mt-6 mb-2 flex items-center gap-2">
          <span className="w-1 h-4 bg-green-500 rounded-full shrink-0" />
          {line.replace("## ", "")}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={key++} className="text-text-primary font-bold text-lg mt-4 mb-3">
          {line.replace("# ", "")}
        </h1>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={key++} className="text-text-primary font-semibold text-sm mt-4 mb-1">
          {line.replace("### ", "")}
        </h3>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={key++} className="text-text-secondary text-sm ml-4 mb-1 list-none flex gap-2">
          <span className="text-green-500 mt-1.5 shrink-0">▸</span>
          <span>{line.replace(/^[-*] /, "")}</span>
        </li>
      );
    } else if (line.match(/^\d+\. /)) {
      const num = line.match(/^(\d+)\. /)?.[1];
      elements.push(
        <li key={key++} className="text-text-secondary text-sm ml-4 mb-1 list-none flex gap-2">
          <span className="text-blue-400 font-mono text-xs mt-0.5 shrink-0 w-4">{num}.</span>
          <span>{line.replace(/^\d+\. /, "")}</span>
        </li>
      );
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(
        <p key={key++} className="text-text-primary font-semibold text-sm my-1">
          {line.replace(/\*\*/g, "")}
        </p>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      // Inline bold
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      elements.push(
        <p key={key++} className="text-text-secondary text-sm leading-relaxed mb-1">
          {parts.map((part, pi) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={pi} className="text-text-primary font-semibold">
                {part.replace(/\*\*/g, "")}
              </strong>
            ) : (
              part
            )
          )}
        </p>
      );
    }
  }

  return <div className="prose-sm">{elements}</div>;
}

export default function RelatorioPage() {
  const [report, setReport] = useState<NetworkReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getLatestNetworkReport();
      setReport(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const r = await generateNetworkReport();
      setReport({
        id: r.id,
        conteudo: r.conteudo,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  const hasReport = !loading && report != null;
  const isEmpty = !loading && report == null;

  return (
    <div className="flex flex-col h-full overflow-auto">
      <TopBar title="Relatório Estratégico" subtitle="Análise IA da malha de transportes" />

      <div className="flex-1 p-6 space-y-6">
        {/* Back + actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/malha"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm transition-colors"
          >
            <ArrowLeft size={14} /> Voltar para Malha
          </Link>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-500 hover:bg-green-500/20 text-sm transition-all disabled:opacity-60"
          >
            {generating ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Gerando relatório…
              </>
            ) : (
              <>
                <Sparkles size={14} />
                {report ? "Novo Relatório" : "Gerar Relatório IA"}
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-surface border border-border rounded-lg p-8 text-center">
            <RefreshCw size={24} className="text-text-secondary mx-auto mb-3 animate-spin" />
            <p className="text-text-secondary text-sm">Carregando relatório…</p>
          </div>
        )}

        {/* Generating overlay */}
        {generating && (
          <div className="bg-surface border border-green-500/20 rounded-lg p-8 text-center">
            <Sparkles size={32} className="text-green-500 mx-auto mb-3 animate-pulse" />
            <h3 className="text-text-primary font-semibold mb-2">Analisando sua malha…</h3>
            <p className="text-text-secondary text-sm max-w-md mx-auto">
              O Claude está processando o histórico de embarques, identificando lanes críticas
              e construindo recomendações estratégicas. Isso pode levar 20–40 segundos.
            </p>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && !generating && (
          <div className="bg-surface border border-border rounded-lg p-12 text-center">
            <FileText size={40} className="text-text-secondary mx-auto mb-4" />
            <h3 className="text-text-primary font-semibold mb-2">
              Nenhum relatório gerado ainda
            </h3>
            <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
              Gere um relatório estratégico completo com análise das lanes críticas,
              recomendações de otimização e projeção de economia para sua malha.
            </p>
            <p className="text-text-secondary text-xs font-mono mb-6">
              Necessário ao menos 5 embarques cadastrados em Malha.
            </p>
            <button
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-500 hover:bg-green-500/20 text-sm transition-all"
            >
              <Sparkles size={14} /> Gerar Relatório IA
            </button>
          </div>
        )}

        {/* Report content */}
        {hasReport && !generating && (
          <>
            {/* Metadata bar */}
            <div className="flex items-center gap-4 px-4 py-3 bg-surface border border-border rounded-lg text-xs font-mono text-text-secondary">
              <span className="flex items-center gap-1.5">
                <Clock size={12} />
                Gerado em{" "}
                {new Date(report!.created_at).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {report!.metricas_snapshot && (
                <>
                  <span>•</span>
                  <span>
                    {report!.metricas_snapshot.total_embarques} embarques analisados
                  </span>
                  <span>•</span>
                  <span>
                    {report!.metricas_snapshot.total_lanes} lanes
                  </span>
                  <span>•</span>
                  <span className="text-green-500">
                    Economia potencial:{" "}
                    {fmtBRL(report!.metricas_snapshot.economia_potencial)}
                  </span>
                </>
              )}
            </div>

            {/* Snapshot KPIs */}
            {report!.metricas_snapshot && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    label: "Embarques",
                    val: report!.metricas_snapshot.total_embarques,
                    sub: "período analisado",
                    color: "text-blue-400",
                  },
                  {
                    label: "Lanes Críticas",
                    val: report!.metricas_snapshot.lanes_criticas,
                    sub: "requerem ação imediata",
                    color: "text-red-400",
                  },
                  {
                    label: "Custo Total",
                    val: fmtBRL(report!.metricas_snapshot.custo_total),
                    sub: "período",
                    color: "text-text-primary",
                  },
                  {
                    label: "Saving Potencial",
                    val: fmtBRL(report!.metricas_snapshot.economia_potencial),
                    sub: "estimativa conservadora",
                    color: "text-green-500",
                  },
                ].map(({ label, val, sub, color }) => (
                  <div key={label} className="bg-surface border border-border rounded-lg p-4">
                    <p className="text-xs text-text-secondary mb-1">{label}</p>
                    <p className={`text-sm font-bold font-mono ${color}`}>{val}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Report body */}
            <div className="bg-surface border border-border rounded-lg p-6">
              <MarkdownBlock content={report!.conteudo} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
