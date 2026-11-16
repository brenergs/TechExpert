"""Testes de integração Python ↔ SWI-Prolog (Seção 16.2)."""

from pydantic import ValidationError
import pytest

from backend.app.schemas.diagnostic import ConsultaCreate, SintomasInput
from backend.app.services.prolog_service import PrologService


def test_catalogo_e_versao_regras(prolog_service: PrologService) -> None:
    assert prolog_service.obter_versao_regras() == "1.0.0"

    catalogo = prolog_service.listar_catalogo()
    assert catalogo.versao_regras == "1.0.0"
    assert catalogo.total_sintomas == 36
    assert catalogo.total_diagnosticos == 19
    assert len(catalogo.sintomas) == 36
    assert len(catalogo.diagnosticos) == 19
    assert all(item.pergunta_complementar for item in catalogo.sintomas)


def test_caso_oficial_secao_14_falha_ram(prolog_service: PrologService) -> None:
    resultado = prolog_service.executar_diagnostico(
        ["sem_imagem", "computador_ligado", "ventoinhas_funcionando"],
        consulta_id=10,
    )

    assert resultado["consulta_id"] == 10
    assert resultado["status"] == "diagnosticada"
    assert resultado["versao_regras"] == "1.0.0"
    assert len(resultado["diagnosticos"]) == 1

    diag = resultado["diagnosticos"][0]
    assert diag["causa"] == "possivel_falha_ram"
    assert diag["recomendacao"] == "Investigue os modulos de memoria RAM"
    assert diag["regras_aplicadas"] == ["regra_video_02"]
    assert diag["explicacoes"][0]["evidencias_utilizadas"] == [
        "sem_imagem",
        "computador_ligado",
        "ventoinhas_funcionando",
    ]


@pytest.mark.parametrize(
    ("sintomas", "causa_esperada", "regra_esperada"),
    [
        (
            ["computador_nao_liga", "sem_leds_acesos", "ventoinhas_paradas"],
            "falha_alimentacao_eletrica",
            "regra_init_01",
        ),
        (
            ["sem_imagem", "monitor_desligado"],
            "problema_monitor",
            "regra_video_01",
        ),
        (
            ["computador_ligado", "sem_imagem", "bipes_continuos_placa_mae"],
            "falha_contato_ou_modulo_ram",
            "regra_ram_01",
        ),
        (
            ["computador_lento", "muita_memoria_utilizada"],
            "uso_excessivo_memoria",
            "regra_perf_01",
        ),
        (
            ["computador_lento", "pouco_espaco_disco"],
            "armazenamento_quase_cheio",
            "regra_perf_03",
        ),
        (
            ["sem_internet", "conectado_rede_local", "nao_responde_gateway"],
            "falha_roteador_ou_gateway",
            "regra_rede_02",
        ),
        (
            ["sem_internet", "acessa_por_ip", "nao_acessa_por_dominio"],
            "possivel_falha_dns",
            "regra_dns_01",
        ),
        (
            ["desligamento_subito", "gabinete_muito_quente", "ventoinhas_alta_rotacao"],
            "superaquecimento_cpu_gpu",
            "regra_temp_01",
        ),
    ],
)
def test_diagnostico_todos_os_sete_dominios(
    prolog_service: PrologService,
    sintomas: list[str],
    causa_esperada: str,
    regra_esperada: str,
) -> None:
    resultado = prolog_service.executar_diagnostico(sintomas, consulta_id=1)

    assert resultado["status"] == "diagnosticada"
    causas = {item["causa"]: item for item in resultado["diagnosticos"]}
    assert causa_esperada in causas
    assert regra_esperada in causas[causa_esperada]["regras_aplicadas"]


def test_multiplas_hipoteses_recomendacoes_e_explicabilidade(
    prolog_service: PrologService,
) -> None:
    resultado = prolog_service.executar_diagnostico(
        [
            "sem_imagem",
            "monitor_desligado",
            "computador_ligado",
            "ventoinhas_funcionando",
        ],
        consulta_id=20,
    )

    assert resultado["status"] == "diagnosticada"
    por_causa = {item["causa"]: item for item in resultado["diagnosticos"]}
    assert set(por_causa.keys()) == {"problema_monitor", "possivel_falha_ram"}

    recs_ram = por_causa["possivel_falha_ram"]["recomendacoes"]
    assert [r["ordem_execucao"] for r in recs_ram] == [1, 2, 3]
    assert recs_ram[0]["requer_conhecimento_tecnico"] is False
    assert recs_ram[1]["requer_conhecimento_tecnico"] is True


def test_sintomas_insuficientes_e_consulta_complementar(
    prolog_service: PrologService,
) -> None:
    parcial = prolog_service.executar_diagnostico(["sem_imagem"], consulta_id=30)
    assert parcial["status"] == "inconclusiva"
    assert parcial["status_inferencia"] == "insuficiente"
    assert parcial["diagnosticos"] == []
    sugeridos = {item["identificador"] for item in parcial["sintomas_complementares"]}
    assert {"monitor_desligado", "computador_ligado", "ventoinhas_funcionando"}.issubset(
        sugeridos
    )

    vazio = prolog_service.executar_diagnostico([], consulta_id=31)
    assert vazio["status"] == "inconclusiva"
    assert len(vazio["sintomas_complementares"]) == 5


def test_evidencias_contraditorias(prolog_service: PrologService) -> None:
    resultado = prolog_service.executar_diagnostico(
        ["sem_imagem", "monitor_ligado", "monitor_desligado"],
        consulta_id=40,
    )

    assert resultado["status"] == "inconclusiva"
    assert resultado["status_inferencia"] == "contraditoria"
    assert resultado["diagnosticos"] == []
    assert resultado["sintomas_complementares"] == []
    assert len(resultado["contradicoes"]) == 1
    assert resultado["contradicoes"][0]["sintoma_a"] == "monitor_ligado"
    assert resultado["contradicoes"][0]["sintoma_b"] == "monitor_desligado"


@pytest.mark.parametrize(
    "entrada_maliciosa",
    [
        "sem_imagem), shell('calc'), (",
        "sem_imagem; halt.",
        "VarMaiuscula",
        " sem_imagem",
        "sintoma_inexistente",
        "",
    ],
)
def test_rejeicao_entradas_malformadas_e_injecao_prolog(
    prolog_service: PrologService,
    entrada_maliciosa: str,
) -> None:
    with pytest.raises(ValueError):
        prolog_service.executar_diagnostico([entrada_maliciosa], consulta_id=50)

    with pytest.raises(ValidationError):
        SintomasInput(sintomas=[entrada_maliciosa])


def test_rejeicao_campos_confidenciais_em_consulta_create() -> None:
    with pytest.raises(ValidationError):
        ConsultaCreate(usuario_id=1, senha="nao-deve-aceitar-senhas")


def test_recarregar_base_conhecimento(prolog_service: PrologService) -> None:
    info = prolog_service.recarregar_base_conhecimento()
    assert info["versao_regras"] == "1.0.0"
    assert info["total_sintomas"] == 36
    assert info["total_diagnosticos"] == 19
    assert info["whitelist_size"] == 36

