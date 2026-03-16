from supabase import create_client, Client
from config import settings
from typing import Optional


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
