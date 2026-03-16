"use client";

import { useCallback, useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getHistory, getExportCsvUrl, getAuthToken } from "@/lib/api";
import type { AuditHistoryItem, AuditStatus } from "@/lib/types";
import { Search, Download, ChevronLeft, ChevronRight, Filter } from "lucide-react";

function fmtBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function HistoryPage() {
  const [items, setItems] = useState<AuditHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [minOvercharge, setMinOvercharge] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getHistory({
        page,
        limit: 20,
        transportadora: search || undefined,
        status: statusFilter || undefined,
        data_inicio: dataInicio || undefined,
        data_fim: dataFim || undefined,
        min_overcharge: minOvercharge ? parseFloat(minOvercharge) : undefined,
      });
      setItems(result.data as AuditHistoryItem[]);
      setPages(result.pages);
      setTotal(result.total);
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, dataInicio, dataFim, minOvercharge]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dataInicio, dataFim, minOvercharge]);

  async function handleExportCsv() {
    const token = await getAuthToken();
    const url = getExportCsvUrl();
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "freteiq_historico.csv";
    a.click();
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <TopBar title="Histórico" subtitle="Todos os CT-es auditados" />

      <div className="flex-1 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-text-primary font-semibold">
              Histórico de Auditorias
            </h2>
            <p className="text-text-secondary text-sm font-mono">
              {total} registro{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-green-500/30 text-sm transition-all"
          >
            <Download size={14} />
            Exportar CSV
          </button>
        </div>

        {/* Filters */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={14} className="text-text-secondary" />
            <span className="text-text-secondary text-xs font-mono uppercase tracking-wider">
              Filtros
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="relative col-span-2 md:col-span-1">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                type="text"
                placeholder="Transportadora..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm placeholder-text-secondary/50 focus:border-blue-500/50 focus:outline-none transition-colors font-mono"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm focus:border-blue-500/50 focus:outline-none transition-colors font-mono"
            >
              <option value="">Todos os status</option>
              <option value="APROVADO">Aprovado</option>
              <option value="ATENÇÃO">Atenção</option>
              <option value="REPROVADO">Reprovado</option>
            </select>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm focus:border-blue-500/50 focus:outline-none transition-colors font-mono"
            />
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm focus:border-blue-500/50 focus:outline-none transition-colors font-mono"
            />
            <input
              type="number"
              placeholder="Overcharge mín. (R$)"
              value={minOvercharge}
              onChange={(e) => setMinOvercharge(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm placeholder-text-secondary/50 focus:border-blue-500/50 focus:outline-none transition-colors font-mono"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["CT-e", "Transportadora", "Data", "Valor Total", "Overcharge", "Status", "Auditado em"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-mono text-text-secondary uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(7)].map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-border/30 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-text-secondary text-xs font-mono"
                    >
                      Nenhum resultado encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border/50 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-text-primary whitespace-nowrap">
                        {item.cte_numero}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary max-w-[180px] truncate">
                        {item.cte_emitente || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-text-secondary whitespace-nowrap">
                        {item.cte_data || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-text-primary whitespace-nowrap">
                        {fmtBRL(item.valor_total)}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono whitespace-nowrap">
                        <span
                          className={
                            item.total_overcharge > 0
                              ? "text-red-500"
                              : "text-text-secondary"
                          }
                        >
                          {item.total_overcharge > 0
                            ? fmtBRL(item.total_overcharge)
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status as AuditStatus} />
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-text-secondary whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-text-secondary text-xs font-mono">
                Página {page} de {pages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded border border-border text-text-secondary hover:text-text-primary hover:border-blue-500/30 disabled:opacity-40 transition-all"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="p-1.5 rounded border border-border text-text-secondary hover:text-text-primary hover:border-blue-500/30 disabled:opacity-40 transition-all"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
