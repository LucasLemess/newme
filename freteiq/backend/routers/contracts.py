from fastapi import APIRouter, HTTPException, Header
from typing import Optional, List

from models.contract import Contract, ContractCreate, ContractUpdate
from database import get_supabase

router = APIRouter(prefix="/contracts", tags=["contracts"])


def _auth_token(authorization: Optional[str]) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ", 1)[1]
    return None


@router.get("/", response_model=List[dict])
async def list_contracts(
    authorization: Optional[str] = Header(None),
    transportadora: Optional[str] = None,
):
    token = _auth_token(authorization)
    supabase = get_supabase(token)

    query = supabase.table("contracts").select("*").order("created_at", desc=True)
    if transportadora:
        query = query.ilike("transportadora", f"%{transportadora}%")

    result = query.execute()
    return result.data or []


@router.post("/", response_model=dict, status_code=201)
async def create_contract(
    contract: ContractCreate,
    authorization: Optional[str] = Header(None),
):
    token = _auth_token(authorization)
    supabase = get_supabase(token)

    data = contract.model_dump(exclude_none=True)
    # Converter dates para string
    for field in ["validade_inicio", "validade_fim"]:
        if field in data and data[field]:
            data[field] = str(data[field])

    result = supabase.table("contracts").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Erro ao criar contrato.")
    return result.data[0]


@router.get("/{contract_id}", response_model=dict)
async def get_contract(
    contract_id: str,
    authorization: Optional[str] = Header(None),
):
    token = _auth_token(authorization)
    supabase = get_supabase(token)

    result = supabase.table("contracts").select("*").eq("id", contract_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Contrato não encontrado.")
    return result.data


@router.put("/{contract_id}", response_model=dict)
async def update_contract(
    contract_id: str,
    contract: ContractUpdate,
    authorization: Optional[str] = Header(None),
):
    token = _auth_token(authorization)
    supabase = get_supabase(token)

    data = contract.model_dump(exclude_none=True)
    for field in ["validade_inicio", "validade_fim"]:
        if field in data and data[field]:
            data[field] = str(data[field])

    if not data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar.")

    result = supabase.table("contracts").update(data).eq("id", contract_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Contrato não encontrado.")
    return result.data[0]


@router.delete("/{contract_id}", status_code=204)
async def delete_contract(
    contract_id: str,
    authorization: Optional[str] = Header(None),
):
    token = _auth_token(authorization)
    supabase = get_supabase(token)

    supabase.table("contracts").delete().eq("id", contract_id).execute()
