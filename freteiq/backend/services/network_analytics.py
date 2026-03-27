"""
Engine de Analytics de Malha de Transportes.

Agrega histórico de embarques por lane (origem → destino + transportadora)
e calcula métricas de desempenho: custo, lead time, pontualidade, variabilidade.
Gera um lane_score composto e classifica lanes em: otima, boa, atencao, critica.
"""
from typing import List, Optional
import math
import hashlib

from models.shipment import LaneMetrics, NetworkSummary


def _lane_id(origem: str, destino: str, transportadora: str) -> str:
    key = f"{origem.lower()}|{destino.lower()}|{transportadora.lower()}"
    return hashlib.md5(key.encode()).hexdigest()[:12]


def _safe_mean(values: List[float]) -> Optional[float]:
    vals = [v for v in values if v is not None]
    return sum(vals) / len(vals) if vals else None


def _safe_std(values: List[float]) -> Optional[float]:
    vals = [v for v in values if v is not None]
    if len(vals) < 2:
        return None
    mean = sum(vals) / len(vals)
    variance = sum((v - mean) ** 2 for v in vals) / len(vals)
    return math.sqrt(variance)


def _compute_lane_score(
    taxa_pontualidade: Optional[float],
    custo_por_kg: Optional[float],
    lead_time_desvio: Optional[float],
    all_costs: List[float],
) -> float:
    """
    Score de 0 a 100 (maior = melhor lane).

    Pesos:
    - Pontualidade: 40%
    - Custo relativo: 40%  (normalizado entre lanes)
    - Previsibilidade (1/std): 20%
    """
    # Pontualidade (0.0 → 1.0)
    score_pontualidade = (taxa_pontualidade or 0.5) * 100

    # Custo relativo: quanto menor o custo_por_kg vs. média geral, melhor
    if custo_por_kg is not None and all_costs:
        avg_cost = sum(all_costs) / len(all_costs)
        if avg_cost > 0:
            ratio = custo_por_kg / avg_cost
            # ratio=0.5 → score=85; ratio=1.0 → score=50; ratio=2.0 → score=15
            score_custo = max(0.0, min(100.0, 100 * (1 - (ratio - 0.5) * 0.7)))
        else:
            score_custo = 50.0
    else:
        score_custo = 50.0

    # Previsibilidade: baixo desvio padrão = mais previsível
    if lead_time_desvio is not None:
        # desvio=0 → score=100; desvio=5 → score=50; desvio≥10 → score≈0
        score_prev = max(0.0, 100 * math.exp(-lead_time_desvio / 7))
    else:
        score_prev = 50.0

    return round(0.40 * score_pontualidade + 0.40 * score_custo + 0.20 * score_prev, 1)


def _classify(score: float) -> str:
    if score >= 70:
        return "otima"
    elif score >= 50:
        return "boa"
    elif score >= 30:
        return "atencao"
    return "critica"


def compute_lane_metrics(raw_shipments: List[dict]) -> List[LaneMetrics]:
    """
    Recebe lista de shipments (dicts do Supabase) e retorna métricas por lane.
    """
    if not raw_shipments:
        return []

    # Agrupar por lane
    groups: dict = {}
    for s in raw_shipments:
        key = (
            s.get("origem", ""),
            s.get("destino", ""),
            s.get("transportadora", ""),
        )
        groups.setdefault(key, []).append(s)

    # Coletar todos os custo_por_kg para normalização
    all_cpk: List[float] = []
    for shipments in groups.values():
        for s in shipments:
            cpk = s.get("custo_por_kg")
            if cpk is None and s.get("peso_kg") and s.get("custo_total"):
                try:
                    cpk = float(s["custo_total"]) / float(s["peso_kg"])
                except Exception:
                    cpk = None
            if cpk is not None:
                all_cpk.append(float(cpk))

    lanes: List[LaneMetrics] = []
    for (origem, destino, transportadora), shipments in groups.items():
        n = len(shipments)

        # Custo
        custos = [float(s["custo_total"]) for s in shipments if s.get("custo_total") is not None]
        custo_total = sum(custos)
        custo_medio = custo_total / n if n else 0

        cpk_vals: List[float] = []
        for s in shipments:
            cpk = s.get("custo_por_kg")
            if cpk is None and s.get("peso_kg") and s.get("custo_total"):
                try:
                    cpk = float(s["custo_total"]) / float(s["peso_kg"])
                except Exception:
                    cpk = None
            if cpk is not None:
                cpk_vals.append(float(cpk))
        custo_medio_por_kg = _safe_mean(cpk_vals)

        # Lead time
        ltr_vals = [float(s["lead_time_realizado"]) for s in shipments if s.get("lead_time_realizado") is not None]
        ltp_vals = [float(s["lead_time_prometido"]) for s in shipments if s.get("lead_time_prometido") is not None]
        lt_medio = _safe_mean(ltr_vals)
        lt_prom_medio = _safe_mean(ltp_vals)
        lt_desvio = _safe_std(ltr_vals)

        # Atraso médio
        atraso_vals: List[float] = []
        for s in shipments:
            if s.get("lead_time_realizado") and s.get("lead_time_prometido"):
                atraso = float(s["lead_time_realizado"]) - float(s["lead_time_prometido"])
                if atraso > 0:
                    atraso_vals.append(atraso)
        atraso_medio = _safe_mean(atraso_vals) if atraso_vals else None

        # Pontualidade
        no_prazo_vals = [s.get("no_prazo") for s in shipments if s.get("no_prazo") is not None]
        taxa_pontualidade: Optional[float] = None
        if no_prazo_vals:
            taxa_pontualidade = sum(1 for v in no_prazo_vals if v is True) / len(no_prazo_vals)
        elif ltr_vals and ltp_vals:
            # Derivar de lead times se no_prazo não foi preenchido
            on_time = sum(
                1 for s in shipments
                if s.get("lead_time_realizado") and s.get("lead_time_prometido")
                and float(s["lead_time_realizado"]) <= float(s["lead_time_prometido"])
            )
            total_comparavel = sum(
                1 for s in shipments
                if s.get("lead_time_realizado") and s.get("lead_time_prometido")
            )
            if total_comparavel:
                taxa_pontualidade = on_time / total_comparavel

        # Avarias
        avarias = sum(1 for s in shipments if s.get("status_entrega") in ("avariado", "extraviado"))
        taxa_avarias = avarias / n if n else 0.0

        # Período
        datas = sorted(s["data_coleta"] for s in shipments if s.get("data_coleta"))

        # Score
        score = _compute_lane_score(taxa_pontualidade, custo_medio_por_kg, lt_desvio, all_cpk)

        # Modalidade mais comum
        modals = [s.get("modalidade", "LTL") for s in shipments]
        modalidade = max(set(modals), key=modals.count) if modals else "LTL"

        lanes.append(LaneMetrics(
            lane_id=_lane_id(origem, destino, transportadora),
            origem=origem,
            destino=destino,
            transportadora=transportadora,
            modalidade=modalidade,
            total_embarques=n,
            periodo_inicio=str(datas[0]) if datas else None,
            periodo_fim=str(datas[-1]) if datas else None,
            custo_total=round(custo_total, 2),
            custo_medio_por_embarque=round(custo_medio, 2),
            custo_medio_por_kg=round(custo_medio_por_kg, 4) if custo_medio_por_kg else None,
            lead_time_medio=round(lt_medio, 1) if lt_medio is not None else None,
            lead_time_prometido_medio=round(lt_prom_medio, 1) if lt_prom_medio is not None else None,
            lead_time_desvio=round(lt_desvio, 2) if lt_desvio is not None else None,
            atraso_medio_dias=round(atraso_medio, 1) if atraso_medio else None,
            taxa_pontualidade=round(taxa_pontualidade, 4) if taxa_pontualidade is not None else None,
            taxa_avarias=round(taxa_avarias, 4),
            lane_score=score,
            classificacao=_classify(score),
        ))

    # Ordenar: piores primeiro
    return sorted(lanes, key=lambda l: l.lane_score)


def compute_network_summary(lanes: List[LaneMetrics], raw_shipments: List[dict]) -> NetworkSummary:
    """Consolida indicadores gerais da malha."""
    total_embarques = len(raw_shipments)
    total_lanes = len(lanes)
    transportadoras = {l.transportadora for l in lanes}

    custo_total = sum(l.custo_total for l in lanes)

    pct_vals = [l.taxa_pontualidade for l in lanes if l.taxa_pontualidade is not None]
    taxa_geral = sum(pct_vals) / len(pct_vals) if pct_vals else None

    criticas = sum(1 for l in lanes if l.classificacao == "critica")
    atencao = sum(1 for l in lanes if l.classificacao == "atencao")
    boas = sum(1 for l in lanes if l.classificacao in ("boa", "otima"))

    # Economia potencial: estimativa de 15% de saving nas lanes críticas e 8% nas de atenção
    ec_criticas = sum(l.custo_total for l in lanes if l.classificacao == "critica") * 0.15
    ec_atencao = sum(l.custo_total for l in lanes if l.classificacao == "atencao") * 0.08
    economia_potencial = ec_criticas + ec_atencao

    return NetworkSummary(
        total_embarques=total_embarques,
        total_lanes=total_lanes,
        total_transportadoras=len(transportadoras),
        custo_total=round(custo_total, 2),
        taxa_pontualidade_geral=round(taxa_geral, 4) if taxa_geral is not None else None,
        lanes_criticas=criticas,
        lanes_atencao=atencao,
        lanes_boas=boas,
        economia_potencial=round(economia_potencial, 2),
    )
