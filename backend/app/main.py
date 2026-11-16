"""Ponto de entrada da API REST do TechExpert (FastAPI)."""

from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from backend.app.database.connection import (
    check_database_connection,
    resolve_prolog_kb_path,
)
from backend.app.database.seed import initialize_and_seed_database
from backend.app.routes.diagnostics import router as diagnostics_router
from backend.app.services.prolog_service import (
    PrologServiceError,
    get_prolog_service,
)

logger = logging.getLogger(__name__)

DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"


def _get_cors_origins() -> list[str]:
    """Obtém a lista de origens CORS configurada via ambiente."""
    raw = os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS)
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Inicializa banco, catálogo de sintomas e motor Prolog na subida da API."""
    try:
        total = initialize_and_seed_database()
        logger.info("Banco inicializado com %s sintomas sincronizados.", total)
    except SQLAlchemyError as exc:
        logger.warning(
            "Inicialização automática do banco adiada (banco indisponível no startup): %s",
            exc,
        )

    try:
        prolog_service = get_prolog_service()
        logger.info(
            "Motor Prolog pronto (modo=%s, versao=%s).",
            prolog_service.backend_mode,
            prolog_service.obter_versao_regras(),
        )
    except PrologServiceError as exc:
        logger.warning("Motor Prolog indisponível no startup: %s", exc)

    yield


app = FastAPI(
    title="TechExpert API",
    version="1.0.0",
    description=(
        "API REST do Sistema Especialista TechExpert para Diagnóstico de "
        "Problemas Computacionais."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(diagnostics_router)


@app.get("/health", tags=["Operacional"])
def health_check() -> JSONResponse:
    """Verifica a conectividade com o PostgreSQL e o estado do motor Prolog."""
    db_ok, db_error = check_database_connection()
    kb_path = resolve_prolog_kb_path()
    kb_ok = kb_path.is_file()

    prolog_mode: str | None = None
    versao_regras: str | None = None
    prolog_error: str | None = None
    if kb_ok:
        try:
            service = get_prolog_service()
            prolog_mode = service.backend_mode
            versao_regras = service.obter_versao_regras()
        except PrologServiceError as exc:
            prolog_error = str(exc)

    is_healthy = db_ok and kb_ok and prolog_error is None
    payload: dict[str, object] = {
        "status": "ok" if is_healthy else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "prolog_kb": "found" if kb_ok else "missing",
        "prolog_kb_path": str(kb_path),
        "prolog_backend_mode": prolog_mode,
        "versao_regras": versao_regras,
    }
    if db_error:
        payload["database_error"] = db_error
    if prolog_error:
        payload["prolog_error"] = prolog_error

    http_status = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=http_status, content=payload)
