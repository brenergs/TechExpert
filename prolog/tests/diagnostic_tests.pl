:- encoding(utf8).

% ==============================================================================
% TechExpert — Suíte de Testes Unitários (plunit)
% ==============================================================================
% Verificará na Fase 2 as regras individuais, múltiplas hipóteses,
% explicabilidade, detecção de contradições e casos com sintomas insuficientes.

:- use_module(library(plunit)).
:- ensure_loaded('../knowledge_base.pl').

:- begin_tests(techexpert_env).

test(ambiente_utf8_e_predicados_carregados) :-
    current_predicate(versao_base_regras/1),
    current_predicate(sintoma/3),
    current_predicate(pergunta_complementar/2),
    current_predicate(causa/3),
    current_predicate(recomendacao/4),
    current_predicate(contraditorio/2),
    current_predicate(regra_diagnostico/6),
    current_predicate(diagnostico/3).

:- end_tests(techexpert_env).
