import { getAuthToken } from "./supabase";
import type {
  AuditResponse,
  Contract,
  ContractCreate,
  DashboardMetrics,
  LaneMetrics,
  NetworkSummary,
  ScenarioResult,
  SavedScenario,
  NetworkReport,
} from "./types";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      message = err.detail || err.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

// ── Audit ────────────────────────────────────────────────────────────────────

export async function uploadCte(file: File): Promise<AuditResponse> {
  const headers = await authHeaders();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BACKEND_URL}/audit/upload`, {
    method: "POST",
    headers,
    body: form,
  });
  return handleResponse<AuditResponse>(res);
}

export async function runDemoAudit(): Promise<AuditResponse> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/audit/demo`, {
    method: "POST",
    headers,
  });
  return handleResponse<AuditResponse>(res);
}

export async function generateContestacao(auditId: string): Promise<string> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/audit/contestacao/${auditId}`, {
    method: "POST",
    headers,
  });
  const data = await handleResponse<{ success: boolean; contestacao?: string }>(res);
  return data.contestacao ?? "";
}

export async function generateAnalise(auditId: string): Promise<string> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/audit/analise/${auditId}`, {
    method: "POST",
    headers,
  });
  const data = await handleResponse<{ success: boolean; analise?: string }>(res);
  return data.analise ?? "";
}

// ── Contracts ────────────────────────────────────────────────────────────────

export async function listContracts(transportadora?: string): Promise<Contract[]> {
  const headers = await authHeaders();
  const params = transportadora
    ? `?transportadora=${encodeURIComponent(transportadora)}`
    : "";
  const res = await fetch(`${BACKEND_URL}/contracts/${params}`, { headers });
  return handleResponse<Contract[]>(res);
}

export async function createContract(data: ContractCreate): Promise<Contract> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/contracts/`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Contract>(res);
}

export async function updateContract(
  id: string,
  data: Partial<ContractCreate>
): Promise<Contract> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/contracts/${id}`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Contract>(res);
}

export async function deleteContract(id: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/contracts/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`HTTP ${res.status}`);
  }
}

// ── History / Metrics ────────────────────────────────────────────────────────

export interface HistoryParams {
  page?: number;
  limit?: number;
  transportadora?: string;
  status?: string;
  data_inicio?: string;
  data_fim?: string;
  min_overcharge?: number;
}

export async function getHistory(params: HistoryParams = {}) {
  const headers = await authHeaders();
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  const res = await fetch(`${BACKEND_URL}/history/?${q}`, { headers });
  return handleResponse<{
    data: unknown[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }>(res);
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/history/metrics`, { headers });
  return handleResponse<DashboardMetrics>(res);
}

export function getExportCsvUrl(): string {
  return `${BACKEND_URL}/history/export/csv`;
}

// ── Network / Malha ───────────────────────────────────────────────────────────

export async function getNetworkLanes(): Promise<LaneMetrics[]> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/network/lanes`, { headers });
  const data = await handleResponse<{ lanes: LaneMetrics[] }>(res);
  return data.lanes;
}

export async function getNetworkSummary(): Promise<NetworkSummary> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/network/summary`, { headers });
  return handleResponse<NetworkSummary>(res);
}

export async function seedDemoShipments(): Promise<{ success: boolean; inserted: number }> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/network/shipments/demo`, {
    method: "POST",
    headers,
  });
  return handleResponse<{ success: boolean; inserted: number }>(res);
}

export async function importShipmentsCsv(
  file: File
): Promise<{ success: boolean; inserted: number; errors: string[] }> {
  const headers = await authHeaders();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BACKEND_URL}/network/shipments/csv`, {
    method: "POST",
    headers,
    body: form,
  });
  return handleResponse<{ success: boolean; inserted: number; errors: string[] }>(res);
}

export async function createScenario(payload: {
  nome: string;
  descricao?: string;
  tipo: string;
  parametros: Record<string, unknown>;
}): Promise<ScenarioResult> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/network/scenarios`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<ScenarioResult>(res);
}

export async function listScenarios(): Promise<SavedScenario[]> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/network/scenarios`, { headers });
  const data = await handleResponse<{ data: SavedScenario[] }>(res);
  return data.data;
}

export async function deleteScenario(id: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/network/scenarios/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`HTTP ${res.status}`);
  }
}

export async function generateNetworkReport(): Promise<{ id: string; conteudo: string }> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/network/report`, {
    method: "POST",
    headers,
  });
  return handleResponse<{ id: string; conteudo: string }>(res);
}

export async function getLatestNetworkReport(): Promise<NetworkReport | null> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/network/report/latest`, { headers });
  const data = await handleResponse<{ report: NetworkReport | null }>(res);
  return data.report;
}
