"use client";

import { useCallback, useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getHistory, generateContestacao, generateAnalise, getAuthToken } from "@/lib/api";
import type { AuditHistoryItem, AuditStatus } from "@/lib/types";
import { FileText, Brain, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

function fmtBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-400 font-mono transition-colors"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copiado!" : "Copiar"}
    </button>
  );
}

export default function ContestacaoPage() {
  const [audits, setAudits] = useState<AuditHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [contents, setContents] = useState<Record<string, { contestacao?: string; analise?: string; loadC?: boolean; loadA?: boolean }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getHistory({ limit: 50, status: "REPROVADO" });
      const atencao = await getHistory({ limit: 50, status: "ATENÇÃO" });
      const all = [...(result.data as AuditHistoryItem[]), ...(atencao.data as AuditHistoryItem[])];
      // sort by overcharge desc
      all.sort((a, b) => b.total_overcharge - a.total_overcharge);
      setAudits(all);
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleContestacao(auditId: string) {
    setContents((prev) => ({ ...prev, [auditId]: { ...prev[auditId], loadC: true } }));
    try {
      const text = await generateContestacao(auditId);
      setContents((prev) => ({ ...prev, [auditId]: { ...prev[auditId], contestacao: text, loadC: false } }));
    } catch {
      setContents((prev) => ({ ...prev, [auditId]: { ...prev[auditId], loadC: false } }));
    }
  }

  async function handleAnalise(auditId: string) {
    setContents((prev) => ({ ...prev, [auditId]: { ...prev[auditId], loadA: true } }));
    try {
      const text = await generateAnalise(auditId);
      setContents((prev) => ({ ...prev, [auditId]: { ...prev[auditId], analise: text, loadA: false } }));
    } catch {
      setContents((prev) => ({ ...prev, [auditId]: { ...prev[auditId], loadA: false } }));
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <TopBar title="Contestações" subtitle="Geração de cartas via IA para CT-es reprovados" />

      <div className="flex-1 p-6 space-y-5">
        <div>
          <h2 className="text-text-primary font-semibold">Central de Contestações</h2>
          <p className="text-text-secondary text-sm font-mono">
            CT-es com divergências — clique para gerar carta ou análise estratégica
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-surface border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : audits.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-10 text-center">
            <FileText size={32} className="text-border mx-auto mb-3" />
            <p className="text-text-secondary">Nenhum CT-e com divergências encontrado.</p>
            <p className="text-text-secondary text-sm mt-1">
              Realize auditorias para gerar contestações.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {audits.map((audit) => {
              const isOpen = expanded === audit.id;
              const c = contents[audit.id] || {};

              return (
                <div
                  key={audit.id}
                  className="bg-surface border border-border rounded-xl overflow-hidden"
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between p-4 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusBadge status={audit.status as AuditStatus} />
                      <div className="min-w-0">
                        <p className="text-text-primary font-mono text-sm font-medium">
                          CT-e {audit.cte_numero}
                        </p>
                        <p className="text-text-secondary text-xs truncate">
                          {audit.cte_emitente || "—"} — {audit.cte_data || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-text-secondary text-xs font-mono">Overcharge</p>
                        <p className="text-red-500 font-mono font-semibold text-sm">
                          {fmtBRL(audit.total_overcharge)}
                        </p>
                      </div>
                      <button
                        onClick={() => setExpanded(isOpen ? null : audit.id)}
                        className="p-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-blue-500/30 transition-all"
                      >
                        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded */}
                  {isOpen && (
                    <div className="border-t border-border p-4 space-y-4 animate-fade-in">
                      <div className="flex gap-3 flex-wrap">
                        <button
                          onClick={() => handleContestacao(audit.id)}
                          disabled={c.loadC}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-500 text-sm font-medium transition-all disabled:opacity-50"
                        >
                          <FileText size={14} />
                          {c.loadC ? "Gerando..." : "Gerar Carta de Contestação"}
                        </button>
                        <button
                          onClick={() => handleAnalise(audit.id)}
                          disabled={c.loadA}
                          className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-500 text-sm font-medium transition-all disabled:opacity-50"
                        >
                          <Brain size={14} />
                          {c.loadA ? "Analisando..." : "Análise Estratégica IA"}
                        </button>
                      </div>

                      {c.contestacao && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-text-secondary text-xs font-mono uppercase tracking-wider">
                              Carta de Contestação
                            </p>
                            <CopyButton text={c.contestacao} />
                          </div>
                          <div className="bg-black/40 rounded-lg p-4 font-mono text-xs text-text-primary leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto border border-border">
                            {c.contestacao}
                          </div>
                        </div>
                      )}

                      {c.analise && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-text-secondary text-xs font-mono uppercase tracking-wider">
                              Análise Estratégica
                            </p>
                            <CopyButton text={c.analise} />
                          </div>
                          <div className="bg-black/40 rounded-lg p-4 text-sm text-text-primary leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto border border-border">
                            {c.analise}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
