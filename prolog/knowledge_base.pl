:- encoding(utf8).

% ==============================================================================
% TechExpert — Base de Conhecimento Principal (SWI-Prolog)
% ==============================================================================
% Ponto de entrada do motor de inferência simbólica.
% Define diretiva UTF-8, predicados compartilhados (multifile/discontiguous)
% e carrega os fatos e módulos de regras por domínio.

:- multifile
    versao_base_regras/1,
    sintoma/3,
    pergunta_complementar/2,
    causa/3,
    recomendacao/4,
    contraditorio/2,
    regra_diagnostico/6,
    diagnostico/3.

:- discontiguous
    versao_base_regras/1,
    sintoma/3,
    pergunta_complementar/2,
    causa/3,
    recomendacao/4,
    contraditorio/2,
    regra_diagnostico/6,
    diagnostico/3.

:- ensure_loaded('facts/symptoms.pl').
:- ensure_loaded('rules/hardware.pl').
:- ensure_loaded('rules/network.pl').
:- ensure_loaded('rules/performance.pl').
