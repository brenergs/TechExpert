"""Rotas REST da API do TechExpert (Seção 14 e requisitos RF01–RF10)."""

import os
import secrets
from typing import Any

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from backend.app.database.connection import get_db
from backend.app.database.models import (
    Consulta,
    ConsultaSintoma,
    Diagnostico,
    Recomendacao,
    RegraAplicada,
    Sintoma,
    Usuario,
)
from backend.app.database.seed import seed_symptoms
from backend.app.schemas.diagnostic import (
    AdminConhecimentoUpdateRequest,
    CatalogoDiagnosticosResponse,
    ConsultaCreate,
    ConsultaDetail,
    ConsultaSummary,
    DiagnosticarRequest,
    DiagnosticoItem,
    DiagnosticoResponse,
    ExplicacaoRegraItem,
    RecomendacaoItem,
    SintomaResumoItem,
    SintomasInput,
    SintomasRegistradosResponse,
)
from backend.app.services.prolog_service import (
    PrologService,
    PrologServiceError,
    get_prolog_service,
)

router = APIRouter(prefix="/api", tags=["Diagnósticos e Consultas"])


def _get_admin_api_key() -> str:
    """Retorna a chave administrativa configurada para proteção de RF08."""
    return os.getenv("ADMIN_API_KEY", "techexpert-dev-admin-key")


def require_admin(
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
    x_admin_user_id: int | None = Header(default=None, alias="X-Admin-User-Id"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Valida credencial administrativa e papel de administrador para RF08."""
    if not x_admin_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cabeçalho X-Admin-Key obrigatório para acesso administrativo.",
        )
    expected = _get_admin_api_key()
    if not secrets.compare_digest(x_admin_key, expected):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Credencial administrativa inválida.",
        )

    if x_admin_user_id is not None:
        user = db.query(Usuario).filter(Usuario.id == x_admin_user_id).first()
        if user is None or user.papel != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário informado não possui permissão de administrador.",
            )
    return {"authorized": True, "admin_user_id": x_admin_user_id}


def _get_consulta_or_404(
    consulta_id: int,
    db: Session,
    with_relations: bool = False,
) -> Consulta:
    """Busca consulta por ID ou lança HTTP 404."""
    query = db.query(Consulta)
    if with_relations:
        query = query.options(
            selectinload(Consulta.sintomas),
            selectinload(Consulta.diagnosticos).selectinload(Diagnostico.recomendacoes),
            selectinload(Consulta.diagnosticos).selectinload(Diagnostico.regras_aplicadas),
        )
    consulta = query.filter(Consulta.id == consulta_id).first()
    if consulta is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Consulta {consulta_id} não encontrada.",
        )
    return consulta


def _ensure_consulta_not_closed(consulta: Consulta) -> None:
    """Impede modificações em consultas já finalizadas (RF10)."""
    if consulta.status == "encerrada":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A consulta {consulta.id} já foi encerrada e não aceita alterações.",
        )


def _sync_consulta_sintomas(
    consulta: Consulta,
    sintoma_ids: list[str],
    db: Session,
    substituir: bool = False,
) -> list[str]:
    """Associa sintomas validados à consulta garantindo sincronia com a tabela sintoma."""
    records = (
        db.query(Sintoma)
        .filter(Sintoma.identificador.in_(sintoma_ids))
        .all()
    )
    by_ident = {item.identificador: item for item in records}

    missing = [ident for ident in sintoma_ids if ident not in by_ident]
    if missing:
        seed_symptoms(db)
        records = (
            db.query(Sintoma)
            .filter(Sintoma.identificador.in_(sintoma_ids))
            .all()
        )
        by_ident = {item.identificador: item for item in records}

    still_missing = [ident for ident in sintoma_ids if ident not in by_ident]
    if still_missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sintomas não cadastrados no banco: {', '.join(still_missing)}.",
        )

    if substituir:
        db.query(ConsultaSintoma).filter(
            ConsultaSintoma.consulta_id == consulta.id
        ).delete(synchronize_session=False)
        db.flush()
        existing_ids: set[int] = set()
    else:
        existing_ids = {
            row[0]
            for row in db.query(ConsultaSintoma.sintoma_id)
            .filter(ConsultaSintoma.consulta_id == consulta.id)
            .all()
        }

    for ident in sintoma_ids:
        sintoma_obj = by_ident[ident]
        if sintoma_obj.id not in existing_ids:
            db.add(
                ConsultaSintoma(
                    consulta_id=consulta.id,
                    sintoma_id=sintoma_obj.id,
                )
            )
            existing_ids.add(sintoma_obj.id)

    consulta.status = "em_investigacao"
    db.flush()

    db.expire(consulta, ["sintomas", "consulta_sintomas"])
    return [item.identificador for item in consulta.sintomas]


@router.post(
    "/consultas",
    response_model=ConsultaSummary,
    status_code=status.HTTP_201_CREATED,
    summary="Criar uma nova consulta (RF01)",
)
def criar_consulta(
    payload: ConsultaCreate | None = Body(default=None),
    db: Session = Depends(get_db),
) -> ConsultaSummary:
    """Inicia uma nova investigação de problema computacional."""
    data = payload or ConsultaCreate()
    if data.usuario_id is not None:
        user_exists = db.query(Usuario.id).filter(Usuario.id == data.usuario_id).first()
        if user_exists is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuário {data.usuario_id} não encontrado.",
            )

    consulta = Consulta(
        usuario_id=data.usuario_id,
        descricao=data.descricao,
        status="aberta",
    )
    db.add(consulta)
    db.commit()
    db.refresh(consulta)
    return ConsultaSummary.model_validate(consulta)


@router.post(
    "/consultas/{consulta_id}/sintomas",
    response_model=SintomasRegistradosResponse,
    summary="Registrar sintomas observados (RF02)",
)
def registrar_sintomas(
    consulta_id: int,
    payload: SintomasInput,
    substituir: bool = Query(
        default=False,
        description="Se verdadeiro, substitui os sintomas anteriores em vez de acumular.",
    ),
    db: Session = Depends(get_db),
) -> SintomasRegistradosResponse:
    """Valida e registra os sintomas informados pelo usuário para a consulta."""
    consulta = _get_consulta_or_404(consulta_id, db)
    _ensure_consulta_not_closed(consulta)

    registrados = _sync_consulta_sintomas(
        consulta=consulta,
        sintoma_ids=payload.sintomas,
        db=db,
        substituir=substituir,
    )
    db.commit()

    return SintomasRegistradosResponse(
        consulta_id=consulta.id,
        status=consulta.status,
        sintomas_registrados=registrados,
    )


@router.post(
    "/consultas/{consulta_id}/diagnosticar",
    response_model=DiagnosticoResponse,
    summary="Executar diagnóstico lógico no motor Prolog (RF03–RF06, RF09)",
)
def diagnosticar_consulta(
    consulta_id: int,
    payload: DiagnosticarRequest | None = Body(default=None),
    substituir: bool = Query(
        default=False,
        description="Se verdadeiro e houver sintomas no corpo, substitui os anteriores.",
    ),
    db: Session = Depends(get_db),
    prolog_service: PrologService = Depends(get_prolog_service),
) -> DiagnosticoResponse:
    """Executa inferência no SWI-Prolog e persiste hipóteses, recomendações e regras."""
    consulta = _get_consulta_or_404(consulta_id, db, with_relations=True)
    _ensure_consulta_not_closed(consulta)

    if payload is not None and payload.sintomas is not None:
        sintomas_para_avaliar = _sync_consulta_sintomas(
            consulta=consulta,
            sintoma_ids=payload.sintomas,
            db=db,
            substituir=substituir,
        )
    else:
        sintomas_para_avaliar = [item.identificador for item in consulta.sintomas]

    try:
        resultado = prolog_service.executar_diagnostico(
            sintomas=sintomas_para_avaliar,
            consulta_id=consulta.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except PrologServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    # Substitui diagnósticos anteriores da mesma consulta após nova avaliação
    consulta.diagnosticos.clear()
    db.flush()

    consulta.versao_regras = resultado["versao_regras"]
    consulta.status = resultado["status"]

    for item in resultado["diagnosticos"]:
        diag = Diagnostico(
            consulta_id=consulta.id,
            identificador=item["causa"],
            descricao=item["descricao_causa"],
            nivel_confianca=item.get("nivel_confianca"),
        )
        db.add(diag)
        db.flush()

        for rec in item.get("recomendacoes", []):
            db.add(
                Recomendacao(
                    diagnostico_id=diag.id,
                    descricao=rec["descricao"],
                    ordem_execucao=rec["ordem_execucao"],
                    requer_conhecimento_tecnico=rec.get(
                        "requer_conhecimento_tecnico", False
                    ),
                )
            )

        for exp in item.get("explicacoes", []):
            db.add(
                RegraAplicada(
                    diagnostico_id=diag.id,
                    identificador_regra=exp["identificador_regra"],
                    justificativa=exp["justificativa"],
                )
            )

    db.commit()
    return DiagnosticoResponse.model_validate(resultado)


@router.get(
    "/consultas/{consulta_id}",
    response_model=ConsultaDetail,
    summary="Consultar resultados detalhados de uma consulta (RF04–RF07)",
)
def obter_consulta(
    consulta_id: int,
    db: Session = Depends(get_db),
) -> ConsultaDetail:
    """Retorna os dados da consulta, sintomas informados, hipóteses e explicações."""
    consulta = _get_consulta_or_404(consulta_id, db, with_relations=True)

    sintoma_idents = [item.identificador for item in consulta.sintomas]
    diag_items: list[DiagnosticoItem] = []

    for diag in consulta.diagnosticos:
        recs = [
            RecomendacaoItem.model_validate(rec)
            for rec in sorted(diag.recomendacoes, key=lambda r: r.ordem_execucao)
        ]
        regras = [regra.identificador_regra for regra in diag.regras_aplicadas]
        explicacoes = [
            ExplicacaoRegraItem(
                identificador_regra=regra.identificador_regra,
                evidencias_utilizadas=sintoma_idents,
                justificativa=regra.justificativa,
            )
            for regra in diag.regras_aplicadas
        ]
        diag_items.append(
            DiagnosticoItem(
                causa=diag.identificador,
                descricao_causa=diag.descricao,
                nivel_confianca=diag.nivel_confianca,
                recomendacao=recs[0].descricao if recs else diag.descricao,
                recomendacoes=recs,
                regras_aplicadas=regras,
                explicacoes=explicacoes,
            )
        )

    return ConsultaDetail(
        id=consulta.id,
        usuario_id=consulta.usuario_id,
        data_consulta=consulta.data_consulta,
        descricao=consulta.descricao,
        status=consulta.status,
        versao_regras=consulta.versao_regras,
        sintomas=[SintomaResumoItem.model_validate(s) for s in consulta.sintomas],
        diagnosticos=diag_items,
    )


@router.get(
    "/consultas",
    response_model=list[ConsultaSummary],
    summary="Listar histórico de consultas realizadas (RF07)",
)
def listar_consultas(
    status_filtro: str | None = Query(default=None, alias="status"),
    usuario_id: int | None = Query(default=None, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[ConsultaSummary]:
    """Lista o histórico de consultas ordenado da mais recente para a mais antiga."""
    query = db.query(Consulta)
    if status_filtro:
        query = query.filter(Consulta.status == status_filtro)
    if usuario_id is not None:
        query = query.filter(Consulta.usuario_id == usuario_id)

    rows = (
        query.order_by(Consulta.data_consulta.desc(), Consulta.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [ConsultaSummary.model_validate(row) for row in rows]


@router.get(
    "/diagnosticos",
    response_model=CatalogoDiagnosticosResponse,
    summary="Consultar diagnósticos e catálogo de sintomas disponíveis (Seção 14)",
)
def listar_catalogo_diagnosticos(
    prolog_service: PrologService = Depends(get_prolog_service),
) -> CatalogoDiagnosticosResponse:
    """Retorna a versão da base, sintomas categorizados e diagnósticos possíveis."""
    try:
        return prolog_service.listar_catalogo()
    except PrologServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


def _close_consulta_handler(consulta_id: int, db: Session) -> ConsultaSummary:
    """Finaliza uma investigação impedindo novas alterações."""
    consulta = _get_consulta_or_404(consulta_id, db)
    _ensure_consulta_not_closed(consulta)
    consulta.status = "encerrada"
    db.commit()
    db.refresh(consulta)
    return ConsultaSummary.model_validate(consulta)


@router.patch(
    "/consultas/{consulta_id}/encerrar",
    response_model=ConsultaSummary,
    summary="Finalizar uma investigação (RF10)",
)
def encerrar_consulta_patch(
    consulta_id: int,
    db: Session = Depends(get_db),
) -> ConsultaSummary:
    """Finaliza a consulta alterando o status para 'encerrada'."""
    return _close_consulta_handler(consulta_id, db)


@router.post(
    "/consultas/{consulta_id}/encerrar",
    response_model=ConsultaSummary,
    summary="Finalizar uma investigação via POST (RF10)",
)
def encerrar_consulta_post(
    consulta_id: int,
    db: Session = Depends(get_db),
) -> ConsultaSummary:
    """Alias POST para finalização explícita de uma consulta."""
    return _close_consulta_handler(consulta_id, db)


@router.get(
    "/admin/conhecimento",
    tags=["Administração (RF08)"],
    summary="Consultar status da base de conhecimento (Admin - RF08)",
)
def admin_obter_conhecimento(
    _admin: dict[str, Any] = Depends(require_admin),
    db: Session = Depends(get_db),
    prolog_service: PrologService = Depends(get_prolog_service),
) -> dict[str, Any]:
    """Retorna estado sincronizado do catálogo no Prolog e no PostgreSQL."""
    catalogo = prolog_service.listar_catalogo()
    db_sintomas = db.query(Sintoma).count()
    return {
        "versao_regras": catalogo.versao_regras,
        "prolog_backend_mode": prolog_service.backend_mode,
        "total_sintomas_prolog": catalogo.total_sintomas,
        "total_sintomas_banco": db_sintomas,
        "total_diagnosticos": catalogo.total_diagnosticos,
        "sintomas": [item.model_dump() for item in catalogo.sintomas],
        "diagnosticos": [item.model_dump() for item in catalogo.diagnosticos],
    }


@router.post(
    "/admin/conhecimento/recarregar",
    tags=["Administração (RF08)"],
    summary="Recarregar base Prolog e ressincronizar sintomas (Admin - RF08)",
)
def admin_recarregar_conhecimento(
    _admin: dict[str, Any] = Depends(require_admin),
    db: Session = Depends(get_db),
    prolog_service: PrologService = Depends(get_prolog_service),
) -> dict[str, Any]:
    """Recarrega a base SWI-Prolog, whitelist e tabela Sintoma."""
    reload_info = prolog_service.recarregar_base_conhecimento()
    sincronizados = seed_symptoms(db)
    return {
        **reload_info,
        "sintomas_sincronizados_banco": sincronizados,
    }


@router.put(
    "/admin/conhecimento/sintomas",
    tags=["Administração (RF08)"],
    summary="Cadastrar ou atualizar descrição/categoria de sintoma (Admin - RF08)",
)
def admin_atualizar_sintoma(
    payload: AdminConhecimentoUpdateRequest,
    _admin: dict[str, Any] = Depends(require_admin),
    db: Session = Depends(get_db),
    prolog_service: PrologService = Depends(get_prolog_service),
) -> dict[str, Any]:
    """Atualiza metadado de sintoma no catálogo relacional com recarga opcional."""
    sintoma_obj = (
        db.query(Sintoma)
        .filter(Sintoma.identificador == payload.identificador)
        .first()
    )
    acao = "atualizado"
    if sintoma_obj is None:
        sintoma_obj = Sintoma(
            identificador=payload.identificador,
            descricao=payload.descricao,
            categoria=payload.categoria,
        )
        db.add(sintoma_obj)
        acao = "criado"
    else:
        sintoma_obj.descricao = payload.descricao
        sintoma_obj.categoria = payload.categoria

    db.commit()
    db.refresh(sintoma_obj)

    reload_info = None
    if payload.recarregar_motor:
        reload_info = prolog_service.recarregar_base_conhecimento()

    return {
        "acao": acao,
        "sintoma": {
            "id": sintoma_obj.id,
            "identificador": sintoma_obj.identificador,
            "descricao": sintoma_obj.descricao,
            "categoria": sintoma_obj.categoria,
        },
        "motor": reload_info,
    }
