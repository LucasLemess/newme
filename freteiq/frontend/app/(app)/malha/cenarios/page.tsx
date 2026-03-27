"use client";

import { useEffect, useState, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { createScenario, listScenarios, deleteScenario } from "@/lib/api";
import type { SavedScenario, ScenarioResult, ScenarioTipo } from "@/lib/types";
import {
  Plus,
  Trash2,
  ArrowLeft,
  TrendingDown,
  Clock,
  ChevronDown,
  ChevronUp,
  FlaskConical,
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const TIPO_LABELS: Record<ScenarioTipo, string> = {
  troca_transportadora: "Troca de Transportadora",
  mudanca_frequencia: "Mudança de Frequência",
  consolidacao_lanes: "Consolidação de Lanes",
  milk_run: "Milk-Run",
  cross_dock: "Cross-Dock",
};

type FormState = {
  nome: string;
  descricao: string;
  tipo: ScenarioTipo;
  // troca_transportadora
  trans_atuais: string;
  nova_trans: string;
  nova_tarifa: string;
  novo_lt: string;
  // mudanca_frequencia
  freq_atual: string;
  freq_nova: string;
  desconto_consolidacao: string;
  custo_estoque: string;
  // consolidacao / milk_run
  economia_rota_pct: string;
  lt_adicional: string;
  // cross_dock
  ponto_cross_dock: string;
  reducao_custo_pct: string;
  lt_adicional_cd: string;
  // shared
  origens: string;
  destinos: string;
};

const DEFAULT_FORM: FormState = {
  nome: "",
  descricao: "",
  tipo: "troca_transportadora",
  trans_atuais: "",
  nova_trans: "",
  nova_tarifa: "",
  novo_lt: "",
  freq_atual: "8",
  freq_nova: "4",
  desconto_consolidacao: "10",
  custo_estoque: "2",
  economia_rota_pct: "18",
  lt_adicional: "0.5",
  ponto_cross_dock: "",
  reducao_custo_pct: "20",
  lt_adicional_cd: "1",
  origens: "",
  destinos: "",
};

function buildParametros(f: FormState): Record<string, unknown> {
  const origens = f.origens ? f.origens.split(";").map((s) => s.trim()).filter(Boolean) : undefined;
  const destinos = f.destinos ? f.destinos.split(";").map((s) => s.trim()).filter(Boolean) : undefined;

  switch (f.tipo) {
    case "troca_transportadora":
      return {
        nome: f.nome,
        origens,
        destinos,
        transportadoras_atuais: f.trans_atuais
          ? f.trans_atuais.split(";").map((s) => s.trim()).filter(Boolean)
          : [],
        nova_transportadora: f.nova_trans,
        nova_tarifa_por_kg: parseFloat(f.nova_tarifa) || 0,
        novo_lead_time_medio: f.novo_lt ? parseFloat(f.novo_lt) : undefined,
      };
    case "mudanca_frequencia":
      return {
        nome: f.nome,
        origens,
        destinos,
        frequencia_atual_por_mes: parseFloat(f.freq_atual) || 8,
        frequencia_nova_por_mes: parseFloat(f.freq_nova) || 4,
        desconto_consolidacao_pct: parseFloat(f.desconto_consolidacao) || 10,
        custo_estoque_adicional_pct: parseFloat(f.custo_estoque) || 2,
      };
    case "consolidacao_lanes":
    case "milk_run":
      return {
        nome: f.nome,
        origens,
        destinos,
        economia_rota_pct: parseFloat(f.economia_rota_pct) || 18,
        lead_time_adicional_dias: parseFloat(f.lt_adicional) || 0.5,
      };
    case "cross_dock":
      return {
        nome: f.nome,
        origens,
        destinos,
        ponto_cross_dock: f.ponto_cross_dock,
        reducao_custo_pct: parseFloat(f.reducao_custo_pct) || 20,
        lead_time_adicional_dias: parseFloat(f.lt_adicional_cd) || 1,
      };
  }
}

function ResultCard({ result }: { result: ScenarioResult }) {
  const positive = result.economia_estimada > 0;
  return (
    <div className={clsx(
      "rounded-lg border p-4 mt-4",
      positive ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
    )}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-xs text-text-secondary mb-1">Custo Atual</p>
          <p className="text-sm font-mono font-bold text-text-primary">{fmtBRL(result.custo_atual)}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary mb-1">Custo Projetado</p>
          <p className="text-sm font-mono font-bold text-text-primary">{fmtBRL(result.custo_projetado)}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary mb-1">Economia Estimada</p>
          <p className={clsx("text-sm font-mono font-bold", positive ? "text-green-500" : "text-red-500")}>
            {positive ? "+" : ""}{fmtBRL(result.economia_estimada)}
            <span className="text-xs font-normal ml-1">({result.economia_percentual.toFixed(1)}%)</span>
          </p>
        </div>
        {result.lead_time_atual != null && (
          <div>
            <p className="text-xs text-text-secondary mb-1">Lead Time</p>
            <p className="text-sm font-mono font-bold text-text-primary">
              {result.lead_time_atual}d → {result.lead_time_projetado ?? "?"}d
            </p>
          </div>
        )}
      </div>
      <p className="text-sm text-text-secondary leading-relaxed border-t border-border pt-3">
        {result.recomendacao}
      </p>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-mono text-text-secondary mb-1">{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-blue-500/50"
    />
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-blue-500/50"
    />
  );
}

export default function CenariosPage() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [latestResult, setLatestResult] = useState<ScenarioResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const set = (key: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const loadSaved = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listScenarios();
      setSaved(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome) {
      alert("Informe um nome para o cenário.");
      return;
    }
    setSubmitting(true);
    setLatestResult(null);
    try {
      const parametros = buildParametros(form);
      const result = await createScenario({
        nome: form.nome,
        descricao: form.descricao || undefined,
        tipo: form.tipo,
        parametros,
      });
      setLatestResult(result);
      await loadSaved();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este cenário?")) return;
    await deleteScenario(id);
    await loadSaved();
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <TopBar title="Cenários" subtitle="Simulação de otimizações de malha" />

      <div className="flex-1 p-6 space-y-6">
        {/* Back */}
        <Link
          href="/malha"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm transition-colors"
        >
          <ArrowLeft size={14} /> Voltar para Malha
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="text-text-primary font-semibold text-sm mb-4 flex items-center gap-2">
              <FlaskConical size={14} className="text-blue-400" />
              Novo Cenário
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <FieldGroup label="Nome do Cenário *">
                <TextInput value={form.nome} onChange={set("nome")} placeholder="Ex: Migrar SP→NE para Braspress" />
              </FieldGroup>

              <FieldGroup label="Tipo de Otimização">
                <select
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as ScenarioTipo }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-blue-500/50"
                >
                  {Object.entries(TIPO_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </FieldGroup>

              <FieldGroup label="Origens (opcional, separadas por ;)">
                <TextInput value={form.origens} onChange={set("origens")} placeholder="São Paulo/SP; Campinas/SP" />
              </FieldGroup>

              <FieldGroup label="Destinos (opcional, separados por ;)">
                <TextInput value={form.destinos} onChange={set("destinos")} placeholder="Recife/PE; Fortaleza/CE" />
              </FieldGroup>

              {/* Type-specific fields */}
              {form.tipo === "troca_transportadora" && (
                <>
                  <FieldGroup label="Transportadoras Atuais (separadas por ;)">
                    <TextInput value={form.trans_atuais} onChange={set("trans_atuais")} placeholder="Rodonaves; Braspress" />
                  </FieldGroup>
                  <FieldGroup label="Nova Transportadora">
                    <TextInput value={form.nova_trans} onChange={set("nova_trans")} placeholder="TNT Mercúrio" />
                  </FieldGroup>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Nova Tarifa (R$/kg)">
                      <NumberInput value={form.nova_tarifa} onChange={set("nova_tarifa")} placeholder="4.50" />
                    </FieldGroup>
                    <FieldGroup label="Novo Lead Time (dias)">
                      <NumberInput value={form.novo_lt} onChange={set("novo_lt")} placeholder="3" />
                    </FieldGroup>
                  </div>
                </>
              )}

              {form.tipo === "mudanca_frequencia" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Frequência Atual (embarques/mês)">
                      <NumberInput value={form.freq_atual} onChange={set("freq_atual")} placeholder="8" />
                    </FieldGroup>
                    <FieldGroup label="Frequência Nova (embarques/mês)">
                      <NumberInput value={form.freq_nova} onChange={set("freq_nova")} placeholder="4" />
                    </FieldGroup>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Desconto por Consolidação (%)">
                      <NumberInput value={form.desconto_consolidacao} onChange={set("desconto_consolidacao")} placeholder="10" />
                    </FieldGroup>
                    <FieldGroup label="Custo Adicional de Estoque (%)">
                      <NumberInput value={form.custo_estoque} onChange={set("custo_estoque")} placeholder="2" />
                    </FieldGroup>
                  </div>
                </>
              )}

              {(form.tipo === "consolidacao_lanes" || form.tipo === "milk_run") && (
                <div className="grid grid-cols-2 gap-3">
                  <FieldGroup label="Economia de Rota Estimada (%)">
                    <NumberInput value={form.economia_rota_pct} onChange={set("economia_rota_pct")} placeholder="18" />
                  </FieldGroup>
                  <FieldGroup label="Lead Time Adicional por Parada (dias)">
                    <NumberInput value={form.lt_adicional} onChange={set("lt_adicional")} placeholder="0.5" />
                  </FieldGroup>
                </div>
              )}

              {form.tipo === "cross_dock" && (
                <>
                  <FieldGroup label="Ponto de Cross-Dock">
                    <TextInput value={form.ponto_cross_dock} onChange={set("ponto_cross_dock")} placeholder="Ribeirão Preto/SP" />
                  </FieldGroup>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Redução de Custo Estimada (%)">
                      <NumberInput value={form.reducao_custo_pct} onChange={set("reducao_custo_pct")} placeholder="20" />
                    </FieldGroup>
                    <FieldGroup label="Lead Time Adicional (dias)">
                      <NumberInput value={form.lt_adicional_cd} onChange={set("lt_adicional_cd")} placeholder="1" />
                    </FieldGroup>
                  </div>
                </>
              )}

              <FieldGroup label="Descrição (opcional)">
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  rows={2}
                  placeholder="Contexto ou justificativa do cenário"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-blue-500/50 resize-none"
                />
              </FieldGroup>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all disabled:opacity-60"
              >
                <Plus size={14} />
                {submitting ? "Simulando…" : "Simular Cenário"}
              </button>
            </form>

            {/* Latest result */}
            {latestResult && <ResultCard result={latestResult} />}
          </div>

          {/* Saved scenarios */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-text-primary font-semibold text-sm">
                Cenários Simulados
                <span className="ml-2 text-text-secondary font-normal text-xs">({saved.length})</span>
              </h3>
            </div>

            <div className="divide-y divide-border">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="p-4">
                    <div className="h-4 bg-border/30 rounded animate-pulse mb-2" />
                    <div className="h-3 bg-border/20 rounded animate-pulse w-2/3" />
                  </div>
                ))
              ) : saved.length === 0 ? (
                <div className="p-8 text-center text-text-secondary text-sm font-mono">
                  Nenhum cenário simulado ainda.
                </div>
              ) : (
                saved.map((s) => {
                  const eco = s.economia_estimada ?? 0;
                  const isOpen = expanded === s.id;
                  return (
                    <div key={s.id} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-text-primary text-sm font-medium truncate">{s.nome}</p>
                            <span className="text-xs font-mono px-1.5 py-0.5 bg-border/40 rounded text-text-secondary shrink-0">
                              {TIPO_LABELS[s.tipo]}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={clsx("text-xs font-mono font-bold", eco >= 0 ? "text-green-500" : "text-red-500")}>
                              {eco >= 0 ? "+" : ""}{fmtBRL(eco)}
                            </span>
                            <span className="text-xs text-text-secondary font-mono">
                              {new Date(s.created_at).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          {s.descricao && (
                            <p className="text-xs text-text-secondary mt-1 truncate">{s.descricao}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {s.resultado && (
                            <button
                              onClick={() => setExpanded(isOpen ? null : s.id)}
                              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-border/30 transition-all"
                            >
                              {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {isOpen && s.resultado && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div>
                              <p className="text-xs text-text-secondary mb-0.5">Atual</p>
                              <p className="text-xs font-mono font-bold text-text-primary">{fmtBRL((s.resultado as ScenarioResult).custo_atual)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-text-secondary mb-0.5">Projetado</p>
                              <p className="text-xs font-mono font-bold text-text-primary">{fmtBRL((s.resultado as ScenarioResult).custo_projetado)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-text-secondary mb-0.5">Economia</p>
                              <p className={clsx("text-xs font-mono font-bold", eco >= 0 ? "text-green-500" : "text-red-500")}>
                                {(s.resultado as ScenarioResult).economia_percentual.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed">
                            {(s.resultado as ScenarioResult).recomendacao}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Summary */}
            {saved.length > 0 && (
              <div className="px-5 py-3 border-t border-border bg-background/50">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-text-secondary">Economia total simulada:</span>
                  <span className="text-green-500 font-bold">
                    {fmtBRL(saved.reduce((acc, s) => acc + (s.economia_estimada ?? 0), 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
