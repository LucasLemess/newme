from pydantic import BaseModel
from typing import Optional
from datetime import date


class CTeData(BaseModel):
    nCT: str
    serie: Optional[str] = None
    chaveAcesso: Optional[str] = None
    dhEmi: Optional[str] = None
    cteData: Optional[date] = None
    # Emitente
    xNome: Optional[str] = None
    cnpj: Optional[str] = None
    # Valores da prestação
    vTPrest: Optional[float] = None
    vRec: Optional[float] = None
    vICMS: Optional[float] = None
    pICMS: Optional[float] = None
    vBC: Optional[float] = None
    # Componentes do frete
    vFrete: Optional[float] = None
    vOutros: Optional[float] = None
    vDesc: Optional[float] = None
    vAdValorem: Optional[float] = None
    vPedagio: Optional[float] = None
    vCarga: Optional[float] = None
    # Carga
    qCarga: Optional[float] = None
    qCargaAfer: Optional[float] = None
    # Nat. operação
    natOp: Optional[str] = None
    # Destino/Origem (UFs para ICMS)
    cUFOrig: Optional[str] = None
    cUFDest: Optional[str] = None
