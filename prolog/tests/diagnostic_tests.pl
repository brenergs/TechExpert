:- encoding(utf8).

% ==============================================================================
% TechExpert — Suíte de Testes Unitários (plunit)
% ==============================================================================
% Verifica:
% - Integridade do catálogo de fatos e versão da base
% - Todas as 19 regras individuais nos 7 domínios
% - Inferência com múltiplas hipóteses, recomendações ordenadas e explicabilidade
% - Sintomas insuficientes e sugestões de consulta complementar (RF09)
% - Detecção e bloqueio por evidências contraditórias (Seção 12)

:- use_module(library(plunit)).
:- ensure_loaded('../knowledge_base.pl').

% Helper para validar acionamento individual de regra com explicabilidade
assert_regra_acionada(Sintomas, RegraEsperada, CausaEsperada) :-
    diagnosticar(
        Sintomas,
        resultado_diagnostico(diagnosticada, '1.0.0', _, Hipoteses, [], [])
    ),
    memberchk(
        hipotese(
            CausaEsperada,
            _,
            _,
            _,
            Recomendacoes,
            RegraEsperada,
            Evidencias,
            Justificativa
        ),
        Hipoteses
    ),
    Recomendacoes \= [],
    Evidencias \= [],
    string_length(Justificativa, Len),
    Len > 0.

:- begin_tests(tech_expert).

% ------------------------------------------------------------------------------
% 1. Integridade do catálogo, versionamento e referências
% ------------------------------------------------------------------------------
test(versao_e_integridade_catalogo) :-
    once(versao_base_regras('1.0.0')),
    findall(S, sintoma(S, _, _), Sintomas),
    length(Sintomas, 36),
    findall(P, pergunta_complementar(P, _), Perguntas),
    length(Perguntas, 36),
    findall(C, causa(C, _, _), Causas),
    length(Causas, 19),
    findall(R, premissas_regra(R, _, _), Regras),
    length(Regras, 19),
    findall(A-B, contraditorio(A, B), Contradicoes),
    length(Contradicoes, 7),
    forall(sintoma(S, _, _), pergunta_complementar(S, _)),
    forall(causa(C, _, _), recomendacao(C, 1, _, _)),
    forall(
        premissas_regra(_, C, Evs),
        (causa(C, _, _), forall(member(S, Evs), sintoma(S, _, _)))
    ),
    forall(contraditorio(A, B), (sintoma(A, _, _), sintoma(B, _, _))).

% ------------------------------------------------------------------------------
% 2. Regras individuais — Domínio 1: Inicialização
% ------------------------------------------------------------------------------
test(regra_init_01_falha_alimentacao) :-
    assert_regra_acionada(
        [computador_nao_liga, sem_leds_acesos, ventoinhas_paradas],
        regra_init_01,
        falha_alimentacao_eletrica
    ).

test(regra_init_02_fonte_ou_placa_mae) :-
    assert_regra_acionada(
        [computador_nao_liga, tomada_com_energia, cabo_forca_conectado, sem_leds_acesos],
        regra_init_02,
        possivel_falha_fonte_ou_placa_mae
    ).

test(regra_init_03_dispositivo_boot) :-
    assert_regra_acionada(
        [computador_ligado, exibe_imagem, mensagem_sem_dispositivo_boot],
        regra_init_03,
        falha_dispositivo_boot
    ).

% ------------------------------------------------------------------------------
% 3. Regras individuais — Domínio 2: Falhas de Vídeo
% ------------------------------------------------------------------------------
test(regra_video_01_problema_monitor) :-
    assert_regra_acionada(
        [sem_imagem, monitor_desligado],
        regra_video_01,
        problema_monitor
    ).

test(regra_video_02_possivel_falha_ram_e_compatibilidade_secao_12) :-
    Sintomas = [sem_imagem, computador_ligado, ventoinhas_funcionando],
    assert_regra_acionada(Sintomas, regra_video_02, possivel_falha_ram),
    once(diagnostico(
        possivel_falha_ram,
        Sintomas,
        "Investigue os modulos de memoria RAM"
    )).

test(regra_video_03_cabo_ou_entrada_video) :-
    assert_regra_acionada(
        [sem_imagem, computador_ligado, monitor_ligado, mensagem_sem_sinal_video],
        regra_video_03,
        falha_cabo_ou_entrada_video
    ).

test(regra_video_04_possivel_falha_placa_video) :-
    assert_regra_acionada(
        [computador_ligado, monitor_ligado, artefatos_visuais_ou_piscando],
        regra_video_04,
        possivel_falha_placa_video
    ).

% ------------------------------------------------------------------------------
% 4. Regras individuais — Domínio 3: Memória RAM
% ------------------------------------------------------------------------------
test(regra_ram_01_bipes_post) :-
    assert_regra_acionada(
        [computador_ligado, sem_imagem, bipes_continuos_placa_mae],
        regra_ram_01,
        falha_contato_ou_modulo_ram
    ).

test(regra_ram_02_instabilidade_ram) :-
    assert_regra_acionada(
        [computador_ligado, tela_azul_frequente, reinicializacao_aleatoria],
        regra_ram_02,
        instabilidade_memoria_ram
    ).

% ------------------------------------------------------------------------------
% 5. Regras individuais — Domínio 4: Desempenho e Armazenamento
% ------------------------------------------------------------------------------
test(regra_perf_01_uso_excessivo_memoria) :-
    assert_regra_acionada(
        [computador_lento, muita_memoria_utilizada],
        regra_perf_01,
        uso_excessivo_memoria
    ).

test(regra_perf_02_uso_excessivo_cpu) :-
    assert_regra_acionada(
        [computador_lento, uso_cpu_elevado, travamentos_frequentes],
        regra_perf_02,
        uso_excessivo_cpu
    ).

test(regra_perf_03_armazenamento_quase_cheio) :-
    assert_regra_acionada(
        [computador_lento, pouco_espaco_disco],
        regra_perf_03,
        armazenamento_quase_cheio
    ).

test(regra_perf_04_degradacao_ou_falha_disco) :-
    assert_regra_acionada(
        [computador_lento, uso_disco_100_porcento, lentidao_abrir_arquivos],
        regra_perf_04,
        degradacao_ou_falha_disco
    ).

% ------------------------------------------------------------------------------
% 6. Regras individuais — Domínios 5 e 6: Rede e DNS
% ------------------------------------------------------------------------------
test(regra_rede_01_desconectado_rede_local) :-
    assert_regra_acionada(
        [sem_internet, desconectado_rede_local],
        regra_rede_01,
        falha_conexao_local_wifi_ou_cabo
    ).

test(regra_rede_02_roteador_ou_gateway) :-
    assert_regra_acionada(
        [sem_internet, conectado_rede_local, nao_responde_gateway],
        regra_rede_02,
        falha_roteador_ou_gateway
    ).

test(regra_rede_03_provedor_isp) :-
    assert_regra_acionada(
        [sem_internet, conectado_rede_local, responde_gateway, nao_acessa_por_ip],
        regra_rede_03,
        indisponibilidade_provedor_isp
    ).

test(regra_dns_01_possivel_falha_dns) :-
    assert_regra_acionada(
        [sem_internet, acessa_por_ip, nao_acessa_por_dominio],
        regra_dns_01,
        possivel_falha_dns
    ).

% ------------------------------------------------------------------------------
% 7. Regras individuais — Domínio 7: Superaquecimento
% ------------------------------------------------------------------------------
test(regra_temp_01_superaquecimento_cpu_gpu) :-
    assert_regra_acionada(
        [desligamento_subito, gabinete_muito_quente, ventoinhas_alta_rotacao],
        regra_temp_01,
        superaquecimento_cpu_gpu
    ).

test(regra_temp_02_falha_sistema_refrigeracao) :-
    assert_regra_acionada(
        [computador_ligado, gabinete_muito_quente, ventoinha_parada_ou_ruido_anormal],
        regra_temp_02,
        falha_sistema_refrigeracao
    ).

% ------------------------------------------------------------------------------
% 8. Múltiplas hipóteses, recomendações ordenadas e idempotência
% ------------------------------------------------------------------------------
test(multiplas_hipoteses_video_monitor_e_ram) :-
    diagnosticar(
        [sem_imagem, monitor_desligado, computador_ligado, ventoinhas_funcionando],
        resultado_diagnostico(diagnosticada, '1.0.0', _, Hipoteses, [], [])
    ),
    length(Hipoteses, 2),
    memberchk(
        hipotese(problema_monitor, _, video, _, RecsMonitor, regra_video_01, _, _),
        Hipoteses
    ),
    memberchk(
        hipotese(possivel_falha_ram, _, video, _, RecsRam, regra_video_02, _, _),
        Hipoteses
    ),
    RecsMonitor = [
        passo_recomendacao(1, _, false),
        passo_recomendacao(2, _, false),
        passo_recomendacao(3, _, false)
    ],
    RecsRam = [
        passo_recomendacao(1, _, false),
        passo_recomendacao(2, _, true),
        passo_recomendacao(3, _, true)
    ].

test(multiplas_hipoteses_desempenho_memoria_e_disco) :-
    diagnosticar(
        [computador_lento, muita_memoria_utilizada, pouco_espaco_disco],
        resultado_diagnostico(diagnosticada, '1.0.0', _, Hipoteses, [], [])
    ),
    length(Hipoteses, 2),
    memberchk(
        hipotese(uso_excessivo_memoria, _, desempenho, _, _, regra_perf_01, _, _),
        Hipoteses
    ),
    memberchk(
        hipotese(armazenamento_quase_cheio, _, armazenamento, _, _, regra_perf_03, _, _),
        Hipoteses
    ).

test(idempotencia_sintomas_duplicados) :-
    diagnosticar(
        [sem_imagem, monitor_desligado, sem_imagem, monitor_desligado],
        resultado_diagnostico(diagnosticada, '1.0.0', _, Hipoteses, [], [])
    ),
    length(Hipoteses, 1),
    Hipoteses = [hipotese(problema_monitor, _, _, _, _, regra_video_01, _, _)].

% ------------------------------------------------------------------------------
% 9. Sintomas insuficientes e consulta complementar (RF09 / Seção 17)
% ------------------------------------------------------------------------------
test(sintomas_insuficientes_sem_imagem) :-
    diagnosticar(
        [sem_imagem],
        resultado_diagnostico(insuficiente, '1.0.0', _, [], Complementares, [])
    ),
    memberchk(sintoma_complementar(monitor_desligado, _), Complementares),
    memberchk(sintoma_complementar(computador_ligado, _), Complementares),
    memberchk(sintoma_complementar(ventoinhas_funcionando, _), Complementares),
    \+ memberchk(sintoma_complementar(exibe_imagem, _), Complementares).

test(sintomas_insuficientes_sem_internet) :-
    diagnosticar(
        [sem_internet],
        resultado_diagnostico(insuficiente, '1.0.0', _, [], Complementares, [])
    ),
    memberchk(sintoma_complementar(desconectado_rede_local, _), Complementares),
    memberchk(sintoma_complementar(acessa_por_ip, _), Complementares),
    memberchk(sintoma_complementar(nao_acessa_por_dominio, _), Complementares).

test(sintomas_insuficientes_lista_vazia) :-
    diagnosticar(
        [],
        resultado_diagnostico(insuficiente, '1.0.0', _, [], Complementares, [])
    ),
    length(Complementares, 5),
    memberchk(sintoma_complementar(computador_nao_liga, _), Complementares),
    memberchk(sintoma_complementar(sem_imagem, _), Complementares),
    memberchk(sintoma_complementar(computador_lento, _), Complementares),
    memberchk(sintoma_complementar(sem_internet, _), Complementares),
    memberchk(sintoma_complementar(gabinete_muito_quente, _), Complementares).

% ------------------------------------------------------------------------------
% 10. Evidências contraditórias (Seção 12)
% ------------------------------------------------------------------------------
test(contradicao_monitor_ligado_e_desligado) :-
    diagnosticar(
        [sem_imagem, monitor_ligado, monitor_desligado],
        resultado_diagnostico(contraditoria, '1.0.0', _, [], [], Contradicoes)
    ),
    memberchk(contradicao(monitor_ligado, monitor_desligado, _), Contradicoes).

test(contradicao_bloqueia_diagnostico_indevido) :-
    diagnosticar(
        [computador_nao_liga, computador_ligado, sem_leds_acesos, ventoinhas_paradas],
        resultado_diagnostico(contraditoria, '1.0.0', _, [], [], Contradicoes)
    ),
    memberchk(contradicao(computador_ligado, computador_nao_liga, _), Contradicoes).

:- end_tests(tech_expert).
