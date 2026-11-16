"""Schemas Pydantic e validação estrita de segurança para a API do TechExpert.

Implementa validação léxica (regex snake_case ASCII) e verificação contra
a whitelist de sintomas carregada da base oficial em Prolog, impedindo
injeção ou execução de termos arbitrários no SWI-Prolog (RNF05 e Seção 17).
"""

from datetime import datetime
import re
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from backend.app.database.seed import load_symptoms_from_prolog

ATOM_IDENTIFIER_RE = re.compile(r"^[a-z][a-z0-9_]{1,63}$")

_FORBIDDEN_CREDENTIAL_FIELDS = frozenset(
    {"senha", "password", "pass", "token", "secret", "chave", "pin", "credencial"}
)

_ALLOWED_SYMPTOM_CACHE: frozenset[str] | None = None


def refresh_allowed_symptom_identifiers() -> frozenset[str]:
    """Recarrega da base Prolog a whitelist oficial de átomos de sintomas."""
    global _ALLOWED_SYMPTOM_CACHE
    symptoms = load_symptoms_from_prolog()
    _ALLOWED_SYMPTOM_CACHE = frozenset(item["identificador"] for item in symptoms)
    return _ALLOWED_SYMPTOM_CACHE


def get_allowed_symptom_identifiers() -> frozenset[str]:
    """Retorna a whitelist em cache dos identificadores de sintomas permitidos."""
    if _ALLOWED_SYMPTOM_CACHE is None:
        return refresh_allowed_symptom_identifiers()
    return _ALLOWED_SYMPTOM_CACHE


def validate_atom_format(value: str, field_name: str = "identificador") -> str:
    """Valida se o valor é um átomo Prolog seguro em snake_case ASCII."""
    if not isinstance(value, str):
        raise ValueError(f"{field_name} deve ser uma string.")
    if not ATOM_IDENTIFIER_RE.fullmatch(value):
        raise ValueError(
            f"{field_name} inválido '{value}': use apenas letras minúsculas, "
            "números e '_' (2 a 64 caracteres, iniciando por letra)."
        )
    return value


def validate_symptom_atom(value: str, check_whitelist: bool = True) -> str:
    """Valida formato seguro de átomo e existência na whitelist de sintomas."""
    validate_atom_format(value, field_name="sintoma")
    if check_whitelist and value not in get_allowed_symptom_identifiers():
        raise ValueError(
            f"Sintoma desconhecido ou não autorizado: '{value}'."
        )
    return value


def validate_symptom_list(values: list[str], allow_empty: bool = False) -> list[str]:
    """Valida lista de sintomas e remove duplicatas preservando a ordem."""
    if not isinstance(values, list):
        raise ValueError("O campo 'sintomas' deve ser uma lista.")
    if not allow_empty and len(values) == 0:
        raise ValueError("Informe ao menos um sintoma observado.")

    deduped: list[str] = []
    seen: set[str] = set()
    for item in values:
        validated = validate_symptom_atom(item, check_whitelist=True)
        if validated not in seen:
            seen.add(validated)
            deduped.append(validated)
    return deduped


class ConsultaCreate(BaseModel):
    """Payload para abertura de nova consulta (RF01)."""

    model_config = ConfigDict(extra="forbid")

    usuario_id: int | None = Field(default=None, ge=1)
    descricao: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="before")
    @classmethod
    def _reject_sensitive_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            forbidden = {
                str(key)
                for key in data.keys()
                if str(key).lower() in _FORBIDDEN_CREDENTIAL_FIELDS
            }
            if forbidden:
                raise ValueError(
                    "O TechExpert não solicita nem aceita senhas ou informações "
                    f"confidenciais ({', '.join(sorted(forbidden))})."
                )
        return data

    @field_validator("descricao")
    @classmethod
    def _normalize_descricao(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned if cleaned else None


class ConsultaSummary(BaseModel):
    """Resumo de consulta para criação e listagem de histórico (RF01, RF07)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int | None = None
    data_consulta: datetime
    descricao: str | None = None
    status: str
    versao_regras: str | None = None


class SintomasInput(BaseModel):
    """Payload de registro de sintomas observados na consulta (RF02)."""

    model_config = ConfigDict(extra="forbid")

    sintomas: list[str]

    @field_validator("sintomas")
    @classmethod
    def _validate_sintomas(cls, value: list[str]) -> list[str]:
        return validate_symptom_list(value, allow_empty=False)


class SintomasRegistradosResponse(BaseModel):
    """Resposta após registro de sintomas em uma consulta."""

    consulta_id: int
    status: str
    sintomas_registrados: list[str]


class DiagnosticarRequest(BaseModel):
    """Payload opcional para execução de diagnóstico (RF03 / Seção 14)."""

    model_config = ConfigDict(extra="forbid")

    sintomas: list[str] | None = None

    @field_validator("sintomas")
    @classmethod
    def _validate_optional_sintomas(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        return validate_symptom_list(value, allow_empty=False)


class RecomendacaoItem(BaseModel):
    """Passo ordenado de recomendação com indicador de conhecimento técnico (RF04)."""

    model_config = ConfigDict(from_attributes=True)

    ordem_execucao: int = Field(..., ge=1)
    descricao: str
    requer_conhecimento_tecnico: bool = False


class ExplicacaoRegraItem(BaseModel):
    """Detalhamento de explicabilidade de uma regra aplicada (RF05 / RNF06)."""

    identificador_regra: str
    evidencias_utilizadas: list[str] = Field(default_factory=list)
    justificativa: str


class DiagnosticoItem(BaseModel):
    """Hipótese diagnóstica compatível com a Seção 14 e metadados explicáveis."""

    causa: str
    descricao_causa: str
    dominio: str | None = None
    nivel_confianca: float | None = None
    recomendacao: str
    recomendacoes: list[RecomendacaoItem] = Field(default_factory=list)
    regras_aplicadas: list[str] = Field(default_factory=list)
    explicacoes: list[ExplicacaoRegraItem] = Field(default_factory=list)


class SintomaComplementarItem(BaseModel):
    """Sugestão de sintoma complementar em formato de pergunta objetiva (RF09)."""

    identificador: str
    pergunta: str


class ContradicaoItem(BaseModel):
    """Par de sintomas mutuamente exclusivos detectados na consulta (Seção 12)."""

    sintoma_a: str
    sintoma_b: str
    motivo: str


class DiagnosticoResponse(BaseModel):
    """Resposta consolidada da execução de diagnóstico (Seção 14 + RF05/RF06/RF09)."""

    consulta_id: int
    status: str
    versao_regras: str
    aviso_hipotese: str
    diagnosticos: list[DiagnosticoItem] = Field(default_factory=list)
    sintomas_complementares: list[SintomaComplementarItem] = Field(default_factory=list)
    contradicoes: list[ContradicaoItem] = Field(default_factory=list)


class SintomaResumoItem(BaseModel):
    """Representação resumida de um sintoma associado à consulta."""

    model_config = ConfigDict(from_attributes=True)

    identificador: str
    descricao: str
    categoria: str


class ConsultaDetail(BaseModel):
    """Visão completa de uma consulta com sintomas e diagnósticos persistidos (RF07)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int | None = None
    data_consulta: datetime
    descricao: str | None = None
    status: str
    versao_regras: str | None = None
    sintomas: list[SintomaResumoItem] = Field(default_factory=list)
    diagnosticos: list[DiagnosticoItem] = Field(default_factory=list)


class SintomaCatalogItem(BaseModel):
    """Item do catálogo público de sintomas exibido pelo frontend."""

    model_config = ConfigDict(from_attributes=True)

    identificador: str
    descricao: str
    categoria: str
    pergunta_complementar: str | None = None


class CausaCatalogItem(BaseModel):
    """Item do catálogo público de possíveis diagnósticos."""

    identificador: str
    descricao: str
    categoria: str
    regras: list[str] = Field(default_factory=list)


class CatalogoDiagnosticosResponse(BaseModel):
    """Resposta de GET /api/diagnosticos com sintomas e causas disponíveis."""

    versao_regras: str
    total_sintomas: int
    total_diagnosticos: int
    sintomas: list[SintomaCatalogItem]
    diagnosticos: list[CausaCatalogItem]


class AdminConhecimentoUpdateRequest(BaseModel):
    """Payload administrativo controlado para atualização de sintoma no catálogo (RF08)."""

    model_config = ConfigDict(extra="forbid")

    identificador: str
    descricao: str = Field(..., min_length=3, max_length=255)
    categoria: str
    recarregar_motor: bool = True

    @field_validator("identificador")
    @classmethod
    def _validate_identificador(cls, value: str) -> str:
        return validate_atom_format(value, field_name="identificador")

    @field_validator("categoria")
    @classmethod
    def _validate_categoria(cls, value: str) -> str:
        return validate_atom_format(value, field_name="categoria")

    @field_validator("descricao")
    @classmethod
    def _clean_descricao(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 3:
            raise ValueError("Descrição deve ter ao menos 3 caracteres.")
        return cleaned
