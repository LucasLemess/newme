export type Severity = "high" | "medium" | "low";
export type AuditStatus = "APROVADO" | "ATENÇÃO" | "REPROVADO";

export interface Finding {
  id: string;
  tipo: string;
  severity: Severity;
  descricao: string;
  diferenca: number;
  fundamentacao: string;
}

export interface AuditResult {
  cteNumero: string;
  cteSerie?: string;
  cteChave?: string;
  cteEmitente?: string;
  cteCNPJ?: string;
  cteData?: string;
  valorTotal: number;
  totalOvercharge: number;
  status: AuditStatus;
  findings: Finding[];
  componentes?: {
    frete_base: number;
    icms: number;
    ad_valorem: number;
    pedagio: number;
    outros: number;
    desconto: number;
  };
}

export interface AuditResponse {
  success: boolean;
  auditId?: string;
  result?: AuditResult;
  error?: string;
}

export interface Contract {
  id: string;
  company_id: string;
  transportadora: string;
  cnpj_transportadora?: string;
  icms_rate?: number;
  freight_rate_per_kg?: number;
  ad_valorem_rate?: number;
  max_pedagio?: number;
  validade_inicio?: string;
  validade_fim?: string;
  observacoes?: string;
  created_at?: string;
}

export interface ContractCreate {
  transportadora: string;
  cnpj_transportadora?: string;
  icms_rate?: number;
  freight_rate_per_kg?: number;
  ad_valorem_rate?: number;
  max_pedagio?: number;
  validade_inicio?: string;
  validade_fim?: string;
  observacoes?: string;
}

export interface AuditHistoryItem {
  id: string;
  cte_numero: string;
  cte_emitente?: string;
  cte_data?: string;
  valor_total: number;
  total_overcharge: number;
  status: AuditStatus;
  created_at: string;
}

export interface DashboardMetrics {
  totalAuditados: number;
  taxaDivergencia: number;
  totalRecuperavel: number;
  volumeTotal: number;
  statusCounts: {
    APROVADO: number;
    "ATENÇÃO": number;
    REPROVADO: number;
  };
  transportadoraRanking: {
    name: string;
    overcharge: number;
  }[];
}
