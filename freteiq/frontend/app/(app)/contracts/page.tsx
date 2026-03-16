"use client";

import { useCallback, useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { listContracts, createContract, updateContract, deleteContract } from "@/lib/api";
import type { Contract, ContractCreate } from "@/lib/types";
import { Plus, Pencil, Trash2, X, Check, FileText } from "lucide-react";
import clsx from "clsx";

const emptyForm: ContractCreate = {
  transportadora: "",
  cnpj_transportadora: "",
  icms_rate: undefined,
  freight_rate_per_kg: undefined,
  ad_valorem_rate: undefined,
  max_pedagio: undefined,
  validade_inicio: "",
  validade_fim: "",
  observacoes: "",
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ContractCreate>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listContracts();
      setContracts(data);
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(c: Contract) {
    setForm({
      transportadora: c.transportadora,
      cnpj_transportadora: c.cnpj_transportadora ?? "",
      icms_rate: c.icms_rate,
      freight_rate_per_kg: c.freight_rate_per_kg,
      ad_valorem_rate: c.ad_valorem_rate,
      max_pedagio: c.max_pedagio,
      validade_inicio: c.validade_inicio ?? "",
      validade_fim: c.validade_fim ?? "",
      observacoes: c.observacoes ?? "",
    });
    setEditId(c.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.transportadora.trim()) return;
    setSaving(true);
    try {
      const data: ContractCreate = {
        ...form,
        icms_rate: form.icms_rate ? Number(form.icms_rate) : undefined,
        freight_rate_per_kg: form.freight_rate_per_kg ? Number(form.freight_rate_per_kg) : undefined,
        ad_valorem_rate: form.ad_valorem_rate ? Number(form.ad_valorem_rate) : undefined,
        max_pedagio: form.max_pedagio ? Number(form.max_pedagio) : undefined,
      };
      if (editId) {
        await updateContract(editId, data);
      } else {
        await createContract(data);
      }
      setShowForm(false);
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteContract(id);
      setDeleteConfirm(null);
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao deletar";
      alert(msg);
    }
  }

  const field = (label: string, key: keyof ContractCreate, type = "text", placeholder = "") => (
    <div>
      <label className="block text-text-secondary text-xs font-mono mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={(form[key] as string | number | undefined) ?? ""}
        onChange={(e) =>
          setForm((prev) => ({
            ...prev,
            [key]: e.target.value === "" ? undefined : e.target.value,
          }))
        }
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm placeholder-text-secondary/50 focus:border-blue-500/50 focus:outline-none transition-colors font-mono"
      />
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-auto">
      <TopBar title="Contratos" subtitle="Gestão de contratos de transporte" />

      <div className="flex-1 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-text-primary font-semibold">Contratos de Transporte</h2>
            <p className="text-text-secondary text-sm font-mono">
              {contracts.length} contrato{contracts.length !== 1 ? "s" : ""} cadastrado{contracts.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-green-500 text-sm font-medium transition-all"
          >
            <Plus size={16} />
            Novo Contrato
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="bg-surface border border-border rounded-xl p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-text-primary font-semibold text-sm">
                {editId ? "Editar Contrato" : "Novo Contrato"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 rounded hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field("Transportadora *", "transportadora", "text", "Nome da transportadora")}
              {field("CNPJ Transportadora", "cnpj_transportadora", "text", "00.000.000/0000-00")}
              {field("Alíquota ICMS (%)", "icms_rate", "number", "ex: 12")}
              {field("Tarifa Frete/kg (R$)", "freight_rate_per_kg", "number", "ex: 5.50")}
              {field("Ad Valorem (decimal)", "ad_valorem_rate", "number", "ex: 0.003 para 0.3%")}
              {field("Pedágio Máx (R$)", "max_pedagio", "number", "ex: 60.00")}
              {field("Validade Início", "validade_inicio", "date")}
              {field("Validade Fim", "validade_fim", "date")}
            </div>

            <div className="mt-4">
              <label className="block text-text-secondary text-xs font-mono mb-1.5 uppercase tracking-wider">
                Observações
              </label>
              <textarea
                value={form.observacoes ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm placeholder-text-secondary/50 focus:border-blue-500/50 focus:outline-none transition-colors font-mono resize-none"
                placeholder="Observações adicionais sobre o contrato..."
              />
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSave}
                disabled={saving || !form.transportadora.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-green-500 text-sm font-medium transition-all disabled:opacity-50"
              >
                <Check size={14} />
                {saving ? "Salvando..." : "Salvar"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-surface border border-border rounded-lg text-text-secondary hover:text-text-primary text-sm transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Contracts List */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-text-secondary text-xs font-mono">Carregando...</p>
            </div>
          ) : contracts.length === 0 ? (
            <div className="p-10 text-center">
              <FileText size={32} className="text-border mx-auto mb-3" />
              <p className="text-text-secondary font-medium">Nenhum contrato cadastrado</p>
              <p className="text-text-secondary text-sm mt-1">
                Cadastre contratos para habilitar a auditoria completa
              </p>
              <button
                onClick={openCreate}
                className="mt-4 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-500 text-sm hover:bg-green-500/20 transition-all"
              >
                Cadastrar primeiro contrato
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {contracts.map((c) => (
                <div
                  key={c.id}
                  className={clsx(
                    "p-5 hover:bg-white/[0.02] transition-colors",
                    deleteConfirm === c.id && "bg-red-500/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-text-primary font-medium text-sm truncate">
                          {c.transportadora}
                        </h4>
                        {c.cnpj_transportadora && (
                          <span className="text-text-secondary text-xs font-mono">
                            {c.cnpj_transportadora}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-mono text-text-secondary mt-2">
                        {c.icms_rate != null && (
                          <span>ICMS: <span className="text-text-primary">{c.icms_rate}%</span></span>
                        )}
                        {c.freight_rate_per_kg != null && (
                          <span>Tarifa: <span className="text-text-primary">R$ {c.freight_rate_per_kg}/kg</span></span>
                        )}
                        {c.ad_valorem_rate != null && (
                          <span>Ad Val.: <span className="text-text-primary">{(c.ad_valorem_rate * 100).toFixed(2)}%</span></span>
                        )}
                        {c.max_pedagio != null && (
                          <span>Pedágio máx: <span className="text-text-primary">R$ {c.max_pedagio}</span></span>
                        )}
                        {c.validade_inicio && c.validade_fim && (
                          <span>Vigência: <span className="text-text-primary">{c.validade_inicio} → {c.validade_fim}</span></span>
                        )}
                      </div>

                      {c.observacoes && (
                        <p className="text-text-secondary text-xs mt-2 line-clamp-1">
                          {c.observacoes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {deleteConfirm === c.id ? (
                        <>
                          <span className="text-xs text-red-500 font-mono">Confirmar?</span>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="px-2 py-1 bg-red-500/10 border border-red-500/30 rounded text-red-500 text-xs hover:bg-red-500/20 transition-all"
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 border border-border rounded text-text-secondary text-xs hover:text-text-primary transition-all"
                          >
                            Não
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded border border-border text-text-secondary hover:text-blue-500 hover:border-blue-500/30 transition-all"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(c.id)}
                            className="p-1.5 rounded border border-border text-text-secondary hover:text-red-500 hover:border-red-500/30 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
