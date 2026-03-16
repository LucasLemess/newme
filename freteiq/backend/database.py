from supabase import create_client, Client
from config import settings
from typing import Optional
import base64
import json


def get_supabase(token: Optional[str] = None) -> Client:
    """
    Cria cliente Supabase.
    Se token for fornecido, usa como JWT do usuário autenticado.
    """
    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    if token:
        client.postgrest.auth(token)
    return client


def get_supabase_admin() -> Client:
    """Cliente Supabase com service role (bypass RLS)."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_user_id_from_token(token: str) -> Optional[str]:
    """Extrai user_id (sub) do JWT sem chamada de rede."""
    try:
        payload_b64 = token.split('.')[1]
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += '=' * padding
        payload = json.loads(base64.b64decode(payload_b64))
        return payload.get('sub')
    except Exception:
        return None
