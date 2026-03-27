from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routers import audit, contracts, history, network

app = FastAPI(
    title="FreteIQ API",
    description="Plataforma SaaS de Auditoria Inteligente de Fretes",
    version="1.0.0",
)

# CORS
origins = [o.strip() for o in settings.allowed_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(audit.router)
app.include_router(contracts.router)
app.include_router(history.router)
app.include_router(network.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "FreteIQ API"}
