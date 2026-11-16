"""Fixtures compartilhadas para os testes de integração do backend TechExpert."""

from collections.abc import Generator
import os
from pathlib import Path
import sys

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.database.connection import Base  # noqa: E402
from backend.app.database.seed import initialize_and_seed_database  # noqa: E402
from backend.app.services.prolog_service import (  # noqa: E402
    PrologService,
    get_prolog_service,
)


@pytest.fixture(scope="session")
def prolog_service() -> PrologService:
    """Fornece instância real do PrologService conectada à base de conhecimento."""
    return get_prolog_service()


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    """Cria banco relacional isolado e populado com seed oficial para cada teste."""
    test_db_url = os.getenv("TEST_DATABASE_URL", "sqlite:///:memory:")

    if test_db_url.startswith("sqlite"):
        test_engine = create_engine(
            test_db_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )

        @event.listens_for(test_engine, "connect")
        def _enable_sqlite_fks(dbapi_connection, _connection_record) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
    else:
        test_engine = create_engine(test_db_url, pool_pre_ping=True)

    initialize_and_seed_database(target_engine=test_engine)
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine,
    )
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)
        test_engine.dispose()

