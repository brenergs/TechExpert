"""Rotina de inicialização e seed da tabela Sintoma sincronizada com o Prolog."""

from pathlib import Path
import re

from sqlalchemy import Engine
from sqlalchemy.orm import Session, sessionmaker

from backend.app.database.connection import (
    engine as default_engine,
    init_db,
    resolve_prolog_facts_path,
)
from backend.app.database.models import Sintoma, Usuario

_SYMPTOM_FACT_RE = re.compile(
    r'^sintoma\(\s*([a-z][a-z0-9_]*)\s*,\s*"([^"]+)"\s*,\s*([a-z][a-z0-9_]*)\s*\)\.\s*$'
)


def load_symptoms_from_prolog(symptoms_file: Path | None = None) -> list[dict[str, str]]:
    """Lê prolog/facts/symptoms.pl em UTF-8 e extrai os fatos sintoma/3."""
    target_file = symptoms_file or resolve_prolog_facts_path()
    if not target_file.is_file():
        raise FileNotFoundError(
            f"Arquivo de fatos Prolog não encontrado: {target_file}"
        )

    symptoms: list[dict[str, str]] = []
    with target_file.open("r", encoding="utf-8") as handle:
        for line in handle:
            match = _SYMPTOM_FACT_RE.match(line.strip())
            if not match:
                continue
            identificador, descricao, categoria = match.groups()
            symptoms.append(
                {
                    "identificador": identificador,
                    "descricao": descricao,
                    "categoria": categoria,
                }
            )
    return symptoms


def seed_symptoms(session: Session, symptoms_file: Path | None = None) -> int:
    """Insere ou atualiza os sintomas na tabela sintoma de forma idempotente."""
    parsed = load_symptoms_from_prolog(symptoms_file)
    existing = {item.identificador: item for item in session.query(Sintoma).all()}

    for item in parsed:
        identificador = item["identificador"]
        if identificador in existing:
            record = existing[identificador]
            record.descricao = item["descricao"]
            record.categoria = item["categoria"]
        else:
            session.add(
                Sintoma(
                    identificador=identificador,
                    descricao=item["descricao"],
                    categoria=item["categoria"],
                )
            )

    session.commit()
    return len(parsed)


def seed_default_users(session: Session) -> None:
    """Garante usuários iniciais (usuário padrão e administrador para RF08)."""
    defaults = [
        {
            "nome": "Usuário Padrão",
            "email": "usuario@techexpert.local",
            "papel": "usuario",
        },
        {
            "nome": "Administrador TechExpert",
            "email": "admin@techexpert.local",
            "papel": "admin",
        },
    ]
    existing_emails = {
        row[0] for row in session.query(Usuario.email).all()
    }
    for user in defaults:
        if user["email"] not in existing_emails:
            session.add(Usuario(**user))
    session.commit()


def initialize_and_seed_database(
    target_engine: Engine | None = None,
    symptoms_file: Path | None = None,
) -> int:
    """Cria as tabelas no banco e popula usuários padrão e os sintomas do Prolog."""
    resolved_engine = target_engine or default_engine
    init_db(resolved_engine)

    local_session_factory = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=resolved_engine,
    )
    with local_session_factory() as session:
        seed_default_users(session)
        return seed_symptoms(session, symptoms_file=symptoms_file)


if __name__ == "__main__":
    total = initialize_and_seed_database()
    print(f"Seed concluído com sucesso: {total} sintomas sincronizados.")

