:- encoding(utf8).

% ==============================================================================
% TechExpert — Regras de Diagnóstico de Desempenho e Armazenamento
% ==============================================================================
% Domínios contemplados (Passo 2.3):
% - Lentidão excessiva no sistema operacional
% - Uso excessivo de memória e recursos
% - Problemas de armazenamento

:- multifile
    regra_diagnostico/6,
    diagnostico/3.

:- discontiguous
    regra_diagnostico/6,
    diagnostico/3.
