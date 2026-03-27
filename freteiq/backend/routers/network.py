"""
Router de Malha de Transportes (Network Analytics).

Endpoints:
  POST /network/shipments            - Cadastro individual de embarque
  POST /network/shipments/csv        - Importação em lote via CSV
  POST /network/shipments/demo       - Seed de dados demo
  GET  /network/shipments            - Listagem de embarques
  GET  /network/lanes                - Métricas por lane
  GET  /network/summary              - Visão geral da malha
  POST /network/scenarios            - Criar e simular cenário
  GET  /network/scenarios            - Listar cenários salvos
  DELETE /network/scenarios/{id}     - Excluir cenário
  POST /network/report               - Gerar relatório IA
  GET  /network/report/latest        - Último relatório gerado
"""
from fastapi import APIRouter, Header, HTTPException, UploadFile, File
from typing import Optional, List
import csv
import io
from datetime import date, timedelta, datetime
import random

from models.shipment import ShipmentCreate, ScenarioCreate
from services.network_analytics import compute_lane_metrics, compute_network_summary
from services.network_simulator import run_simulation
from services.ai_module import generate_malha_report
from database import get_supabase, get_user_id_from_token

router = APIRouter(prefix="/network", tags=["network"])


def _auth(authorization: Optional[str]):
    token = None
    company_id = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        company_id = get_user_id_from_token(token)
    return token, company_id


# ── Shipments ─────────────────────────────────────────────────────────────────

@router.post("/shipments", status_code=201)
async def create_shipment(
    payload: ShipmentCreate,
    authorization: Optional[str] = Header(None),
):
    """Cadastra um embarque manualmente."""
    token, company_id = _auth(authorization)
    if not company_id:
        raise HTTPException(status_code=401, detail="Autenticação necessária.")

    supabase = get_supabase(token)

    # Auto-calcular custo_por_kg se não informado
    cpk = payload.custo_por_kg
    if cpk is None and payload.peso_kg and payload.peso_kg > 0:
        cpk = payload.custo_total / payload.peso_kg

    # Auto-calcular no_prazo
    no_prazo = payload.no_prazo
    if no_prazo is None and payload.lead_time_realizado and payload.lead_time_prometido:
        no_prazo = payload.lead_time_realizado <= payload.lead_time_prometido

    data = payload.model_dump()
    data["company_id"] = company_id
    data["custo_por_kg"] = cpk
    data["no_prazo"] = no_prazo
    data["data_coleta"] = str(payload.data_coleta)
    if payload.data_entrega:
        data["data_entrega"] = str(payload.data_entrega)

    res = supabase.table("shipments").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Erro ao salvar embarque.")
    return res.data[0]


@router.post("/shipments/csv", status_code=201)
async def import_shipments_csv(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    """
    Importação em lote via CSV.

    Colunas esperadas (header na primeira linha):
    origem, destino, transportadora, modalidade, data_coleta, data_entrega,
    lead_time_realizado, lead_time_prometido, peso_kg, custo_total, status_entrega
    """
    token, company_id = _auth(authorization)
    if not company_id:
        raise HTTPException(status_code=401, detail="Autenticação necessária.")

    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Apenas arquivos .csv são aceitos.")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Limite: 10 MB.")

    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))

    rows = []
    errors = []
    for i, row in enumerate(reader, 2):
        try:
            origem = row.get("origem", "").strip()
            destino = row.get("destino", "").strip()
            transportadora = row.get("transportadora", "").strip()
            if not origem or not destino or not transportadora:
                errors.append(f"Linha {i}: origem, destino e transportadora são obrigatórios.")
                continue

            custo_str = row.get("custo_total", "0").strip().replace(",", ".")
            custo_total = float(custo_str) if custo_str else 0.0

            peso_str = row.get("peso_kg", "").strip().replace(",", ".")
            peso_kg = float(peso_str) if peso_str else None

            ltr_str = row.get("lead_time_realizado", "").strip()
            lead_time_realizado = int(ltr_str) if ltr_str.isdigit() else None

            ltp_str = row.get("lead_time_prometido", "").strip()
            lead_time_prometido = int(ltp_str) if ltp_str.isdigit() else None

            no_prazo = None
            if lead_time_realizado and lead_time_prometido:
                no_prazo = lead_time_realizado <= lead_time_prometido

            cpk = None
            if peso_kg and peso_kg > 0 and custo_total > 0:
                cpk = custo_total / peso_kg

            rows.append({
                "company_id": company_id,
                "origem": origem,
                "destino": destino,
                "transportadora": transportadora,
                "modalidade": row.get("modalidade", "LTL").strip() or "LTL",
                "data_coleta": row.get("data_coleta", "").strip() or str(date.today()),
                "data_entrega": row.get("data_entrega", "").strip() or None,
                "lead_time_realizado": lead_time_realizado,
                "lead_time_prometido": lead_time_prometido,
                "no_prazo": no_prazo,
                "peso_kg": peso_kg,
                "custo_total": custo_total,
                "custo_por_kg": cpk,
                "status_entrega": row.get("status_entrega", "entregue").strip() or "entregue",
                "fonte": "csv",
            })
        except Exception as e:
            errors.append(f"Linha {i}: {e}")

    if not rows:
        raise HTTPException(
            status_code=422,
            detail=f"Nenhuma linha válida encontrada. Erros: {errors[:5]}",
        )

    supabase = get_supabase(token)
    # Inserir em chunks de 500
    inserted = 0
    for i in range(0, len(rows), 500):
        chunk = rows[i:i + 500]
        res = supabase.table("shipments").insert(chunk).execute()
        inserted += len(res.data or [])

    return {
        "success": True,
        "inserted": inserted,
        "errors": errors[:20],
        "total_rows": len(rows) + len(errors),
    }


@router.post("/shipments/demo", status_code=201)
async def seed_demo_shipments(authorization: Optional[str] = Header(None)):
    """Popula dados de demonstração realistas para visualização da malha."""
    token, company_id = _auth(authorization)
    if not company_id:
        raise HTTPException(status_code=401, detail="Autenticação necessária.")

    supabase = get_supabase(token)

    # Verificar se já há dados
    existing = supabase.table("shipments").select("id", count="exact").eq("company_id", company_id).execute()
    if existing.count and existing.count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Já existem {existing.count} embarques cadastrados. Exclua antes de recarregar o demo."
        )

    lanes_config = [
        # (origem, destino, transportadora, modal, lt_prom, custo_base, custo_std, peso_base, taxa_pontualidade)
        ("São Paulo/SP", "Rio de Janeiro/RJ", "Rapidão Cometa", "LTL", 2, 1200, 150, 500, 0.88),
        ("São Paulo/SP", "Belo Horizonte/MG", "Jamef", "LTL", 2, 950, 100, 420, 0.92),
        ("São Paulo/SP", "Curitiba/PR", "TNT Mercúrio", "TL", 1, 2400, 300, 1200, 0.95),
        ("São Paulo/SP", "Porto Alegre/RS", "Tegma", "TL", 2, 3100, 400, 1400, 0.78),
        ("São Paulo/SP", "Salvador/BA", "Rodonaves", "LTL", 5, 2800, 350, 600, 0.65),
        ("São Paulo/SP", "Recife/PE", "Braspress", "LTL", 6, 3200, 500, 550, 0.58),
        ("São Paulo/SP", "Fortaleza/CE", "Correios Cargo", "LTL", 7, 3600, 600, 500, 0.52),
        ("São Paulo/SP", "Manaus/AM", "Azul Cargo", "Direto", 5, 5200, 800, 300, 0.71),
        ("Campinas/SP", "Rio de Janeiro/RJ", "Rapidão Cometa", "LTL", 2, 1100, 130, 450, 0.85),
        ("Rio de Janeiro/RJ", "Belo Horizonte/MG", "Jamef", "LTL", 1, 800, 90, 380, 0.93),
        ("Curitiba/PR", "São Paulo/SP", "TNT Mercúrio", "TL", 1, 2300, 280, 1100, 0.96),
        ("Porto Alegre/RS", "São Paulo/SP", "Tegma", "TL", 2, 3000, 380, 1350, 0.80),
    ]

    today = date.today()
    shipments = []
    random.seed(42)

    for (origem, destino, transp, modal, lt_prom, custo_base, custo_std, peso_base, taxa_pont) in lanes_config:
        n = random.randint(18, 35)
        for j in range(n):
            data_coleta = today - timedelta(days=random.randint(1, 180))
            lt_real = max(1, int(lt_prom + random.gauss(0.5 * (1 - taxa_pont) * 3, 1.0)))
            no_prazo = lt_real <= lt_prom
            data_entrega = data_coleta + timedelta(days=lt_real)
            peso = max(50, peso_base + random.gauss(0, peso_base * 0.15))
            custo = max(200, custo_base + random.gauss(0, custo_std))
            cpk = custo / peso

            status = "entregue"
            if not no_prazo:
                status = random.choice(["entregue", "atrasado", "atrasado"])
            if random.random() < 0.02:
                status = "avariado"

            shipments.append({
                "company_id": company_id,
                "origem": origem,
                "destino": destino,
                "transportadora": transp,
                "modalidade": modal,
                "data_coleta": str(data_coleta),
                "data_entrega": str(data_entrega),
                "lead_time_realizado": lt_real,
                "lead_time_prometido": lt_prom,
                "no_prazo": no_prazo,
                "peso_kg": round(peso, 2),
                "custo_total": round(custo, 2),
                "custo_por_kg": round(cpk, 4),
                "status_entrega": status,
                "fonte": "manual",
            })

    # Inserir em chunks
    for i in range(0, len(shipments), 200):
        supabase.table("shipments").insert(shipments[i:i + 200]).execute()

    return {"success": True, "inserted": len(shipments)}


@router.get("/shipments")
async def list_shipments(
    limit: int = 100,
    offset: int = 0,
    origem: Optional[str] = None,
    destino: Optional[str] = None,
    transportadora: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    token, company_id = _auth(authorization)
    if not company_id:
        raise HTTPException(status_code=401, detail="Autenticação necessária.")

    supabase = get_supabase(token)
    q = supabase.table("shipments").select("*").eq("company_id", company_id)
    if origem:
        q = q.eq("origem", origem)
    if destino:
        q = q.eq("destino", destino)
    if transportadora:
        q = q.eq("transportadora", transportadora)

    res = q.order("data_coleta", desc=True).range(offset, offset + limit - 1).execute()
    return {"data": res.data or [], "total": len(res.data or [])}


# ── Analytics ─────────────────────────────────────────────────────────────────

@router.get("/lanes")
async def get_lanes(
    authorization: Optional[str] = Header(None),
):
    """Retorna métricas por lane ordenadas por score (piores primeiro)."""
    token, company_id = _auth(authorization)
    if not company_id:
        raise HTTPException(status_code=401, detail="Autenticação necessária.")

    supabase = get_supabase(token)
    res = supabase.table("shipments").select("*").eq("company_id", company_id).execute()
    raw = res.data or []

    lanes = compute_lane_metrics(raw)
    return {"lanes": [l.model_dump() for l in lanes]}


@router.get("/summary")
async def get_network_summary(authorization: Optional[str] = Header(None)):
    """Retorna KPIs consolidados da malha."""
    token, company_id = _auth(authorization)
    if not company_id:
        raise HTTPException(status_code=401, detail="Autenticação necessária.")

    supabase = get_supabase(token)
    res = supabase.table("shipments").select("*").eq("company_id", company_id).execute()
    raw = res.data or []

    lanes = compute_lane_metrics(raw)
    summary = compute_network_summary(lanes, raw)
    return summary.model_dump()


# ── Cenários ──────────────────────────────────────────────────────────────────

@router.post("/scenarios", status_code=201)
async def create_scenario(
    payload: ScenarioCreate,
    authorization: Optional[str] = Header(None),
):
    """Cria e simula um cenário de otimização."""
    token, company_id = _auth(authorization)
    if not company_id:
        raise HTTPException(status_code=401, detail="Autenticação necessária.")

    supabase = get_supabase(token)

    # Buscar embarques para simulação
    res = supabase.table("shipments").select("*").eq("company_id", company_id).execute()
    raw = res.data or []

    try:
        result = run_simulation(payload.tipo, payload.parametros, raw)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    result.cenario_id = None  # será preenchido após salvar
    result_dict = result.model_dump()

    # Salvar cenário
    cenario_data = {
        "company_id": company_id,
        "nome": payload.nome,
        "descricao": payload.descricao,
        "tipo": payload.tipo,
        "parametros": payload.parametros,
        "resultado": result_dict,
        "economia_estimada": result.economia_estimada,
        "status": "simulado",
    }
    saved = supabase.table("network_scenarios").insert(cenario_data).execute()
    cenario_id = saved.data[0]["id"] if saved.data else None

    result.cenario_id = cenario_id
    return result.model_dump()


@router.get("/scenarios")
async def list_scenarios(authorization: Optional[str] = Header(None)):
    token, company_id = _auth(authorization)
    if not company_id:
        raise HTTPException(status_code=401, detail="Autenticação necessária.")

    supabase = get_supabase(token)
    res = (
        supabase.table("network_scenarios")
        .select("*")
        .eq("company_id", company_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"data": res.data or []}


@router.delete("/scenarios/{scenario_id}", status_code=204)
async def delete_scenario(
    scenario_id: str,
    authorization: Optional[str] = Header(None),
):
    token, company_id = _auth(authorization)
    if not company_id:
        raise HTTPException(status_code=401, detail="Autenticação necessária.")

    supabase = get_supabase(token)
    supabase.table("network_scenarios").delete().eq("id", scenario_id).eq("company_id", company_id).execute()


# ── Relatório IA ──────────────────────────────────────────────────────────────

@router.post("/report")
async def generate_report(authorization: Optional[str] = Header(None)):
    """Gera relatório estratégico da malha via IA (Claude)."""
    token, company_id = _auth(authorization)
    if not company_id:
        raise HTTPException(status_code=401, detail="Autenticação necessária.")

    supabase = get_supabase(token)

    res_s = supabase.table("shipments").select("*").eq("company_id", company_id).execute()
    raw = res_s.data or []

    if len(raw) < 5:
        raise HTTPException(
            status_code=422,
            detail="São necessários ao menos 5 embarques para gerar o relatório."
        )

    lanes = compute_lane_metrics(raw)
    summary = compute_network_summary(lanes, raw)

    res_c = supabase.table("network_scenarios").select("*").eq("company_id", company_id).execute()
    cenarios = res_c.data or []

    try:
        conteudo = generate_malha_report(
            summary=summary.model_dump(),
            lanes=[l.model_dump() for l in lanes],
            cenarios=cenarios,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {e}")

    # Salvar relatório
    report_data = {
        "company_id": company_id,
        "conteudo": conteudo,
        "metricas_snapshot": summary.model_dump(),
    }
    saved = supabase.table("network_reports").insert(report_data).execute()
    report_id = saved.data[0]["id"] if saved.data else None

    return {"id": report_id, "conteudo": conteudo}


@router.get("/report/latest")
async def get_latest_report(authorization: Optional[str] = Header(None)):
    """Retorna o último relatório gerado."""
    token, company_id = _auth(authorization)
    if not company_id:
        raise HTTPException(status_code=401, detail="Autenticação necessária.")

    supabase = get_supabase(token)
    res = (
        supabase.table("network_reports")
        .select("*")
        .eq("company_id", company_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not res.data:
        return {"report": None}
    return {"report": res.data[0]}
