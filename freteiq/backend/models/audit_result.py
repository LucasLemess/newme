from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import date


class Finding(BaseModel):
    id: str
    tipo: str
    severity: Literal["high", "medium", "low"]
    descricao: str
    diferenca: float
    fundamentacao: str


class AuditResult(BaseModel):
    cteNumero: str
    cteSerie: Optional[str] = None
    cteChave: Optional[str] = None
    cteEmitente: Optional[str] = None
    cteCNPJ: Optional[str] = None
    cteData: Optional[str] = None
    valorTotal: float
    totalOvercharge: float
    status: Literal["APROVADO", "ATENÇÃO", "REPROVADO"]
    findings: List[Finding]
    # Componentes do frete para exibição
    componentes: Optional[dict] = None


class AuditResponse(BaseModel):
    success: bool
    auditId: Optional[str] = None
    result: Optional[AuditResult] = None
    error: Optional[str] = None


class ContestacaoRequest(BaseModel):
    auditId: str


class ContestacaoResponse(BaseModel):
    success: bool
    contestacao: Optional[str] = None
    error: Optional[str] = None


class AnaliseRequest(BaseModel):
    auditId: str


class AnaliseResponse(BaseModel):
    success: bool
    analise: Optional[str] = None
    error: Optional[str] = None
