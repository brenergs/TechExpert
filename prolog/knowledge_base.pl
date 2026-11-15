:- encoding(utf8).

% ==============================================================================
% TechExpert — Base de Conhecimento Principal e Motor de Inferência (v1.0.0)
% ==============================================================================
% Ponto de entrada do motor de inferência simbólica em SWI-Prolog.
% Responsável por:
% - Carregar fatos (symptoms.pl) e regras modulares por domínio (rules/*.pl)
% - Produzir múltiplas hipóteses compatíveis via findall/3 (RF06)
% - Fornecer explicabilidade completa por regra, evidências e justificativa (RF05)
% - Detectar sintomas contraditórios (Seção 12)
% - Sugerir perguntas complementares quando houver dados insuficientes (RF09 / Seção 17)

:- multifile
    versao_base_regras/1,
    sintoma/3,
    pergunta_complementar/2,
    causa/3,
    recomendacao/4,
    contraditorio/2,
    premissas_regra/3,
    regra_diagnostico/6,
    diagnostico/3.

:- discontiguous
    versao_base_regras/1,
    sintoma/3,
    pergunta_complementar/2,
    causa/3,
    recomendacao/4,
    contraditorio/2,
    premissas_regra/3,
    regra_diagnostico/6,
    diagnostico/3.

:- ensure_loaded('facts/symptoms.pl').
:- ensure_loaded('rules/hardware.pl').
:- ensure_loaded('rules/network.pl').
:- ensure_loaded('rules/performance.pl').

% ------------------------------------------------------------------------------
% Predicado de compatibilidade com a especificação conceitual (Seção 12)
% ------------------------------------------------------------------------------
diagnostico(CausaId, Sintomas, Solucao) :-
    regra_diagnostico(_, CausaId, Sintomas, _, Solucao, _).

% ------------------------------------------------------------------------------
% Versão ativa da base de conhecimento (Seção 17)
% ------------------------------------------------------------------------------
versao_vigente(VersaoBase) :-
    once(versao_base_regras(VersaoBase)).

% ------------------------------------------------------------------------------
% Detecção de evidências contraditórias (Seção 12)
% ------------------------------------------------------------------------------
par_contraditorio(SintomaA, SintomaB) :-
    contraditorio(SintomaA, SintomaB)
    ;
    contraditorio(SintomaB, SintomaA).

motivo_contradicao(computador_ligado, computador_nao_liga, "Estados elétricos opostos para a inicialização do computador.").
motivo_contradicao(sem_imagem, exibe_imagem, "Presença e ausência simultânea de saída de vídeo.").
motivo_contradicao(monitor_ligado, monitor_desligado, "Estados de energia opostos para o monitor.").
motivo_contradicao(ventoinhas_funcionando, ventoinhas_paradas, "Estados opostos de rotação das ventoinhas.").
motivo_contradicao(conectado_rede_local, desconectado_rede_local, "Enlace de rede local ativo e inativo simultaneamente.").
motivo_contradicao(acessa_por_ip, nao_acessa_por_ip, "Resposta e falha de resposta simultânea para IP externo.").
motivo_contradicao(responde_gateway, nao_responde_gateway, "Estados opostos de alcance ao roteador local.").
motivo_contradicao(SintomaA, SintomaB, "Sintomas mutuamente exclusivos informados na mesma consulta.") :-
    \+ member(SintomaA-SintomaB, [
        computador_ligado-computador_nao_liga,
        sem_imagem-exibe_imagem,
        monitor_ligado-monitor_desligado,
        ventoinhas_funcionando-ventoinhas_paradas,
        conectado_rede_local-desconectado_rede_local,
        acessa_por_ip-nao_acessa_por_ip,
        responde_gateway-nao_responde_gateway
    ]).

detectar_contradicoes(SintomasInformados, Contradicoes) :-
    findall(
        contradicao(SintomaA, SintomaB, Motivo),
        (
            contraditorio(SintomaA, SintomaB),
            member(SintomaA, SintomasInformados),
            member(SintomaB, SintomasInformados),
            once(motivo_contradicao(SintomaA, SintomaB, Motivo))
        ),
        ContradicoesBrutas
    ),
    list_to_set(ContradicoesBrutas, Contradicoes).

% ------------------------------------------------------------------------------
% Recomendações ordenadas e coleta de múltiplas hipóteses (RF04, RF05, RF06)
% ------------------------------------------------------------------------------
recomendacoes_causa(CausaId, RecomendacoesOrdenadas) :-
    findall(
        Ordem-passo_recomendacao(Ordem, Descricao, RequerTecnico),
        recomendacao(CausaId, Ordem, Descricao, RequerTecnico),
        Pares
    ),
    keysort(Pares, ParesOrdenados),
    findall(
        Passo,
        member(_-Passo, ParesOrdenados),
        RecomendacoesOrdenadas
    ).

coletar_hipoteses(SintomasInformados, Hipoteses) :-
    findall(
        hipotese(
            CausaId,
            DescricaoCausa,
            Dominio,
            RecomendacaoPrincipal,
            Recomendacoes,
            RegraId,
            EvidenciasUsadas,
            Justificativa
        ),
        (
            regra_diagnostico(
                RegraId,
                CausaId,
                SintomasInformados,
                EvidenciasUsadas,
                RecomendacaoPrincipal,
                Justificativa
            ),
            causa(CausaId, DescricaoCausa, Dominio),
            recomendacoes_causa(CausaId, Recomendacoes)
        ),
        HipotesesBrutas
    ),
    list_to_set(HipotesesBrutas, Hipoteses).

% ------------------------------------------------------------------------------
% Consulta complementar para sintomas insuficientes (RF09 e Seção 17)
% ------------------------------------------------------------------------------
sugerir_sintomas_complementares([], Sugestoes) :-
    !,
    Triagem = [
        computador_nao_liga,
        sem_imagem,
        computador_lento,
        sem_internet,
        gabinete_muito_quente
    ],
    findall(
        sintoma_complementar(Id, Pergunta),
        (
            member(Id, Triagem),
            pergunta_complementar(Id, Pergunta)
        ),
        Sugestoes
    ).

sugerir_sintomas_complementares(SintomasInformados, Sugestoes) :-
    findall(
        NumFaltantes-Faltantes,
        (
            premissas_regra(_RegraId, _CausaId, EvidenciasRequeridas),
            \+ \+ (
                member(S, SintomasInformados),
                member(S, EvidenciasRequeridas)
            ),
            \+ (
                member(Req, EvidenciasRequeridas),
                member(Inf, SintomasInformados),
                par_contraditorio(Req, Inf)
            ),
            findall(
                F,
                (
                    member(F, EvidenciasRequeridas),
                    \+ member(F, SintomasInformados)
                ),
                Faltantes
            ),
            Faltantes \= [],
            length(Faltantes, NumFaltantes)
        ),
        CandidatosPares
    ),
    keysort(CandidatosPares, CandidatosOrdenados),
    findall(
        Faltante,
        (
            member(_-ListaFaltantes, CandidatosOrdenados),
            member(Faltante, ListaFaltantes)
        ),
        TodosFaltantes
    ),
    list_to_set(TodosFaltantes, FaltantesUnicos),
    findall(
        sintoma_complementar(Id, Pergunta),
        (
            member(Id, FaltantesUnicos),
            pergunta_complementar(Id, Pergunta)
        ),
        Sugestoes
    ).

% ------------------------------------------------------------------------------
% Predicados principais do motor de inferência
% ------------------------------------------------------------------------------
avaliar_sintomas(
    SintomasInformados,
    VersaoBase,
    Contradicoes,
    Hipoteses,
    SintomasComplementares,
    StatusInferencia
) :-
    list_to_set(SintomasInformados, SintomasUnicos),
    versao_vigente(VersaoBase),
    detectar_contradicoes(SintomasUnicos, Contradicoes),
    (   Contradicoes \= []
    ->  Hipoteses = [],
        SintomasComplementares = [],
        StatusInferencia = contraditoria
    ;   coletar_hipoteses(SintomasUnicos, Hipoteses),
        (   Hipoteses \= []
        ->  SintomasComplementares = [],
            StatusInferencia = diagnosticada
        ;   sugerir_sintomas_complementares(SintomasUnicos, SintomasComplementares),
            StatusInferencia = insuficiente
        )
    ).

mensagem_status_inferencia(
    diagnosticada,
    "Os resultados representam hipóteses técnicas prováveis e não substituem avaliação presencial especializada."
).
mensagem_status_inferencia(
    insuficiente,
    "Não há evidências suficientes para produzir uma conclusão técnica segura. Responda às perguntas complementares sugeridas."
).
mensagem_status_inferencia(
    contraditoria,
    "Foram informados sintomas mutuamente exclusivos. Revise os itens conflitantes antes de prosseguir."
).

diagnosticar(SintomasInformados, Resultado) :-
    avaliar_sintomas(
        SintomasInformados,
        VersaoBase,
        Contradicoes,
        Hipoteses,
        SintomasComplementares,
        StatusInferencia
    ),
    once(mensagem_status_inferencia(StatusInferencia, MensagemStatus)),
    Resultado = resultado_diagnostico(
        StatusInferencia,
        VersaoBase,
        MensagemStatus,
        Hipoteses,
        SintomasComplementares,
        Contradicoes
    ).
