"""Ponto de entrada da API REST do TechExpert (FastAPI)."""

import os

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.database.connection import (
    check_database_connection,
    resolve_prolog_kb_path,
)

DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"


def _get_cors_origins() -> list[str]:
    """Obtém a lista de origens CORS configurada via ambiente."""
    raw = os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS)
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


app = FastAPI(
    title="TechExpert API",
    version="1.0.0",
    description=(
        "API REST do Sistema Especialista TechExpert para Diagnóstico de "
        "Problemas Computacionais."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Operacional"])
def health_check() -> JSONResponse:
    """Verifica a conectividade com o PostgreSQL e a disponibilidade da base Prolog."""
    db_ok, db_error = check_database_connection()
    kb_path = resolve_prolog_kb_path()
    kb_ok = kb_path.is_file()

    is_healthy = db_ok and kb_ok
    payload = {
        "status": "ok" if is_healthy else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "prolog_kb": "found" if kb_ok else "missing",
        "prolog_kb_path": str(kb_path),
    }
    if db_error:
        payload["database_error"] = db_error

    http_status = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=http_status, content=payload)
