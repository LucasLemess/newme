"""
Módulo de IA usando Claude API para geração de contestações e análises estratégicas.
"""
import anthropic
from models.audit_result import AuditResult
from config import settings


client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
MODEL = "claude-sonnet-4-5"


def _format_findings(audit: AuditResult) -> str:
    if not audit.findings:
        return "Nenhuma divergência encontrada."
    lines = []
    for i, f in enumerate(audit.findings, 1):
        sev_map = {"high": "ALTA", "medium": "MÉDIA", "low": "BAIXA"}
        lines.append(
            f"{i}. [{sev_map.get(f.severity, f.severity)}] {f.tipo}: {f.descricao}\n"
            f"   Fundamentação: {f.fundamentacao}\n"
            f"   Diferença: R$ {f.diferenca:.2f}"
        )
    return "\n\n".join(lines)


def generate_contestacao(audit: AuditResult) -> str:
    """
    Gera carta formal de contestação em português jurídico usando Claude.
    """
    findings_text = _format_findings(audit)

    prompt = f"""Você é um especialista jurídico em direito de transportes e logística brasileira.
Gere uma carta formal de contestação de cobrança indevida em CT-e, em português jurídico formal.

DADOS DO CT-e:
- Número: {audit.cteNumero} | Série: {audit.cteSerie or 'N/A'}
- Emitente (Transportadora): {audit.cteEmitente or 'N/A'} | CNPJ: {audit.cteCNPJ or 'N/A'}
- Data de Emissão: {audit.cteData or 'N/A'}
- Valor Total do CT-e: R$ {audit.valorTotal:.2f}
- Total Overcharge Identificado: R$ {audit.totalOvercharge:.2f}

DIVERGÊNCIAS IDENTIFICADAS NA AUDITORIA:
{findings_text}

INSTRUÇÕES PARA A CARTA:
1. Cabeçalho formal com local e data (use "São Paulo, [DATA ATUAL]")
2. Identificação do destinatário (transportadora)
3. Assunto: Contestação de Cobrança Indevida - CT-e nº {audit.cteNumero}
4. Corpo da carta:
   - Referência ao contrato de prestação de serviços vigente
   - Citação específica de cada divergência encontrada com sua fundamentação contratual
   - Cálculo detalhado do valor total contestado (R$ {audit.totalOvercharge:.2f})
   - Solicitação formal de estorno do valor identificado
   - Prazo de 5 (cinco) dias úteis para manifestação
5. Encerramento com linguagem formal
6. Assinatura: Departamento de Logística e Controladoria

A carta deve ser assertiva, técnica e juridicamente embasada. Cite cláusulas contratuais de forma genérica mas precisa."""

    message = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def generate_analise_estrategica(audit: AuditResult) -> str:
    """
    Gera análise estratégica da transportadora e recomendações usando Claude.
    """
    findings_text = _format_findings(audit)
    high_count = sum(1 for f in audit.findings if f.severity == "high")
    med_count = sum(1 for f in audit.findings if f.severity == "medium")

    prompt = f"""Você é um consultor especialista em gestão de fretes e logística estratégica para empresas brasileiras.

Analise os resultados da auditoria de CT-e abaixo e forneça uma análise estratégica completa.

DADOS DA AUDITORIA:
- Transportadora: {audit.cteEmitente or 'N/A'} | CNPJ: {audit.cteCNPJ or 'N/A'}
- CT-e nº {audit.cteNumero} | Status: {audit.status}
- Valor Total: R$ {audit.valorTotal:.2f}
- Overcharge Identificado: R$ {audit.totalOvercharge:.2f} ({audit.totalOvercharge/audit.valorTotal*100:.1f}% do valor total)
- Findings de Alta Severidade: {high_count}
- Findings de Média Severidade: {med_count}

DIVERGÊNCIAS DETECTADAS:
{findings_text}

Forneça análise estruturada com:

## 1. AVALIAÇÃO DE RISCO DA TRANSPORTADORA
- Classificação: Baixo / Médio / Alto risco
- Justificativa baseada nos padrões de cobrança identificados

## 2. PADRÃO DE COBRANÇAS SUSPEITAS
- Identifique se as cobranças parecem sistemáticas ou pontuais
- Tipos de irregularidades mais críticas
- Possível intencionalidade vs. erro operacional

## 3. IMPACTO FINANCEIRO PROJETADO
- Estimativa de impacto anual (assumindo frequência mensal similar)
- Percentual de overcharge sobre o valor de frete
- Comparação com benchmarks do mercado de transportes

## 4. PRÓXIMOS PASSOS RECOMENDADOS
- Ações imediatas (0-7 dias)
- Ações de curto prazo (8-30 dias)
- Ações estruturais (31-90 dias)

## 5. RECOMENDAÇÕES CONTRATUAIS
- Cláusulas que devem ser reforçadas no próximo contrato
- Garantias e penalidades sugeridas

Seja objetivo, quantitativo quando possível, e foque em recomendações práticas e acionáveis."""

    message = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text
