from fastapi import APIRouter, Header, Query
from typing import Optional
import csv
import io
from fastapi.responses import StreamingResponse

from database import get_supabase

router = APIRouter(prefix="/history", tags=["history"])


def _auth_token(authorization: Optional[str]) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ", 1)[1]
    return None


@router.get("/")
async def list_history(
    authorization: Optional[str] = Header(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    transportadora: Optional[str] = None,
    status: Optional[str] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    min_overcharge: Optional[float] = None,
):
    token = _auth_token(authorization)
    supabase = get_supabase(token)

    offset = (page - 1) * limit
    query = (
        supabase.table("audit_results")
        .select("id,cte_numero,cte_emitente,cte_data,valor_total,total_overcharge,status,created_at")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )

    if transportadora:
        query = query.ilike("cte_emitente", f"%{transportadora}%")
    if status:
        query = query.eq("status", status)
    if data_inicio:
        query = query.gte("cte_data", data_inicio)
    if data_fim:
        query = query.lte("cte_data", data_fim)
    if min_overcharge is not None:
        query = query.gte("total_overcharge", min_overcharge)

    result = query.execute()

    # Total count (approximate)
    count_query = supabase.table("audit_results").select("id", count="exact")
    if transportadora:
        count_query = count_query.ilike("cte_emitente", f"%{transportadora}%")
    if status:
        count_query = count_query.eq("status", status)
    count_result = count_query.execute()
    total = count_result.count or 0

    return {
        "data": result.data or [],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, (total + limit - 1) // limit),
    }


@router.get("/metrics")
async def get_metrics(authorization: Optional[str] = Header(None)):
    """Métricas para o dashboard."""
    token = _auth_token(authorization)
    supabase = get_supabase(token)

    result = supabase.table("audit_results").select(
        "status,total_overcharge,valor_total"
    ).execute()
    rows = result.data or []

    total_audited = len(rows)
    total_valor = sum(r.get("valor_total") or 0 for r in rows)
    total_overcharge = sum(r.get("total_overcharge") or 0 for r in rows)
    divergentes = sum(1 for r in rows if r.get("status") != "APROVADO")
    taxa_divergencia = (divergentes / total_audited * 100) if total_audited > 0 else 0

    # Status counts
    status_counts = {"APROVADO": 0, "ATENÇÃO": 0, "REPROVADO": 0}
    for r in rows:
        st = r.get("status", "APROVADO")
        if st in status_counts:
            status_counts[st] += 1

    # Overcharge por transportadora
    transportadora_map: dict = {}
    for r in rows:
        emt = r.get("cte_emitente") or "Desconhecida"
        oc = r.get("total_overcharge") or 0
        if emt not in transportadora_map:
            transportadora_map[emt] = 0
        transportadora_map[emt] += oc

    transportadora_ranking = sorted(
        [{"name": k, "overcharge": round(v, 2)} for k, v in transportadora_map.items()],
        key=lambda x: x["overcharge"],
        reverse=True,
    )[:10]

    return {
        "totalAuditados": total_audited,
        "taxaDivergencia": round(taxa_divergencia, 1),
        "totalRecuperavel": round(total_overcharge, 2),
        "volumeTotal": round(total_valor, 2),
        "statusCounts": status_counts,
        "transportadoraRanking": transportadora_ranking,
    }


@router.get("/export/csv")
async def export_csv(authorization: Optional[str] = Header(None)):
    """Exporta histórico completo em CSV."""
    token = _auth_token(authorization)
    supabase = get_supabase(token)

    result = supabase.table("audit_results").select(
        "cte_numero,cte_serie,cte_emitente,cte_cnpj,cte_data,valor_total,total_overcharge,status,created_at"
    ).order("created_at", desc=True).execute()

    rows = result.data or []

    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=["cte_numero", "cte_serie", "cte_emitente", "cte_cnpj",
                    "cte_data", "valor_total", "total_overcharge", "status", "created_at"],
    )
    writer.writeheader()
    writer.writerows(rows)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=freteiq_historico.csv"},
    )
