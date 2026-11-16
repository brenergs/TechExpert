"""Modelos ORM (SQLAlchemy) para o banco de dados PostgreSQL do TechExpert.

Implementa as 7 entidades definidas na Seção 13 da especificação:
Usuario, Consulta, Sintoma, Consulta_Sintoma, Diagnostico, Recomendacao e Regra_Aplicada.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from backend.app.database.connection import Base


def _utcnow() -> datetime:
    """Retorna o timestamp UTC atual para valores padrão no ORM."""
    return datetime.now(timezone.utc)


class Usuario(Base):
    """Entidade Usuario (Seção 13): solicitantes e administradores autorizados (RF08)."""

    __tablename__ = "usuario"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(120), nullable=False)
    email = Column(String(180), unique=True, nullable=False, index=True)
    papel = Column(String(20), nullable=False, default="usuario", server_default="usuario")
    data_criacao = Column(
        DateTime(timezone=True),
        nullable=False,
        default=_utcnow,
        server_default=func.now(),
    )

    consultas = relationship("Consulta", back_populates="usuario")


class Consulta(Base):
    """Entidade Consulta (Seção 13): investigações de problemas e versão da base aplicada."""

    __tablename__ = "consulta"
    __table_args__ = (
        Index("idx_consulta_usuario_data", "usuario_id", "data_consulta"),
    )

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(
        Integer,
        ForeignKey("usuario.id", ondelete="SET NULL"),
        nullable=True,
    )
    data_consulta = Column(
        DateTime(timezone=True),
        nullable=False,
        default=_utcnow,
        server_default=func.now(),
    )
    descricao = Column(Text, nullable=True)
    status = Column(String(30), nullable=False, default="aberta", server_default="aberta")
    versao_regras = Column(String(20), nullable=True)

    usuario = relationship("Usuario", back_populates="consultas")
    consulta_sintomas = relationship(
        "ConsultaSintoma",
        back_populates="consulta",
        cascade="all, delete-orphan",
        overlaps="sintomas,consultas",
    )
    sintomas = relationship(
        "Sintoma",
        secondary="consulta_sintoma",
        back_populates="consultas",
        overlaps="consulta_sintomas,consulta,sintoma",
    )
    diagnosticos = relationship(
        "Diagnostico",
        back_populates="consulta",
        cascade="all, delete-orphan",
    )


class Sintoma(Base):
    """Entidade Sintoma (Seção 13): catálogo sincronizado com prolog/facts/symptoms.pl."""

    __tablename__ = "sintoma"

    id = Column(Integer, primary_key=True, index=True)
    identificador = Column(String(64), unique=True, nullable=False, index=True)
    descricao = Column(String(255), nullable=False)
    categoria = Column(String(40), nullable=False, index=True)

    consulta_sintomas = relationship(
        "ConsultaSintoma",
        back_populates="sintoma",
        overlaps="consultas,sintomas",
    )
    consultas = relationship(
        "Consulta",
        secondary="consulta_sintoma",
        back_populates="sintomas",
        overlaps="consulta_sintomas,consulta,sintoma",
    )


class ConsultaSintoma(Base):
    """Entidade associativa Consulta_Sintoma (Seção 13): vínculo N:N entre Consulta e Sintoma."""

    __tablename__ = "consulta_sintoma"

    consulta_id = Column(
        Integer,
        ForeignKey("consulta.id", ondelete="CASCADE"),
        primary_key=True,
    )
    sintoma_id = Column(
        Integer,
        ForeignKey("sintoma.id", ondelete="RESTRICT"),
        primary_key=True,
    )

    consulta = relationship(
        "Consulta",
        back_populates="consulta_sintomas",
        overlaps="sintomas,consultas",
    )
    sintoma = relationship(
        "Sintoma",
        back_populates="consulta_sintomas",
        overlaps="sintomas,consultas",
    )


class Diagnostico(Base):
    """Entidade Diagnostico (Seção 13): hipóteses técnicas identificadas pelo motor Prolog."""

    __tablename__ = "diagnostico"

    id = Column(Integer, primary_key=True, index=True)
    consulta_id = Column(
        Integer,
        ForeignKey("consulta.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    identificador = Column(String(64), nullable=False)
    descricao = Column(Text, nullable=False)
    nivel_confianca = Column(Float, nullable=True)

    consulta = relationship("Consulta", back_populates="diagnosticos")
    recomendacoes = relationship(
        "Recomendacao",
        back_populates="diagnostico",
        cascade="all, delete-orphan",
        order_by="Recomendacao.ordem_execucao",
    )
    regras_aplicadas = relationship(
        "RegraAplicada",
        back_populates="diagnostico",
        cascade="all, delete-orphan",
    )


class Recomendacao(Base):
    """Entidade Recomendacao (Seção 13): passos ordenados de resolução com alerta técnico."""

    __tablename__ = "recomendacao"

    id = Column(Integer, primary_key=True, index=True)
    diagnostico_id = Column(
        Integer,
        ForeignKey("diagnostico.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    descricao = Column(Text, nullable=False)
    ordem_execucao = Column(Integer, nullable=False)
    requer_conhecimento_tecnico = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    diagnostico = relationship("Diagnostico", back_populates="recomendacoes")


class RegraAplicada(Base):
    """Entidade Regra_Aplicada (Seção 13): registro das regras e justificativas da inferência."""

    __tablename__ = "regra_aplicada"

    id = Column(Integer, primary_key=True, index=True)
    diagnostico_id = Column(
        Integer,
        ForeignKey("diagnostico.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    identificador_regra = Column(String(64), nullable=False)
    justificativa = Column(Text, nullable=False)

    diagnostico = relationship("Diagnostico", back_populates="regras_aplicadas")


# Aliases alinhados exatamente aos nomes das entidades na Seção 13 do PDF
Consulta_Sintoma = ConsultaSintoma
Regra_Aplicada = RegraAplicada
