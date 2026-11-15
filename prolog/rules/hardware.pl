:- encoding(utf8).

% ==============================================================================
% TechExpert — Regras de Diagnóstico de Hardware
% ==============================================================================
% Domínios contemplados (Passo 2.3):
% - Problemas de inicialização do computador
% - Falhas de vídeo (monitor, cabos, placa gráfica)
% - Possíveis problemas de memória RAM
% - Superaquecimento de componentes

:- multifile
    regra_diagnostico/6,
    diagnostico/3.

:- discontiguous
    regra_diagnostico/6,
    diagnostico/3.
