from fastapi import APIRouter, UploadFile, File, HTTPException, Header, Depends
from typing import Optional
import json
from datetime import date

from models.audit_result import AuditResponse, ContestacaoResponse, AnaliseResponse
from services.cte_parser import parse_cte_xml, get_demo_cte
from services.audit_engine import audit_cte
from services.ai_module import generate_contestacao, generate_analise_estrategica
from database import get_supabase, get_user_id_from_token

router = APIRouter(prefix="/audit", tags=["audit"])


def _get_active_contract(supabase, cnpj_transportadora: str) -> Optional[dict]:
    """Busca contrato ativo para o CNPJ da transportadora."""
    today = str(date.today())
    try:
        result = (
            supabase.table("contracts")
            .select("*")
            .eq("cnpj_transportadora", cnpj_transportadora)
            .lte("validade_inicio", today)
            .gte("validade_fim", today)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]
    except Exception:
        pass
    return None


def _save_audit_result(supabase, result, xml_raw: str = "", company_id: Optional[str] = None) -> Optional[str]:
    """Salva resultado de auditoria no banco."""
    try:
        data = {
            "cte_numero": result.cteNumero,
            "cte_serie": result.cteSerie,
            "cte_chave": result.cteChave,
            "cte_emitente": result.cteEmitente,
            "cte_cnpj": result.cteCNPJ,
            "cte_data": result.cteData,
            "valor_total": result.valorTotal,
            "total_overcharge": result.totalOvercharge,
            "status": result.status,
            "findings": [f.model_dump() for f in result.findings],
            "xml_raw": xml_raw[:50000] if xml_raw else "",  # limita tamanho
        }
        if company_id:
            data["company_id"] = company_id
        res = supabase.table("audit_results").insert(data).execute()
        if res.data:
            return res.data[0]["id"]
    except Exception as e:
        print(f"Erro ao salvar auditoria: {e}")
    return None


@router.post("/upload", response_model=AuditResponse)
async def upload_cte(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    """Upload e auditoria de XML CT-e."""
    if not file.filename or not file.filename.endswith(".xml"):
        raise HTTPException(status_code=400, detail="Apenas arquivos .xml são aceitos.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5 MB
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Limite: 5 MB.")

    try:
        cte = parse_cte_xml(content)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Erro ao parsear CT-e: {e}")

    # Buscar contrato
    contract = None
    token = None
    company_id = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        company_id = get_user_id_from_token(token)

    supabase = get_supabase(token)

    if cte.cnpj:
        contract = _get_active_contract(supabase, cte.cnpj)

    result = audit_cte(cte, contract)
    audit_id = _save_audit_result(supabase, result, content.decode("utf-8", errors="replace"), company_id)

    return AuditResponse(success=True, auditId=audit_id, result=result)


@router.post("/demo", response_model=AuditResponse)
async def audit_demo(authorization: Optional[str] = Header(None)):
    """Auditoria de demonstração com CT-e de exemplo."""
    cte = get_demo_cte()

    # Contrato demo com valores propositalmente menores para gerar findings
    demo_contract = {
        "icms_rate": 12.0,           # CT-e cobra 15%
        "freight_rate_per_kg": 5.00, # CT-e cobra ~5.38/kg
        "ad_valorem_rate": 0.003,    # 0.3% — CT-e cobra 0.5%
        "max_pedagio": 60.00,        # CT-e cobra 88
    }

    result = audit_cte(cte, demo_contract)

    token = None
    company_id = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        company_id = get_user_id_from_token(token)
    supabase = get_supabase(token)
    audit_id = _save_audit_result(supabase, result, company_id=company_id)

    return AuditResponse(success=True, auditId=audit_id, result=result)


@router.post("/contestacao/{audit_id}", response_model=ContestacaoResponse)
async def gerar_contestacao(
    audit_id: str,
    authorization: Optional[str] = Header(None),
):
    """Gera carta de contestação para auditoria usando IA."""
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]

    supabase = get_supabase(token)

    try:
        res = supabase.table("audit_results").select("*").eq("id", audit_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Auditoria não encontrada.")
    except Exception:
        raise HTTPException(status_code=404, detail="Auditoria não encontrada.")

    data = res.data
    from models.audit_result import AuditResult, Finding

    findings_raw = data.get("findings") or []
    findings = [Finding(**f) for f in findings_raw]

    audit_result = AuditResult(
        cteNumero=data.get("cte_numero", ""),
        cteSerie=data.get("cte_serie"),
        cteChave=data.get("cte_chave"),
        cteEmitente=data.get("cte_emitente"),
        cteCNPJ=data.get("cte_cnpj"),
        cteData=data.get("cte_data"),
        valorTotal=float(data.get("valor_total") or 0),
        totalOvercharge=float(data.get("total_overcharge") or 0),
        status=data.get("status", "ATENÇÃO"),
        findings=findings,
    )

    try:
        contestacao = generate_contestacao(audit_result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar contestação: {e}")

    # Salvar contestação
    try:
        supabase.table("audit_results").update(
            {"contestacao_gerada": contestacao}
        ).eq("id", audit_id).execute()
    except Exception:
        pass

    return ContestacaoResponse(success=True, contestacao=contestacao)


@router.post("/analise/{audit_id}", response_model=AnaliseResponse)
async def gerar_analise(
    audit_id: str,
    authorization: Optional[str] = Header(None),
):
    """Gera análise estratégica da transportadora usando IA."""
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]

    supabase = get_supabase(token)

    try:
        res = supabase.table("audit_results").select("*").eq("id", audit_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Auditoria não encontrada.")
    except Exception:
        raise HTTPException(status_code=404, detail="Auditoria não encontrada.")

    data = res.data
    from models.audit_result import AuditResult, Finding

    findings_raw = data.get("findings") or []
    findings = [Finding(**f) for f in findings_raw]

    audit_result = AuditResult(
        cteNumero=data.get("cte_numero", ""),
        cteSerie=data.get("cte_serie"),
        cteChave=data.get("cte_chave"),
        cteEmitente=data.get("cte_emitente"),
        cteCNPJ=data.get("cte_cnpj"),
        cteData=data.get("cte_data"),
        valorTotal=float(data.get("valor_total") or 0),
        totalOvercharge=float(data.get("total_overcharge") or 0),
        status=data.get("status", "ATENÇÃO"),
        findings=findings,
    )

    try:
        analise = generate_analise_estrategica(audit_result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar análise: {e}")

    try:
        supabase.table("audit_results").update(
            {"analise_estrategica": analise}
        ).eq("id", audit_id).execute()
    except Exception:
        pass

    return AnaliseResponse(success=True, analise=analise)
