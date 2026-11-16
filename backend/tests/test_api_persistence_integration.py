"""Testes de integração Backend (FastAPI Routes) ↔ Persistência Relacional (Seção 16.2)."""

from fastapi import HTTPException
import pytest
from sqlalchemy.orm import Session

from backend.app.database.models import (
    Consulta,
    ConsultaSintoma,
    Diagnostico,
    Recomendacao,
    RegraAplicada,
    Sintoma,
    Usuario,
)
from backend.app.main import app
from backend.app.routes.diagnostics import (
    admin_atualizar_sintoma,
    admin_obter_conhecimento,
    admin_recarregar_conhecimento,
    criar_consulta,
    diagnosticar_consulta,
    encerrar_consulta_patch,
    encerrar_consulta_post,
    listar_catalogo_diagnosticos,
    listar_consultas,
    obter_consulta,
    registrar_sintomas,
    require_admin,
)
from backend.app.schemas.diagnostic import (
    AdminConhecimentoUpdateRequest,
    ConsultaCreate,
    DiagnosticarRequest,
    SintomasInput,
)
from backend.app.services.prolog_service import PrologService


def test_openapi_registra_todas_as_rotas_esperadas() -> None:
    openapi = app.openapi()
    paths = set(openapi["paths"].keys())
    expected_paths = {
        "/health",
        "/api/consultas",
        "/api/consultas/{consulta_id}",
        "/api/consultas/{consulta_id}/sintomas",
        "/api/consultas/{consulta_id}/diagnosticar",
        "/api/consultas/{consulta_id}/encerrar",
        "/api/diagnosticos",
        "/api/admin/conhecimento",
        "/api/admin/conhecimento/recarregar",
        "/api/admin/conhecimento/sintomas",
    }
    assert expected_paths.issubset(paths)


def test_ciclo_de_vida_completo_consulta_e_persistencia(
    db_session: Session,
    prolog_service: PrologService,
) -> None:
    user = db_session.query(Usuario).filter_by(email="usuario@techexpert.local").one()

    # 1. Criação da consulta (RF01)
    criada = criar_consulta(
        payload=ConsultaCreate(
            usuario_id=user.id,
            descricao="Computador liga mas não apresenta imagem",
        ),
        db=db_session,
    )
    assert criada.status == "aberta"

    # 2. Registro de sintoma inicial insuficiente (RF02)
    reg1 = registrar_sintomas(
        consulta_id=criada.id,
        payload=SintomasInput(sintomas=["sem_imagem"]),
        substituir=False,
        db=db_session,
    )
    assert reg1.status == "em_investigacao"
    assert reg1.sintomas_registrados == ["sem_imagem"]

    # 3. Diagnóstico parcial gera status inconclusivo + perguntas complementares (RF09)
    diag1 = diagnosticar_consulta(
        consulta_id=criada.id,
        payload=None,
        substituir=False,
        db=db_session,
        prolog_service=prolog_service,
    )
    assert diag1.status == "inconclusiva"
    assert len(diag1.sintomas_complementares) >= 3
    assert db_session.query(Diagnostico).filter_by(consulta_id=criada.id).count() == 0

    # 4. Registro dos sintomas complementares e novo diagnóstico (RF03–RF06)
    reg2 = registrar_sintomas(
        consulta_id=criada.id,
        payload=SintomasInput(sintomas=["computador_ligado", "ventoinhas_funcionando"]),
        substituir=False,
        db=db_session,
    )
    assert set(reg2.sintomas_registrados) == {
        "sem_imagem",
        "computador_ligado",
        "ventoinhas_funcionando",
    }

    diag2 = diagnosticar_consulta(
        consulta_id=criada.id,
        payload=DiagnosticarRequest(),
        substituir=False,
        db=db_session,
        prolog_service=prolog_service,
    )
    assert diag2.status == "diagnosticada"
    assert diag2.versao_regras == "1.0.0"
    assert len(diag2.diagnosticos) == 1
    assert diag2.diagnosticos[0].causa == "possivel_falha_ram"
    assert diag2.diagnosticos[0].regras_aplicadas == ["regra_video_02"]

    # Verifica persistência física nas 7 entidades
    consulta_db = db_session.query(Consulta).filter_by(id=criada.id).one()
    assert consulta_db.versao_regras == "1.0.0"
    assert (
        db_session.query(ConsultaSintoma).filter_by(consulta_id=criada.id).count() == 3
    )
    diag_db = db_session.query(Diagnostico).filter_by(consulta_id=criada.id).one()
    assert diag_db.identificador == "possivel_falha_ram"
    assert (
        db_session.query(Recomendacao).filter_by(diagnostico_id=diag_db.id).count() == 3
    )
    regra_db = db_session.query(RegraAplicada).filter_by(diagnostico_id=diag_db.id).one()
    assert regra_db.identificador_regra == "regra_video_02"

    # 5. Consulta detalhada, listagem de histórico e catálogo (RF07, Seção 14)
    detalhe = obter_consulta(consulta_id=criada.id, db=db_session)
    assert len(detalhe.sintomas) == 3
    assert len(detalhe.diagnosticos) == 1
    assert [r.ordem_execucao for r in detalhe.diagnosticos[0].recomendacoes] == [1, 2, 3]

    historico = listar_consultas(
        status_filtro="diagnosticada",
        usuario_id=user.id,
        limit=20,
        offset=0,
        db=db_session,
    )
    assert len(historico) == 1
    assert historico[0].id == criada.id

    catalogo = listar_catalogo_diagnosticos(prolog_service=prolog_service)
    assert catalogo.total_sintomas == 36
    assert catalogo.total_diagnosticos == 19

    # 6. Encerramento explícito (RF10) e bloqueio de novas alterações com 409
    encerrada = encerrar_consulta_patch(consulta_id=criada.id, db=db_session)
    assert encerrada.status == "encerrada"

    with pytest.raises(HTTPException) as exc_sint:
        registrar_sintomas(
            consulta_id=criada.id,
            payload=SintomasInput(sintomas=["sem_imagem"]),
            substituir=False,
            db=db_session,
        )
    assert exc_sint.value.status_code == 409

    with pytest.raises(HTTPException) as exc_diag:
        diagnosticar_consulta(
            consulta_id=criada.id,
            payload=None,
            substituir=False,
            db=db_session,
            prolog_service=prolog_service,
        )
    assert exc_diag.value.status_code == 409

    with pytest.raises(HTTPException) as exc_close:
        encerrar_consulta_post(consulta_id=criada.id, db=db_session)
    assert exc_close.value.status_code == 409


def test_multiplas_hipoteses_e_reavaliacao_com_substituir(
    db_session: Session,
    prolog_service: PrologService,
) -> None:
    consulta = criar_consulta(payload=None, db=db_session)

    res_multi = diagnosticar_consulta(
        consulta_id=consulta.id,
        payload=DiagnosticarRequest(
            sintomas=[
                "sem_imagem",
                "monitor_desligado",
                "computador_ligado",
                "ventoinhas_funcionando",
            ]
        ),
        substituir=False,
        db=db_session,
        prolog_service=prolog_service,
    )
    assert len(res_multi.diagnosticos) == 2
    assert db_session.query(Diagnostico).filter_by(consulta_id=consulta.id).count() == 2

    # Reavalia substituindo sintomas por cenário de DNS
    res_dns = diagnosticar_consulta(
        consulta_id=consulta.id,
        payload=DiagnosticarRequest(
            sintomas=["sem_internet", "acessa_por_ip", "nao_acessa_por_dominio"]
        ),
        substituir=True,
        db=db_session,
        prolog_service=prolog_service,
    )
    assert [d.causa for d in res_dns.diagnosticos] == ["possivel_falha_dns"]
    assert db_session.query(Diagnostico).filter_by(consulta_id=consulta.id).count() == 1
    assert (
        db_session.query(ConsultaSintoma).filter_by(consulta_id=consulta.id).count() == 3
    )


def test_erros_404_para_consulta_ou_usuario_inexistente(
    db_session: Session,
    prolog_service: PrologService,
) -> None:
    with pytest.raises(HTTPException) as exc_user:
        criar_consulta(
            payload=ConsultaCreate(usuario_id=99999, descricao="Usuário inválido"),
            db=db_session,
        )
    assert exc_user.value.status_code == 404

    with pytest.raises(HTTPException) as exc_get:
        obter_consulta(consulta_id=99999, db=db_session)
    assert exc_get.value.status_code == 404

    with pytest.raises(HTTPException) as exc_diag:
        diagnosticar_consulta(
            consulta_id=99999,
            payload=None,
            substituir=False,
            db=db_session,
            prolog_service=prolog_service,
        )
    assert exc_diag.value.status_code == 404


def test_rotas_administrativas_rf08_protecao_e_atualizacao(
    db_session: Session,
    prolog_service: PrologService,
) -> None:
    user = db_session.query(Usuario).filter_by(email="usuario@techexpert.local").one()
    admin = db_session.query(Usuario).filter_by(email="admin@techexpert.local").one()

    with pytest.raises(HTTPException) as exc_missing:
        require_admin(x_admin_key=None, x_admin_user_id=None, db=db_session)
    assert exc_missing.value.status_code == 401

    with pytest.raises(HTTPException) as exc_bad_key:
        require_admin(x_admin_key="chave-errada", x_admin_user_id=None, db=db_session)
    assert exc_bad_key.value.status_code == 403

    with pytest.raises(HTTPException) as exc_role:
        require_admin(
            x_admin_key="techexpert-dev-admin-key",
            x_admin_user_id=user.id,
            db=db_session,
        )
    assert exc_role.value.status_code == 403

    admin_ctx = require_admin(
        x_admin_key="techexpert-dev-admin-key",
        x_admin_user_id=admin.id,
        db=db_session,
    )
    info = admin_obter_conhecimento(
        _admin=admin_ctx,
        db=db_session,
        prolog_service=prolog_service,
    )
    assert info["total_sintomas_prolog"] == 36
    assert info["total_sintomas_banco"] == 36

    reloaded = admin_recarregar_conhecimento(
        _admin=admin_ctx,
        db=db_session,
        prolog_service=prolog_service,
    )
    assert reloaded["sintomas_sincronizados_banco"] == 36

    updated = admin_atualizar_sintoma(
        payload=AdminConhecimentoUpdateRequest(
            identificador="sintoma_custom_admin",
            descricao="Sintoma administrativo de teste",
            categoria="hardware",
            recarregar_motor=True,
        ),
        _admin=admin_ctx,
        db=db_session,
        prolog_service=prolog_service,
    )
    assert updated["acao"] == "criado"
    assert (
        db_session.query(Sintoma)
        .filter_by(identificador="sintoma_custom_admin")
        .one()
        .categoria
        == "hardware"
    )

