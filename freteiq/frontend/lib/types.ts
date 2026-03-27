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

// ── Network / Malha ───────────────────────────────────────────────────────────

export type LaneClassificacao = "critica" | "atencao" | "boa" | "otima";

export interface LaneMetrics {
  lane_id: string;
  origem: string;
  destino: string;
  transportadora: string;
  modalidade: string;
  total_embarques: number;
  periodo_inicio?: string;
  periodo_fim?: string;
  custo_total: number;
  custo_medio_por_embarque: number;
  custo_medio_por_kg?: number;
  lead_time_medio?: number;
  lead_time_prometido_medio?: number;
  lead_time_desvio?: number;
  atraso_medio_dias?: number;
  taxa_pontualidade?: number;
  taxa_avarias?: number;
  lane_score: number;
  classificacao: LaneClassificacao;
}

export interface NetworkSummary {
  total_embarques: number;
  total_lanes: number;
  total_transportadoras: number;
  custo_total: number;
  taxa_pontualidade_geral?: number;
  lanes_criticas: number;
  lanes_atencao: number;
  lanes_boas: number;
  economia_potencial: number;
}

export type ScenarioTipo =
  | "troca_transportadora"
  | "mudanca_frequencia"
  | "consolidacao_lanes"
  | "milk_run"
  | "cross_dock";

export interface ScenarioResult {
  cenario_id?: string;
  nome: string;
  tipo: ScenarioTipo;
  custo_atual: number;
  custo_projetado: number;
  economia_estimada: number;
  economia_percentual: number;
  lead_time_atual?: number;
  lead_time_projetado?: number;
  detalhes: Record<string, unknown>;
  recomendacao: string;
}

export interface SavedScenario {
  id: string;
  nome: string;
  descricao?: string;
  tipo: ScenarioTipo;
  parametros: Record<string, unknown>;
  resultado?: ScenarioResult;
  economia_estimada?: number;
  status: string;
  created_at: string;
}

export interface NetworkReport {
  id: string;
  periodo_inicio?: string;
  periodo_fim?: string;
  conteudo: string;
  metricas_snapshot?: NetworkSummary;
  created_at: string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

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
