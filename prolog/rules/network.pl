:- encoding(utf8).

% ==============================================================================
% TechExpert — Regras de Diagnóstico de Rede e Internet
% ==============================================================================
% Domínios contemplados (Passo 2.3):
% - Problemas de conexão com a internet (roteador, cabo, Wi-Fi, provedor)
% - Problemas relacionados à resolução DNS

:- multifile
    regra_diagnostico/6,
    diagnostico/3.

:- discontiguous
    regra_diagnostico/6,
    diagnostico/3.
