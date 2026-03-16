from pydantic import BaseModel
from typing import Optional
from datetime import date


class ContractCreate(BaseModel):
    transportadora: str
    cnpj_transportadora: Optional[str] = None
    icms_rate: Optional[float] = None
    freight_rate_per_kg: Optional[float] = None
    ad_valorem_rate: Optional[float] = None
    max_pedagio: Optional[float] = None
    validade_inicio: Optional[date] = None
    validade_fim: Optional[date] = None
    observacoes: Optional[str] = None


class ContractUpdate(BaseModel):
    transportadora: Optional[str] = None
    cnpj_transportadora: Optional[str] = None
    icms_rate: Optional[float] = None
    freight_rate_per_kg: Optional[float] = None
    ad_valorem_rate: Optional[float] = None
    max_pedagio: Optional[float] = None
    validade_inicio: Optional[date] = None
    validade_fim: Optional[date] = None
    observacoes: Optional[str] = None


class Contract(BaseModel):
    id: str
    company_id: str
    transportadora: str
    cnpj_transportadora: Optional[str] = None
    icms_rate: Optional[float] = None
    freight_rate_per_kg: Optional[float] = None
    ad_valorem_rate: Optional[float] = None
    max_pedagio: Optional[float] = None
    validade_inicio: Optional[date] = None
    validade_fim: Optional[date] = None
    observacoes: Optional[str] = None
    created_at: Optional[str] = None
