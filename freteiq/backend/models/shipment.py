"""
Modelos de dados para o módulo de Malha (Network Analytics).
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date


class ShipmentCreate(BaseModel):
    origem: str
    destino: str
    uf_origem: Optional[str] = None
    uf_destino: Optional[str] = None
    transportadora: str
    cnpj_transportadora: Optional[str] = None
    modalidade: str = "LTL"
    data_coleta: date
    data_entrega: Optional[date] = None
    lead_time_realizado: Optional[int] = None
    lead_time_prometido: Optional[int] = None
    no_prazo: Optional[bool] = None
    peso_kg: Optional[float] = None
    valor_carga: Optional[float] = None
    custo_total: float
    custo_frete: Optional[float] = None
    custo_por_kg: Optional[float] = None
    status_entrega: str = "entregue"
    observacoes: Optional[str] = None
    fonte: str = "manual"


class Shipment(ShipmentCreate):
    id: str
    company_id: Optional[str] = None
    created_at: Optional[str] = None


class ShipmentCsvRow(BaseModel):
    """Schema para importação via CSV."""
    origem: str
    destino: str
    transportadora: str
    modalidade: str = "LTL"
    data_coleta: str       # YYYY-MM-DD
    data_entrega: Optional[str] = None
    lead_time_realizado: Optional[int] = None
    lead_time_prometido: Optional[int] = None
    no_prazo: Optional[str] = None    # "sim"/"nao" ou "true"/"false"
    peso_kg: Optional[float] = None
    custo_total: float
    status_entrega: str = "entregue"


# ── Lane Analytics ────────────────────────────────────────────────────────────

class LaneMetrics(BaseModel):
    """Métricas agregadas de uma lane (rota + transportadora)."""
    lane_id: str            # hash de origem|destino|transportadora
    origem: str
    destino: str
    transportadora: str
    modalidade: str

    # Volume
    total_embarques: int
    periodo_inicio: Optional[str] = None
    periodo_fim: Optional[str] = None

    # Custo
    custo_total: float
    custo_medio_por_embarque: float
    custo_medio_por_kg: Optional[float] = None

    # Lead Time
    lead_time_medio: Optional[float] = None        # dias
    lead_time_prometido_medio: Optional[float] = None
    lead_time_desvio: Optional[float] = None       # desvio padrão (variabilidade)
    atraso_medio_dias: Optional[float] = None

    # Qualidade
    taxa_pontualidade: Optional[float] = None      # 0.0–1.0
    taxa_avarias: Optional[float] = None

    # Score composto (0–100, maior = melhor lane)
    lane_score: float
    classificacao: str     # "critica" | "atencao" | "boa" | "otima"


class NetworkSummary(BaseModel):
    """Visão geral da malha."""
    total_embarques: int
    total_lanes: int
    total_transportadoras: int
    custo_total: float
    taxa_pontualidade_geral: Optional[float] = None
    lanes_criticas: int    # score < 40
    lanes_atencao: int     # score 40-65
    lanes_boas: int        # score > 65
    economia_potencial: float   # estimativa de saving com otimizações


# ── Cenários ──────────────────────────────────────────────────────────────────

class ScenarioCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    tipo: str   # troca_transportadora | mudanca_frequencia | consolidacao_lanes | milk_run | cross_dock
    parametros: dict


class ScenarioResult(BaseModel):
    cenario_id: Optional[str] = None
    nome: str
    tipo: str
    custo_atual: float
    custo_projetado: float
    economia_estimada: float
    economia_percentual: float
    lead_time_atual: Optional[float] = None
    lead_time_projetado: Optional[float] = None
    detalhes: dict
    recomendacao: str


class Scenario(BaseModel):
    id: str
    nome: str
    descricao: Optional[str] = None
    tipo: str
    parametros: dict
    resultado: Optional[dict] = None
    economia_estimada: Optional[float] = None
    status: str
    created_at: Optional[str] = None


# ── Relatório ─────────────────────────────────────────────────────────────────

class NetworkReport(BaseModel):
    id: str
    periodo_inicio: Optional[str] = None
    periodo_fim: Optional[str] = None
    conteudo: str
    created_at: Optional[str] = None
