:- encoding(utf8).

% ==============================================================================
% TechExpert — Regras de Diagnóstico de Hardware (v1.0.0)
% ==============================================================================
% Domínios contemplados:
% - Inicialização (regra_init_01..03)
% - Falhas de vídeo (regra_video_01..04)
% - Memória RAM (regra_ram_01..02)
% - Superaquecimento (regra_temp_01..02)

:- multifile
    premissas_regra/3,
    regra_diagnostico/6,
    diagnostico/3.

:- discontiguous
    premissas_regra/3,
    regra_diagnostico/6,
    diagnostico/3.

% ------------------------------------------------------------------------------
% Domínio 1: Problemas de Inicialização
% ------------------------------------------------------------------------------

premissas_regra(
    regra_init_01,
    falha_alimentacao_eletrica,
    [computador_nao_liga, sem_leds_acesos, ventoinhas_paradas]
).

regra_diagnostico(
    regra_init_01,
    falha_alimentacao_eletrica,
    SintomasInformados,
    [computador_nao_liga, sem_leds_acesos, ventoinhas_paradas],
    "Verifique o cabo de força, a tomada elétrica e a chave da fonte de alimentação",
    "Ausência total de sinais elétricos (LEDs apagados e ventoinhas paradas) sugere interrupção no fornecimento de energia antes da placa-mãe."
) :-
    member(computador_nao_liga, SintomasInformados),
    member(sem_leds_acesos, SintomasInformados),
    member(ventoinhas_paradas, SintomasInformados).

premissas_regra(
    regra_init_02,
    possivel_falha_fonte_ou_placa_mae,
    [computador_nao_liga, tomada_com_energia, cabo_forca_conectado, sem_leds_acesos]
).

regra_diagnostico(
    regra_init_02,
    possivel_falha_fonte_ou_placa_mae,
    SintomasInformados,
    [computador_nao_liga, tomada_com_energia, cabo_forca_conectado, sem_leds_acesos],
    "Desconecte periféricos externos não essenciais e encaminhe para teste de fonte ou placa-mãe",
    "Com tomada e cabo de força confirmados, a ausência de resposta elétrica aponta para possível defeito na fonte de alimentação (PSU), botão power ou placa-mãe."
) :-
    member(computador_nao_liga, SintomasInformados),
    member(tomada_com_energia, SintomasInformados),
    member(cabo_forca_conectado, SintomasInformados),
    member(sem_leds_acesos, SintomasInformados).

premissas_regra(
    regra_init_03,
    falha_dispositivo_boot,
    [computador_ligado, exibe_imagem, mensagem_sem_dispositivo_boot]
).

regra_diagnostico(
    regra_init_03,
    falha_dispositivo_boot,
    SintomasInformados,
    [computador_ligado, exibe_imagem, mensagem_sem_dispositivo_boot],
    "Remova mídias USB externas e verifique o reconhecimento e ordem do disco de boot na BIOS/UEFI",
    "O hardware completa o POST e exibe vídeo, mas o firmware (BIOS/UEFI) não localiza um sistema operacional inicializável no disco configurado."
) :-
    member(computador_ligado, SintomasInformados),
    member(exibe_imagem, SintomasInformados),
    member(mensagem_sem_dispositivo_boot, SintomasInformados).

% ------------------------------------------------------------------------------
% Domínio 2: Investigação de Falhas de Vídeo
% ------------------------------------------------------------------------------

premissas_regra(
    regra_video_01,
    problema_monitor,
    [sem_imagem, monitor_desligado]
).

regra_diagnostico(
    regra_video_01,
    problema_monitor,
    SintomasInformados,
    [sem_imagem, monitor_desligado],
    "Verifique a alimentacao e a conexao do monitor",
    "Quando não há imagem e o monitor permanece desligado, a causa provável está na alimentação elétrica do próprio monitor ou no seu botão/cabo de energia."
) :-
    member(sem_imagem, SintomasInformados),
    member(monitor_desligado, SintomasInformados).

premissas_regra(
    regra_video_02,
    possivel_falha_ram,
    [sem_imagem, computador_ligado, ventoinhas_funcionando]
).

regra_diagnostico(
    regra_video_02,
    possivel_falha_ram,
    SintomasInformados,
    [sem_imagem, computador_ligado, ventoinhas_funcionando],
    "Investigue os modulos de memoria RAM",
    "O computador energiza e mantém as ventoinhas ativas, mas não gera vídeo; esse comportamento frequentemente indica interrupção no POST por mau contato ou falha nos módulos de memória RAM."
) :-
    member(sem_imagem, SintomasInformados),
    member(computador_ligado, SintomasInformados),
    member(ventoinhas_funcionando, SintomasInformados).

premissas_regra(
    regra_video_03,
    falha_cabo_ou_entrada_video,
    [sem_imagem, computador_ligado, monitor_ligado, mensagem_sem_sinal_video]
).

regra_diagnostico(
    regra_video_03,
    falha_cabo_ou_entrada_video,
    SintomasInformados,
    [sem_imagem, computador_ligado, monitor_ligado, mensagem_sem_sinal_video],
    "Verifique o cabo de vídeo, a porta conectada e a entrada selecionada no monitor",
    "Tanto o computador quanto o monitor estão energizados, porém não há transmissão de sinal entre a saída de vídeo e o painel do monitor."
) :-
    member(sem_imagem, SintomasInformados),
    member(computador_ligado, SintomasInformados),
    member(monitor_ligado, SintomasInformados),
    member(mensagem_sem_sinal_video, SintomasInformados).

premissas_regra(
    regra_video_04,
    possivel_falha_placa_video,
    [computador_ligado, monitor_ligado, artefatos_visuais_ou_piscando]
).

regra_diagnostico(
    regra_video_04,
    possivel_falha_placa_video,
    SintomasInformados,
    [computador_ligado, monitor_ligado, artefatos_visuais_ou_piscando],
    "Teste outro cabo/monitor, verifique drivers gráficos e a temperatura/encaixe da placa de vídeo",
    "Artefatos visuais ou falhas intermitentes de renderização com monitor energizado apontam para instabilidade de GPU, VRAM, driver gráfico ou cabo defeituoso."
) :-
    member(computador_ligado, SintomasInformados),
    member(monitor_ligado, SintomasInformados),
    member(artefatos_visuais_ou_piscando, SintomasInformados).

% ------------------------------------------------------------------------------
% Domínio 3: Possíveis Problemas de Memória RAM
% ------------------------------------------------------------------------------

premissas_regra(
    regra_ram_01,
    falha_contato_ou_modulo_ram,
    [computador_ligado, sem_imagem, bipes_continuos_placa_mae]
).

regra_diagnostico(
    regra_ram_01,
    falha_contato_ou_modulo_ram,
    SintomasInformados,
    [computador_ligado, sem_imagem, bipes_continuos_placa_mae],
    "Consulte o padrão de bipes da placa-mãe e reencaixe ou teste os módulos de memória RAM individualmente",
    "Códigos sonoros (bipes) ou alertas durante o POST indicam explicitamente falha na inicialização ou detecção da memória RAM."
) :-
    member(computador_ligado, SintomasInformados),
    member(sem_imagem, SintomasInformados),
    member(bipes_continuos_placa_mae, SintomasInformados).

premissas_regra(
    regra_ram_02,
    instabilidade_memoria_ram,
    [computador_ligado, tela_azul_frequente, reinicializacao_aleatoria]
).

regra_diagnostico(
    regra_ram_02,
    instabilidade_memoria_ram,
    SintomasInformados,
    [computador_ligado, tela_azul_frequente, reinicializacao_aleatoria],
    "Execute ferramenta não destrutiva de diagnóstico de memória RAM e verifique perfis XMP/DOCP na BIOS",
    "Falhas intermitentes de leitura/escrita em endereços de memória causam corrupção de estado do sistema operacional, resultando em telas azuis (BSOD) ou reinícios inesperados."
) :-
    member(computador_ligado, SintomasInformados),
    member(tela_azul_frequente, SintomasInformados),
    member(reinicializacao_aleatoria, SintomasInformados).

% ------------------------------------------------------------------------------
% Domínio 7: Possíveis Problemas de Superaquecimento
% ------------------------------------------------------------------------------

premissas_regra(
    regra_temp_01,
    superaquecimento_cpu_gpu,
    [desligamento_subito, gabinete_muito_quente, ventoinhas_alta_rotacao]
).

regra_diagnostico(
    regra_temp_01,
    superaquecimento_cpu_gpu,
    SintomasInformados,
    [desligamento_subito, gabinete_muito_quente, ventoinhas_alta_rotacao],
    "Desobstrua entradas de ar, monitore temperaturas de CPU/GPU e realize limpeza térmica segura",
    "A combinação de calor excessivo, rotação máxima dos coolers e desligamento súbito indica acionamento da proteção térmica de hardware (thermal shutdown) para evitar danos ao processador/GPU."
) :-
    member(desligamento_subito, SintomasInformados),
    member(gabinete_muito_quente, SintomasInformados),
    member(ventoinhas_alta_rotacao, SintomasInformados).

premissas_regra(
    regra_temp_02,
    falha_sistema_refrigeracao,
    [computador_ligado, gabinete_muito_quente, ventoinha_parada_ou_ruido_anormal]
).

regra_diagnostico(
    regra_temp_02,
    falha_sistema_refrigeracao,
    SintomasInformados,
    [computador_ligado, gabinete_muito_quente, ventoinha_parada_ou_ruido_anormal],
    "Desligue o equipamento para evitar estresse térmico e verifique obstrução ou falha da ventoinha",
    "Calor excessivo acompanhado de ventoinha inoperante ou com ruído mecânico aponta para falha física do cooler/fan ou obstrução mecânica da hélice."
) :-
    member(computador_ligado, SintomasInformados),
    member(gabinete_muito_quente, SintomasInformados),
    member(ventoinha_parada_ou_ruido_anormal, SintomasInformados).
