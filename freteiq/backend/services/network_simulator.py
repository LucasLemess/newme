"""
Simulador de Cenários de Malha de Transportes.

Cada tipo de cenário recebe parâmetros específicos e histórico de embarques
relevante, e retorna projeção de economia/impacto operacional.
"""
from typing import List, Optional
from models.shipment import ScenarioResult


def _filter_lanes(shipments: List[dict], origens: Optional[List[str]] = None,
                  destinos: Optional[List[str]] = None,
                  transportadoras: Optional[List[str]] = None) -> List[dict]:
    result = shipments
    if origens:
        result = [s for s in result if s.get("origem") in origens]
    if destinos:
        result = [s for s in result if s.get("destino") in destinos]
    if transportadoras:
        result = [s for s in result if s.get("transportadora") in transportadoras]
    return result


def simular_troca_transportadora(parametros: dict, shipments: List[dict]) -> ScenarioResult:
    """
    Troca de transportadora em lanes selecionadas.

    Parâmetros esperados:
    - origens: list[str] (opcional)
    - destinos: list[str] (opcional)
    - transportadoras_atuais: list[str]
    - nova_transportadora: str
    - nova_tarifa_por_kg: float    (R$/kg estimado contratado)
    - novo_lead_time_medio: float  (dias, estimado)
    """
    origens = parametros.get("origens")
    destinos = parametros.get("destinos")
    trans_atuais = parametros.get("transportadoras_atuais", [])
    nova_tarifa = float(parametros.get("nova_tarifa_por_kg", 0))
    novo_lt = parametros.get("novo_lead_time_medio")

    relevant = _filter_lanes(shipments, origens=origens, destinos=destinos,
                              transportadoras=trans_atuais if trans_atuais else None)
    if not relevant:
        relevant = shipments

    custo_atual = sum(float(s.get("custo_total", 0)) for s in relevant)
    peso_total_kg = sum(float(s.get("peso_kg", 0) or 0) for s in relevant)

    # Projetar custo com nova transportadora
    if nova_tarifa > 0 and peso_total_kg > 0:
        custo_projetado = peso_total_kg * nova_tarifa
    else:
        # Sem tarifa → assumir 10% de desconto como placeholder
        custo_projetado = custo_atual * 0.90

    economia = custo_atual - custo_projetado
    economia_pct = (economia / custo_atual * 100) if custo_atual > 0 else 0

    lt_vals = [float(s["lead_time_realizado"]) for s in relevant if s.get("lead_time_realizado")]
    lt_atual_medio = sum(lt_vals) / len(lt_vals) if lt_vals else None

    detalhes = {
        "embarques_afetados": len(relevant),
        "peso_total_kg": round(peso_total_kg, 2),
        "custo_atual_total": round(custo_atual, 2),
        "custo_projetado_total": round(custo_projetado, 2),
        "nova_transportadora": parametros.get("nova_transportadora", "—"),
        "nova_tarifa_por_kg": nova_tarifa,
        "lead_time_atual_medio_dias": round(lt_atual_medio, 1) if lt_atual_medio else None,
        "lead_time_projetado_dias": novo_lt,
    }

    rec = (
        f"Migrar {len(relevant)} embarques ({round(peso_total_kg/1000,1)} t) "
        f"para {parametros.get('nova_transportadora','nova transportadora')} "
        f"gera economia estimada de R$ {economia:,.2f} ({economia_pct:.1f}%). "
    )
    if novo_lt and lt_atual_medio and float(novo_lt) < lt_atual_medio:
        rec += f"Lead time melhora de {lt_atual_medio:.1f} para {novo_lt} dias."
    elif novo_lt and lt_atual_medio and float(novo_lt) > lt_atual_medio:
        rec += f"Atenção: lead time piora de {lt_atual_medio:.1f} para {novo_lt} dias."

    return ScenarioResult(
        nome=parametros.get("nome", "Troca de Transportadora"),
        tipo="troca_transportadora",
        custo_atual=round(custo_atual, 2),
        custo_projetado=round(custo_projetado, 2),
        economia_estimada=round(economia, 2),
        economia_percentual=round(economia_pct, 2),
        lead_time_atual=round(lt_atual_medio, 1) if lt_atual_medio else None,
        lead_time_projetado=float(novo_lt) if novo_lt else None,
        detalhes=detalhes,
        recomendacao=rec,
    )


def simular_mudanca_frequencia(parametros: dict, shipments: List[dict]) -> ScenarioResult:
    """
    Redução de frequência de embarques (menos viagens, cargas maiores = melhor frete).

    Parâmetros:
    - origens: list[str] (opcional)
    - destinos: list[str] (opcional)
    - frequencia_atual_por_mes: int   (ex: 8 embarques/mês)
    - frequencia_nova_por_mes: int    (ex: 4 embarques/mês → consolidação)
    - desconto_consolidacao_pct: float (% de desconto esperado por carga maior, ex: 12.0)
    - custo_estoque_adicional_pct: float (% custo adicional de estoque, ex: 3.0)
    """
    origens = parametros.get("origens")
    destinos = parametros.get("destinos")
    freq_atual = float(parametros.get("frequencia_atual_por_mes", 8))
    freq_nova = float(parametros.get("frequencia_nova_por_mes", 4))
    desconto_pct = float(parametros.get("desconto_consolidacao_pct", 10.0))
    custo_estoque_pct = float(parametros.get("custo_estoque_adicional_pct", 2.0))

    relevant = _filter_lanes(shipments, origens=origens, destinos=destinos)
    if not relevant:
        relevant = shipments

    custo_atual = sum(float(s.get("custo_total", 0)) for s in relevant)
    # Custo de frete com consolidação = (freq_nova/freq_atual) * custo * (1 - desconto/100)
    # O frete por viagem sobe (mais carga), mas o número de viagens cai
    fator_reducao_viagens = freq_nova / freq_atual if freq_atual > 0 else 1
    fator_consolidacao = (1 - desconto_pct / 100)
    custo_frete_novo = custo_atual * fator_reducao_viagens * fator_consolidacao

    # Custo adicional de estoque (carregar mais dias de inventário)
    custo_estoque = custo_atual * (custo_estoque_pct / 100)

    custo_projetado = custo_frete_novo + custo_estoque
    economia = custo_atual - custo_projetado
    economia_pct = (economia / custo_atual * 100) if custo_atual > 0 else 0

    lt_vals = [float(s["lead_time_realizado"]) for s in relevant if s.get("lead_time_realizado")]
    lt_atual_medio = sum(lt_vals) / len(lt_vals) if lt_vals else None
    # Frequência menor = ciclo de reposição maior → lead time percebido pelo cliente pode ser maior
    lt_projetado = (lt_atual_medio or 0) * (freq_atual / freq_nova) if freq_nova > 0 else None

    detalhes = {
        "embarques_afetados": len(relevant),
        "frequencia_atual_por_mes": freq_atual,
        "frequencia_nova_por_mes": freq_nova,
        "desconto_consolidacao_pct": desconto_pct,
        "custo_estoque_adicional_estimado": round(custo_estoque, 2),
        "custo_frete_projetado": round(custo_frete_novo, 2),
        "custo_atual_total": round(custo_atual, 2),
    }

    rec = (
        f"Reduzir frequência de {int(freq_atual)} para {int(freq_nova)} embarques/mês "
        f"nas {len(relevant)} rotas selecionadas gera economia líquida de "
        f"R$ {max(economia, 0):,.2f} ({max(economia_pct, 0):.1f}%) "
        f"após incluir R$ {custo_estoque:,.2f} de custo adicional de estoque."
    )
    if economia < 0:
        rec = (
            f"Com os parâmetros informados, a mudança gera custo adicional de "
            f"R$ {abs(economia):,.2f}. Revise o desconto de consolidação ou o custo de estoque."
        )

    return ScenarioResult(
        nome=parametros.get("nome", "Mudança de Frequência"),
        tipo="mudanca_frequencia",
        custo_atual=round(custo_atual, 2),
        custo_projetado=round(custo_projetado, 2),
        economia_estimada=round(economia, 2),
        economia_percentual=round(economia_pct, 2),
        lead_time_atual=round(lt_atual_medio, 1) if lt_atual_medio else None,
        lead_time_projetado=round(lt_projetado, 1) if lt_projetado else None,
        detalhes=detalhes,
        recomendacao=rec,
    )


def simular_consolidacao_lanes(parametros: dict, shipments: List[dict]) -> ScenarioResult:
    """
    Consolidação de múltiplas lanes em milk-run ou rota combinada.

    Parâmetros:
    - lanes: list[{origem, destino}]  (as lanes a consolidar)
    - economia_rota_pct: float        (% de saving por eliminar viagens redundantes, ex: 20.0)
    - lead_time_adicional_dias: float (dias extras por parada adicional, ex: 0.5)
    """
    lanes_param = parametros.get("lanes", [])
    economia_rota_pct = float(parametros.get("economia_rota_pct", 18.0))
    lt_adicional = float(parametros.get("lead_time_adicional_dias", 0.5))

    # Filtrar embarques das lanes especificadas
    relevant: List[dict] = []
    for lane in lanes_param:
        orig = lane.get("origem")
        dest = lane.get("destino")
        for s in shipments:
            if s.get("origem") == orig and s.get("destino") == dest:
                relevant.append(s)

    if not relevant:
        relevant = shipments

    custo_atual = sum(float(s.get("custo_total", 0)) for s in relevant)
    custo_projetado = custo_atual * (1 - economia_rota_pct / 100)
    economia = custo_atual - custo_projetado
    economia_pct = economia_rota_pct

    lt_vals = [float(s["lead_time_realizado"]) for s in relevant if s.get("lead_time_realizado")]
    lt_atual = sum(lt_vals) / len(lt_vals) if lt_vals else None
    lt_projetado = (lt_atual or 0) + lt_adicional

    paradas = len(set((s.get("origem"), s.get("destino")) for s in relevant))

    detalhes = {
        "embarques_afetados": len(relevant),
        "lanes_consolidadas": len(lanes_param) or paradas,
        "economia_rota_pct": economia_rota_pct,
        "lead_time_adicional_dias": lt_adicional,
        "custo_atual_total": round(custo_atual, 2),
    }

    rec = (
        f"Consolidar {paradas} lanes em rota combinada (milk-run) reduz custo em "
        f"R$ {economia:,.2f} ({economia_pct:.0f}%). Lead time aumenta ~{lt_adicional} dia(s) "
        f"por parada adicional. Indicado para lanes com baixo volume individual."
    )

    return ScenarioResult(
        nome=parametros.get("nome", "Consolidação de Lanes"),
        tipo="consolidacao_lanes",
        custo_atual=round(custo_atual, 2),
        custo_projetado=round(custo_projetado, 2),
        economia_estimada=round(economia, 2),
        economia_percentual=round(economia_pct, 2),
        lead_time_atual=round(lt_atual, 1) if lt_atual else None,
        lead_time_projetado=round(lt_projetado, 1),
        detalhes=detalhes,
        recomendacao=rec,
    )


def simular_cross_dock(parametros: dict, shipments: List[dict]) -> ScenarioResult:
    """
    Adição de cross-dock em ponto intermediário para reduzir fretes de longa distância.

    Parâmetros:
    - origens: list[str]
    - destinos: list[str]
    - ponto_cross_dock: str
    - reducao_custo_pct: float   (% de saving estimado, ex: 22.0)
    - lead_time_adicional_dias: float (ex: 1.0)
    """
    origens = parametros.get("origens")
    destinos = parametros.get("destinos")
    ponto = parametros.get("ponto_cross_dock", "CD Intermediário")
    reducao_pct = float(parametros.get("reducao_custo_pct", 20.0))
    lt_adicional = float(parametros.get("lead_time_adicional_dias", 1.0))

    relevant = _filter_lanes(shipments, origens=origens, destinos=destinos)
    if not relevant:
        relevant = shipments

    custo_atual = sum(float(s.get("custo_total", 0)) for s in relevant)
    custo_projetado = custo_atual * (1 - reducao_pct / 100)
    economia = custo_atual - custo_projetado
    economia_pct = reducao_pct

    lt_vals = [float(s["lead_time_realizado"]) for s in relevant if s.get("lead_time_realizado")]
    lt_atual = sum(lt_vals) / len(lt_vals) if lt_vals else None
    lt_projetado = (lt_atual or 0) + lt_adicional

    detalhes = {
        "embarques_afetados": len(relevant),
        "ponto_cross_dock": ponto,
        "reducao_custo_pct": reducao_pct,
        "lead_time_adicional_dias": lt_adicional,
        "custo_atual_total": round(custo_atual, 2),
    }

    rec = (
        f"Criar cross-dock em '{ponto}' para {len(relevant)} embarques das rotas selecionadas "
        f"reduz custo de frete em R$ {economia:,.2f} ({economia_pct:.0f}%) ao fragmentar "
        f"o trajeto longo em dois trechos com melhor taxa. Lead time adicional estimado: "
        f"{lt_adicional} dia(s)."
    )

    return ScenarioResult(
        nome=parametros.get("nome", "Cross-Dock"),
        tipo="cross_dock",
        custo_atual=round(custo_atual, 2),
        custo_projetado=round(custo_projetado, 2),
        economia_estimada=round(economia, 2),
        economia_percentual=round(economia_pct, 2),
        lead_time_atual=round(lt_atual, 1) if lt_atual else None,
        lead_time_projetado=round(lt_projetado, 1),
        detalhes=detalhes,
        recomendacao=rec,
    )


# Dispatcher
SIMULATORS = {
    "troca_transportadora": simular_troca_transportadora,
    "mudanca_frequencia": simular_mudanca_frequencia,
    "consolidacao_lanes": simular_consolidacao_lanes,
    "milk_run": simular_consolidacao_lanes,   # milk-run usa mesma lógica de consolidação
    "cross_dock": simular_cross_dock,
}


def run_simulation(tipo: str, parametros: dict, shipments: List[dict]) -> ScenarioResult:
    """Ponto de entrada único para simulação."""
    fn = SIMULATORS.get(tipo)
    if fn is None:
        raise ValueError(f"Tipo de cenário desconhecido: {tipo}")
    return fn(parametros, shipments)
