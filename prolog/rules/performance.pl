:- encoding(utf8).

% ==============================================================================
% TechExpert — Regras de Diagnóstico de Desempenho e Armazenamento (v1.0.0)
% ==============================================================================
% Domínio 4 contemplado:
% - Lentidão excessiva do sistema operacional (regra_perf_01..02)
% - Problemas de armazenamento em disco/SSD (regra_perf_03..04)

:- multifile
    premissas_regra/3,
    regra_diagnostico/6,
    diagnostico/3.

:- discontiguous
    premissas_regra/3,
    regra_diagnostico/6,
    diagnostico/3.

% ------------------------------------------------------------------------------
% Domínio 4: Lentidão e Uso Excessivo de Recursos
% ------------------------------------------------------------------------------

premissas_regra(
    regra_perf_01,
    uso_excessivo_memoria,
    [computador_lento, muita_memoria_utilizada]
).

regra_diagnostico(
    regra_perf_01,
    uso_excessivo_memoria,
    SintomasInformados,
    [computador_lento, muita_memoria_utilizada],
    "Investigue os processos que utilizam memoria",
    "Quando a memória física se esgota, o sistema passa a usar memória virtual (paginação em disco), degradando drasticamente o tempo de resposta geral."
) :-
    member(computador_lento, SintomasInformados),
    member(muita_memoria_utilizada, SintomasInformados).

premissas_regra(
    regra_perf_02,
    uso_excessivo_cpu,
    [computador_lento, uso_cpu_elevado, travamentos_frequentes]
).

regra_diagnostico(
    regra_perf_02,
    uso_excessivo_cpu,
    SintomasInformados,
    [computador_lento, uso_cpu_elevado, travamentos_frequentes],
    "Inspecione processos com alto consumo de CPU no monitor de recursos e verifique limitação térmica",
    "Saturação contínua da CPU impede o escalonamento ágil de tarefas interativas, causando congelamentos temporários e lentidão generalizada."
) :-
    member(computador_lento, SintomasInformados),
    member(uso_cpu_elevado, SintomasInformados),
    member(travamentos_frequentes, SintomasInformados).

% ------------------------------------------------------------------------------
% Domínio 4: Problemas de Armazenamento
% ------------------------------------------------------------------------------

premissas_regra(
    regra_perf_03,
    armazenamento_quase_cheio,
    [computador_lento, pouco_espaco_disco]
).

regra_diagnostico(
    regra_perf_03,
    armazenamento_quase_cheio,
    SintomasInformados,
    [computador_lento, pouco_espaco_disco],
    "Libere espaço em disco usando ferramentas seguras de limpeza e mantenha ao menos 15% livre",
    "Discos e especialmente SSDs próximos da capacidade máxima perdem desempenho de escrita, prejudicam arquivos temporários e impedem a alocação adequada de paginação."
) :-
    member(computador_lento, SintomasInformados),
    member(pouco_espaco_disco, SintomasInformados).

premissas_regra(
    regra_perf_04,
    degradacao_ou_falha_disco,
    [computador_lento, uso_disco_100_porcento, lentidao_abrir_arquivos]
).

regra_diagnostico(
    regra_perf_04,
    degradacao_ou_falha_disco,
    SintomasInformados,
    [computador_lento, uso_disco_100_porcento, lentidao_abrir_arquivos],
    "Realize backup imediato dos arquivos importantes e consulte a saúde S.M.A.R.T. do disco",
    "Uso contínuo de disco em 100% combinado com alta latência de leitura/escrita indica possível gargalo de HD mecânico, fragmentação severa ou falha física iminente."
) :-
    member(computador_lento, SintomasInformados),
    member(uso_disco_100_porcento, SintomasInformados),
    member(lentidao_abrir_arquivos, SintomasInformados).
