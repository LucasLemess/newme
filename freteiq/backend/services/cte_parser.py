"""
Parser para XML CT-e versão 3.00+ no padrão SEFAZ.
Extrai campos relevantes para auditoria de fretes.
"""
from lxml import etree
from typing import Optional
from datetime import date
import re

from models.cte import CTeData


# Namespaces SEFAZ CT-e
NAMESPACES = {
    "cte": "http://www.portalfiscal.inf.br/cte",
    "cte300": "http://www.portalfiscal.inf.br/cte",
}


def _find_text(root: etree._Element, xpath: str) -> Optional[str]:
    """Busca texto em elemento XML tratando namespaces."""
    ns = {"ns": "http://www.portalfiscal.inf.br/cte"}
    try:
        # Try with namespace prefix
        result = root.xpath(xpath, namespaces=ns)
        if result:
            return str(result[0]).strip() if result[0] is not None else None
    except Exception:
        pass

    # Fallback: try without namespace using local-name()
    try:
        tag = xpath.split("/")[-1].replace("ns:", "").replace("text()", "").strip("/")
        for elem in root.iter():
            local = etree.QName(elem.tag).localname if "}" in elem.tag else elem.tag
            if local == tag and elem.text:
                return elem.text.strip()
    except Exception:
        pass

    return None


def _find_float(root: etree._Element, xpath: str) -> Optional[float]:
    """Busca e converte valor float em elemento XML."""
    val = _find_text(root, xpath)
    if val is None:
        return None
    try:
        return float(val.replace(",", "."))
    except (ValueError, AttributeError):
        return None


def parse_cte_xml(xml_content: bytes) -> CTeData:
    """
    Parseia XML CT-e e retorna CTeData com campos extraídos.
    Suporta CT-e versão 3.00+.
    """
    try:
        root = etree.fromstring(xml_content)
    except etree.XMLSyntaxError as e:
        raise ValueError(f"XML inválido: {e}")

    # Remover assinatura digital se presente para facilitar parse
    # A assinatura fica em Signature element
    ns = {"ns": "http://www.portalfiscal.inf.br/cte"}

    def find(xpath: str) -> Optional[str]:
        return _find_text(root, xpath)

    def find_f(xpath: str) -> Optional[float]:
        return _find_float(root, xpath)

    # Número do CT-e e série
    nct = find("//ns:nCT/text()")
    serie = find("//ns:serie/text()")

    # Chave de acesso (atributo Id do infCte ou chCTe)
    chave = find("//ns:chCTe/text()")
    if not chave:
        # Tenta pegar do atributo Id
        for elem in root.iter():
            local = etree.QName(elem.tag).localname if "}" in elem.tag else elem.tag
            if local == "infCte":
                chave = elem.get("Id", "").replace("CTe", "")
                break

    # Data de emissão
    dh_emi = find("//ns:dhEmi/text()")
    cte_date: Optional[date] = None
    if dh_emi:
        try:
            from dateutil.parser import parse as parse_date
            cte_date = parse_date(dh_emi).date()
        except Exception:
            pass

    # Emitente
    x_nome = find("//ns:emit/ns:xNome/text()")
    cnpj_emit = find("//ns:emit/ns:CNPJ/text()")

    # Natureza da operação
    nat_op = find("//ns:natOp/text()")

    # UFs origem/destino
    c_uf_orig = find("//ns:cUFOrig/text()")
    c_uf_dest = find("//ns:cUFDest/text()")

    # Valores da prestação (vPrest)
    v_tprest = find_f("//ns:vTPrest/text()")
    v_rec = find_f("//ns:vRec/text()")

    # ICMS
    v_icms = find_f("//ns:ICMS//ns:vICMS/text()")
    p_icms = find_f("//ns:ICMS//ns:pICMS/text()")
    v_bc = find_f("//ns:ICMS//ns:vBC/text()")

    # Componentes do frete (Comp elements)
    v_frete: Optional[float] = None
    v_outros: Optional[float] = None
    v_desc: Optional[float] = None
    v_ad_valorem: Optional[float] = None
    v_pedagio: Optional[float] = None

    # Iterar sobre componentes da prestação
    for elem in root.iter():
        local = etree.QName(elem.tag).localname if "}" in elem.tag else elem.tag
        if local == "Comp":
            # Buscar xNome e vComp dentro do Comp
            x_comp_nome = None
            v_comp = None
            for child in elem:
                child_local = etree.QName(child.tag).localname if "}" in child.tag else child.tag
                if child_local == "xNome" and child.text:
                    x_comp_nome = child.text.strip().upper()
                elif child_local == "vComp" and child.text:
                    try:
                        v_comp = float(child.text.strip())
                    except ValueError:
                        pass

            if x_comp_nome and v_comp is not None:
                if "FRETE" in x_comp_nome and "AD" not in x_comp_nome:
                    v_frete = v_comp
                elif "AD VALOREM" in x_comp_nome or "ADVALOREM" in x_comp_nome:
                    v_ad_valorem = v_comp
                elif "PEDÁGIO" in x_comp_nome or "PEDAGIO" in x_comp_nome:
                    v_pedagio = v_comp
                elif "DESCONTO" in x_comp_nome:
                    v_desc = v_comp
                else:
                    v_outros = (v_outros or 0) + v_comp

    # Carga
    q_carga = find_f("//ns:qCarga/text()")
    q_carga_afer = find_f("//ns:qCargaAfer/text()")
    v_carga = find_f("//ns:vCarga/text()")

    # Se vFrete não veio dos componentes, pode estar em vPrest direto
    if v_frete is None and v_tprest is not None:
        # Calcula frete base subtraindo outros componentes conhecidos
        outros_total = (v_icms or 0) + (v_pedagio or 0) + (v_ad_valorem or 0)
        v_frete = v_tprest - outros_total if v_tprest > outros_total else v_tprest

    return CTeData(
        nCT=nct or "N/A",
        serie=serie,
        chaveAcesso=chave,
        dhEmi=dh_emi,
        cteData=cte_date,
        xNome=x_nome,
        cnpj=cnpj_emit,
        vTPrest=v_tprest,
        vRec=v_rec,
        vICMS=v_icms,
        pICMS=p_icms,
        vBC=v_bc,
        vFrete=v_frete,
        vOutros=v_outros,
        vDesc=v_desc,
        vAdValorem=v_ad_valorem,
        vPedagio=v_pedagio,
        vCarga=v_carga,
        qCarga=q_carga,
        qCargaAfer=q_carga_afer,
        natOp=nat_op,
        cUFOrig=c_uf_orig,
        cUFDest=c_uf_dest,
    )


def get_demo_cte() -> CTeData:
    """Retorna um CT-e de demonstração com dados fictícios para teste."""
    return CTeData(
        nCT="000042587",
        serie="1",
        chaveAcesso="35240312345678000195570010000425871000000001",
        dhEmi="2024-03-13T10:30:00-03:00",
        cteData=date(2024, 3, 13),
        xNome="TRANSPORTADORA RÁPIDA LTDA",
        cnpj="12345678000195",
        vTPrest=3850.00,
        vRec=3850.00,
        vICMS=462.00,
        pICMS=15.0,     # cobrado 15%, contrato prevê 12%
        vBC=3080.00,
        vFrete=2800.00,
        vOutros=150.00,
        vDesc=0.0,
        vAdValorem=350.00,  # cobrado 0.5% sobre 70000, contrato prevê 0.3%
        vPedagio=88.00,     # cobrado 88, contrato prevê max 60
        vCarga=70000.00,
        qCarga=520.0,       # kg real
        qCargaAfer=780.0,   # kg cubado (fator 1.5 - acima de 1.3)
        natOp="PRESTAÇÃO DE SERVIÇO DE TRANSPORTE",
        cUFOrig="SP",
        cUFDest="RJ",
    )
