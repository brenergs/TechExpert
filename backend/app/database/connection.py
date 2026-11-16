"""Configuração de conexão e gerenciamento de sessão com o PostgreSQL."""

from collections.abc import Generator
import importlib.util
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, declarative_base, sessionmaker

PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / ".env", override=False)

DEFAULT_DATABASE_URL = "postgresql://techexpert:techexpert@localhost:5432/techexpert"
DEFAULT_PROLOG_KB_PATH = "prolog/knowledge_base.pl"


def _resolve_database_url() -> str:
    """Resolve DATABASE_URL selecionando automaticamente psycopg2 ou psycopg v3."""
    raw_url = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL).strip()
    if raw_url.startswith("postgresql://"):
        has_psycopg2 = importlib.util.find_spec("psycopg2") is not None
        has_psycopg3 = importlib.util.find_spec("psycopg") is not None
        if not has_psycopg2 and has_psycopg3:
            return raw_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return raw_url


def resolve_prolog_kb_path() -> Path:
    """Resolve o caminho absoluto do arquivo principal da base Prolog."""
    configured = os.getenv("PROLOG_KB_PATH", DEFAULT_PROLOG_KB_PATH).strip()
    kb_path = Path(configured)
    if not kb_path.is_absolute():
        kb_path = (PROJECT_ROOT / kb_path).resolve()
    return kb_path


DATABASE_URL = _resolve_database_url()

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Fornece uma sessão SQLAlchemy por requisição e garante fechamento."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> tuple[bool, str | None]:
    """Executa SELECT 1 para validar conectividade ativa com o PostgreSQL."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True, None
    except SQLAlchemyError as exc:
        return False, str(exc)
