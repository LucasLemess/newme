"use client";

import { useState, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { UploadZone } from "@/components/audit/UploadZone";
import { Terminal, type TerminalLine } from "@/components/ui/Terminal";
import { AuditResultView } from "@/components/audit/AuditResult";
import {
  uploadCte,
  runDemoAudit,
  generateContestacao,
  generateAnalise,
} from "@/lib/api";
import type { AuditResult } from "@/lib/types";
import { Zap } from "lucide-react";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function AuditPage() {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [contestacao, setContestacao] = useState<string | null>(null);
  const [analise, setAnalise] = useState<string | null>(null);
  const [loadingContestacao, setLoadingContestacao] = useState(false);
  const [loadingAnalise, setLoadingAnalise] = useState(false);

  const addLine = useCallback((line: TerminalLine) => {
    setLines((prev) => [...prev, line]);
  }, []);

  const ts = () =>
    new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const runAudit = useCallback(
    async (uploadFn: () => Promise<{ success: boolean; auditId?: string; result?: AuditResult; error?: string }>) => {
      setProcessing(true);
      setResult(null);
      setAuditId(null);
      setContestacao(null);
      setAnalise(null);
      setLines([]);

      addLine({ type: "cmd", text: "Iniciando engine de auditoria FreteIQ v1.0...", timestamp: ts() });
      await sleep(300);
      addLine({ type: "info", text: "Carregando parser CT-e SEFAZ v3.00+", timestamp: ts() });
      await sleep(400);
      addLine({ type: "info", text: "Conectando ao banco de contratos...", timestamp: ts() });
      await sleep(400);

      try {
        const response = await uploadFn();

        addLine({ type: "success", text: "XML parseado com sucesso", timestamp: ts() });
        await sleep(200);

        if (response.result) {
          const r = response.result;
          addLine({ type: "info", text: `CT-e nº ${r.cteNumero} — Emitente: ${r.cteEmitente || "N/A"}`, timestamp: ts() });
          await sleep(200);
          addLine({ type: "info", text: `Valor total da prestação: R$ ${r.valorTotal.toFixed(2)}`, timestamp: ts() });
          await sleep(200);

          addLine({ type: "cmd", text: "Executando regras de auditoria:", timestamp: ts() });
          await sleep(300);
          addLine({ type: "info", text: "[1/6] Verificando ICMS vs. alíquota contratual...", timestamp: ts() });
          await sleep(250);
          addLine({ type: "info", text: "[2/6] Verificando tarifa frete/kg...", timestamp: ts() });
          await sleep(250);
          addLine({ type: "info", text: "[3/6] Verificando Ad Valorem...", timestamp: ts() });
          await sleep(250);
          addLine({ type: "info", text: "[4/6] Verificando fator de cubagem...", timestamp: ts() });
          await sleep(250);
          addLine({ type: "info", text: "[5/6] Verificando pedágio...", timestamp: ts() });
          await sleep(250);
          addLine({ type: "info", text: "[6/6] Verificando consistência do total...", timestamp: ts() });
          await sleep(300);

          if (r.findings.length > 0) {
            addLine({
              type: "warn",
              text: `${r.findings.length} divergência(s) encontrada(s)`,
              timestamp: ts(),
            });
            r.findings.forEach((f) => {
              addLine({
                type: f.severity === "high" ? "error" : "warn",
                text: `[${f.severity.toUpperCase()}] ${f.tipo}: ${f.diferenca > 0 ? "+" : ""}R$ ${f.diferenca.toFixed(2)}`,
                timestamp: ts(),
              });
            });
            addLine({
              type: "error",
              text: `TOTAL OVERCHARGE: R$ ${r.totalOvercharge.toFixed(2)}`,
              timestamp: ts(),
            });
          } else {
            addLine({ type: "success", text: "Nenhuma divergência encontrada", timestamp: ts() });
          }

          addLine({
            type: r.status === "APROVADO" ? "success" : r.status === "REPROVADO" ? "error" : "warn",
            text: `STATUS FINAL: ${r.status}`,
            timestamp: ts(),
          });

          setResult(r);
          setAuditId(response.auditId ?? null);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        addLine({ type: "error", text: `Erro: ${msg}`, timestamp: ts() });
      } finally {
        setProcessing(false);
      }
    },
    [addLine]
  );

  const handleFile = useCallback(
    (file: File) => {
      runAudit(() => uploadCte(file));
    },
    [runAudit]
  );

  const handleDemo = useCallback(() => {
    runAudit(() => runDemoAudit());
  }, [runAudit]);

  const handleContestacao = useCallback(async () => {
    if (!auditId) return;
    setLoadingContestacao(true);
    try {
      const text = await generateContestacao(auditId);
      setContestacao(text);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      alert(`Erro ao gerar contestação: ${msg}`);
    } finally {
      setLoadingContestacao(false);
    }
  }, [auditId]);

  const handleAnalise = useCallback(async () => {
    if (!auditId) return;
    setLoadingAnalise(true);
    try {
      const text = await generateAnalise(auditId);
      setAnalise(text);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      alert(`Erro ao gerar análise: ${msg}`);
    } finally {
      setLoadingAnalise(false);
    }
  }, [auditId]);

  const handleNova = useCallback(() => {
    setResult(null);
    setAuditId(null);
    setContestacao(null);
    setAnalise(null);
    setLines([]);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-auto">
      <TopBar
        title="Nova Auditoria"
        subtitle="Upload e análise automática de CT-e"
      />

      <div className="flex-1 p-6 space-y-5">
        {!result && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-text-primary font-semibold">
                  Auditoria de CT-e
                </h2>
                <p className="text-text-secondary text-sm font-mono">
                  Faça upload do XML ou use o CT-e de demonstração
                </p>
              </div>
              <button
                onClick={handleDemo}
                disabled={processing}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-500 text-sm font-medium transition-all disabled:opacity-50"
              >
                <Zap size={14} />
                CT-e Demo
              </button>
            </div>

            <UploadZone onFile={handleFile} disabled={processing} />
          </>
        )}

        {(lines.length > 0 || processing) && (
          <Terminal lines={lines} loading={processing} />
        )}

        {result && (
          <AuditResultView
            result={result}
            onContestacao={handleContestacao}
            onAnalise={handleAnalise}
            onNova={handleNova}
            loadingContestacao={loadingContestacao}
            loadingAnalise={loadingAnalise}
          />
        )}

        {/* Contestação */}
        {contestacao && (
          <div className="bg-surface border border-red-500/20 rounded-xl p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-text-primary font-semibold text-sm">
                📄 Carta de Contestação
              </h3>
              <button
                onClick={() => navigator.clipboard.writeText(contestacao)}
                className="text-xs text-blue-500 hover:text-blue-400 font-mono"
              >
                Copiar
              </button>
            </div>
            <div className="bg-black/40 rounded-lg p-4 font-mono text-xs text-text-primary leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
              {contestacao}
            </div>
          </div>
        )}

        {/* Análise Estratégica */}
        {analise && (
          <div className="bg-surface border border-amber-500/20 rounded-xl p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-text-primary font-semibold text-sm">
                🧠 Análise Estratégica
              </h3>
              <button
                onClick={() => navigator.clipboard.writeText(analise)}
                className="text-xs text-blue-500 hover:text-blue-400 font-mono"
              >
                Copiar
              </button>
            </div>
            <div className="bg-black/40 rounded-lg p-4 text-sm text-text-primary leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
              {analise}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
