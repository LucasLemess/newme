"""
Engine de Auditoria de CT-e.
Compara valores cobrados no CT-e contra o contrato cadastrado.
"""
from typing import List, Optional
from models.cte import CTeData
from models.audit_result import Finding, AuditResult
import uuid


SEVERITY_THRESHOLD_HIGH = 100.0    # R$ diferença > 100 → high
SEVERITY_THRESHOLD_MEDIUM = 20.0   # R$ diferença > 20 → medium


def _severity(diferenca: float) -> str:
    abs_diff = abs(diferenca)
    if abs_diff >= SEVERITY_THRESHOLD_HIGH:
        return "high"
    elif abs_diff >= SEVERITY_THRESHOLD_MEDIUM:
        return "medium"
    return "low"


def _finding(tipo: str, descricao: str, diferenca: float, fundamentacao: str) -> Finding:
    return Finding(
        id=str(uuid.uuid4())[:8],
        tipo=tipo,
        severity=_severity(diferenca),
        descricao=descricao,
        diferenca=round(diferenca, 2),
        fundamentacao=fundamentacao,
    )


def audit_cte(cte: CTeData, contract: Optional[dict]) -> AuditResult:
    """
    Executa auditoria completa do CT-e contra o contrato fornecido.

    Args:
        cte: Dados extraídos do CT-e
        contract: Dicionário com dados do contrato (ou None se não encontrado)

    Returns:
        AuditResult com findings e totalOvercharge
    """
    findings: List[Finding] = []
    total_overcharge = 0.0

    # Se não há contrato cadastrado, emite alerta
    if contract is None:
        findings.append(
            Finding(
                id=str(uuid.uuid4())[:8],
                tipo="SEM_CONTRATO",
                severity="medium",
                descricao="Nenhum contrato ativo encontrado para esta transportadora.",
                diferenca=0.0,
                fundamentacao=(
                    "Não foi possível validar os valores cobrados pois não há contrato "
                    "vigente cadastrado para o CNPJ da transportadora. Recomenda-se "
                    "cadastrar o contrato para habilitar a auditoria completa."
                ),
            )
        )
    else:
        # ── 1. ICMS ──────────────────────────────────────────────────────────
        icms_contrato = contract.get("icms_rate")
        if (
            icms_contrato is not None
            and cte.vICMS is not None
            and cte.vBC is not None
            and cte.pICMS is not None
        ):
            icms_esperado = cte.vBC * (icms_contrato / 100.0)
            icms_cobrado = cte.vICMS
            diff = icms_cobrado - icms_esperado

            if abs(diff) > 0.01:
                findings.append(
                    _finding(
                        tipo="ICMS",
                        descricao=(
                            f"ICMS divergente: cobrado {cte.pICMS:.1f}% "
                            f"(R$ {icms_cobrado:.2f}), contrato prevê "
                            f"{icms_contrato:.1f}% (R$ {icms_esperado:.2f})."
                        ),
                        diferenca=diff,
                        fundamentacao=(
                            f"Cláusula de ICMS do contrato especifica alíquota de "
                            f"{icms_contrato}% sobre a BC de R$ {cte.vBC:.2f}. "
                            f"O valor contratual seria R$ {icms_esperado:.2f}, "
                            f"porém foi cobrado R$ {icms_cobrado:.2f}, gerando "
                            f"divergência de R$ {diff:.2f}."
                        ),
                    )
                )
                if diff > 0:
                    total_overcharge += diff

        # ── 2. Tarifa Frete/kg ────────────────────────────────────────────────
        tarifa_contrato = contract.get("freight_rate_per_kg")
        peso_real = cte.qCarga
        if (
            tarifa_contrato is not None
            and peso_real is not None
            and cte.vFrete is not None
            and peso_real > 0
        ):
            frete_esperado = peso_real * tarifa_contrato
            frete_cobrado = cte.vFrete
            diff = frete_cobrado - frete_esperado

            if abs(diff) > 0.01:
                findings.append(
                    _finding(
                        tipo="TARIFA_KG",
                        descricao=(
                            f"Tarifa frete/kg divergente: cobrado R$ "
                            f"{frete_cobrado / peso_real:.4f}/kg "
                            f"(total R$ {frete_cobrado:.2f}), contrato prevê "
                            f"R$ {tarifa_contrato:.4f}/kg "
                            f"(total R$ {frete_esperado:.2f})."
                        ),
                        diferenca=diff,
                        fundamentacao=(
                            f"A tabela tarifária contratual estabelece R$ "
                            f"{tarifa_contrato}/kg. Com peso de {peso_real} kg, "
                            f"o frete contratual é R$ {frete_esperado:.2f}. "
                            f"Valor cobrado R$ {frete_cobrado:.2f} resulta em "
                            f"diferença de R$ {diff:.2f}."
                        ),
                    )
                )
                if diff > 0:
                    total_overcharge += diff

        # ── 3. Ad Valorem ─────────────────────────────────────────────────────
        ad_valorem_contrato = contract.get("ad_valorem_rate")
        if (
            ad_valorem_contrato is not None
            and cte.vCarga is not None
            and cte.vAdValorem is not None
            and cte.vCarga > 0
        ):
            ad_esperado = cte.vCarga * ad_valorem_contrato
            ad_cobrado = cte.vAdValorem
            diff = ad_cobrado - ad_esperado

            if abs(diff) > 0.01:
                findings.append(
                    _finding(
                        tipo="AD_VALOREM",
                        descricao=(
                            f"Ad valorem divergente: cobrado R$ {ad_cobrado:.2f} "
                            f"({ad_cobrado/cte.vCarga*100:.3f}% da carga), "
                            f"contrato prevê {ad_valorem_contrato*100:.3f}% "
                            f"(R$ {ad_esperado:.2f})."
                        ),
                        diferenca=diff,
                        fundamentacao=(
                            f"O percentual contratual de ad valorem é "
                            f"{ad_valorem_contrato*100:.3f}% sobre o valor da carga "
                            f"de R$ {cte.vCarga:.2f}. Valor esperado: "
                            f"R$ {ad_esperado:.2f}. Valor cobrado: "
                            f"R$ {ad_cobrado:.2f}. Diferença: R$ {diff:.2f}."
                        ),
                    )
                )
                if diff > 0:
                    total_overcharge += diff

        # ── 4. Fator de Cubagem ───────────────────────────────────────────────
        if (
            cte.qCargaAfer is not None
            and cte.qCarga is not None
            and cte.qCarga > 0
        ):
            fator_cubagem = cte.qCargaAfer / cte.qCarga
            if fator_cubagem > 1.3:
                findings.append(
                    Finding(
                        id=str(uuid.uuid4())[:8],
                        tipo="CUBAGEM",
                        severity="medium",
                        descricao=(
                            f"Fator de cubagem elevado: {fator_cubagem:.2f}x "
                            f"(peso real {cte.qCarga} kg, "
                            f"peso cubado {cte.qCargaAfer} kg). "
                            f"Limite aceitável: 1,30x."
                        ),
                        diferenca=0.0,
                        fundamentacao=(
                            f"A relação entre peso cubado ({cte.qCargaAfer} kg) e "
                            f"peso real ({cte.qCarga} kg) é de {fator_cubagem:.2f}, "
                            f"superior ao limite contratual de 1,30. Verificar se o "
                            f"cálculo de cubagem foi aplicado corretamente conforme "
                            f"fórmula: C×L×A / fator_cubagem_modal."
                        ),
                    )
                )

        # ── 5. Pedágio ────────────────────────────────────────────────────────
        max_pedagio = contract.get("max_pedagio")
        if (
            max_pedagio is not None
            and cte.vPedagio is not None
        ):
            diff = cte.vPedagio - max_pedagio
            if diff > 0.01:
                findings.append(
                    _finding(
                        tipo="PEDAGIO",
                        descricao=(
                            f"Pedágio acima do limite contratual: cobrado "
                            f"R$ {cte.vPedagio:.2f}, máximo contratual "
                            f"R$ {max_pedagio:.2f}."
                        ),
                        diferenca=diff,
                        fundamentacao=(
                            f"O contrato estabelece limite máximo de R$ {max_pedagio:.2f} "
                            f"para pedágio por CT-e. O valor cobrado de R$ {cte.vPedagio:.2f} "
                            f"supera esse limite em R$ {diff:.2f}, configurando "
                            f"cobrança indevida."
                        ),
                    )
                )
                total_overcharge += diff

        # ── 6. Consistência do Total ──────────────────────────────────────────
        if cte.vTPrest is not None:
            soma_componentes = sum(filter(None, [
                cte.vFrete,
                cte.vICMS,
                cte.vAdValorem,
                cte.vPedagio,
                cte.vOutros,
            ]))
            if cte.vDesc:
                soma_componentes -= cte.vDesc

            if soma_componentes > 0:
                diff = cte.vTPrest - soma_componentes
                if abs(diff) > 1.0:  # tolerância R$1,00 por arredondamento
                    findings.append(
                        _finding(
                            tipo="INCONSISTENCIA_TOTAL",
                            descricao=(
                                f"Valor total do CT-e (R$ {cte.vTPrest:.2f}) não bate "
                                f"com a soma dos componentes (R$ {soma_componentes:.2f}). "
                                f"Diferença: R$ {diff:.2f}."
                            ),
                            diferenca=diff,
                            fundamentacao=(
                                f"A somatória dos componentes identificados "
                                f"(Frete + ICMS + Ad Valorem + Pedágio + Outros - Descontos) "
                                f"resulta em R$ {soma_componentes:.2f}, enquanto o valor "
                                f"total da prestação (vTPrest) é R$ {cte.vTPrest:.2f}. "
                                f"A divergência de R$ {abs(diff):.2f} sugere componentes "
                                f"não declarados ou erro de cálculo."
                            ),
                        )
                    )
                    if diff > 0:
                        total_overcharge += diff

    # ── Determinar Status ─────────────────────────────────────────────────────
    high_count = sum(1 for f in findings if f.severity == "high")
    if high_count > 0 or total_overcharge > 100:
        status = "REPROVADO"
    elif len(findings) > 0:
        status = "ATENÇÃO"
    else:
        status = "APROVADO"

    # ── Componentes para visualização ─────────────────────────────────────────
    componentes = {
        "frete_base": cte.vFrete or 0,
        "icms": cte.vICMS or 0,
        "ad_valorem": cte.vAdValorem or 0,
        "pedagio": cte.vPedagio or 0,
        "outros": cte.vOutros or 0,
        "desconto": -(cte.vDesc or 0),
    }

    return AuditResult(
        cteNumero=cte.nCT,
        cteSerie=cte.serie,
        cteChave=cte.chaveAcesso,
        cteEmitente=cte.xNome,
        cteCNPJ=cte.cnpj,
        cteData=str(cte.cteData) if cte.cteData else cte.dhEmi,
        valorTotal=cte.vTPrest or 0.0,
        totalOvercharge=round(total_overcharge, 2),
        status=status,
        findings=findings,
        componentes=componentes,
    )
