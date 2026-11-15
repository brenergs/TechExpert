:- encoding(utf8).

% ==============================================================================
% TechExpert — Base de Fatos e Catálogo de Sintomas
% ==============================================================================
% Armazenará na Fase 2 (Passo 2.2):
% - Versão da base de regras (versao_base_regras/1)
% - Fatos de sintomas (sintoma/3) e perguntas complementares (pergunta_complementar/2)
% - Causas (causa/3), recomendações ordenadas e alertas de risco técnico (recomendacao/4)
% - Pares de sintomas contraditórios (contraditorio/2)

:- multifile
    versao_base_regras/1,
    sintoma/3,
    pergunta_complementar/2,
    causa/3,
    recomendacao/4,
    contraditorio/2.

:- discontiguous
    versao_base_regras/1,
    sintoma/3,
    pergunta_complementar/2,
    causa/3,
    recomendacao/4,
    contraditorio/2.
