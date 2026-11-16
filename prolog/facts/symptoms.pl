:- encoding(utf8).

% ==============================================================================
% TechExpert — Base de Fatos e Catálogo de Sintomas (v1.0.0)
% ==============================================================================
% Contém o conhecimento estruturado alinhado a docs/knowledge_base.md e
% docs/requirements.md:
% - Versão da base de regras (versao_base_regras/1)
% - Catálogo de 36 sintomas padronizados (sintoma/3)
% - Catálogo de 36 perguntas complementares para RF09 (pergunta_complementar/2)
% - Catálogo de 19 causas/hipóteses diagnósticas (causa/3)
% - Recomendações ordenadas com flag de conhecimento técnico (recomendacao/4)
% - 7 pares de sintomas contraditórios (contraditorio/2)

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

% ------------------------------------------------------------------------------
% Versão da Base de Regras (Seção 17)
% ------------------------------------------------------------------------------
versao_base_regras('1.0.0').

% ------------------------------------------------------------------------------
% Catálogo de Sintomas: sintoma(Identificador, Descricao, Categoria)
% ------------------------------------------------------------------------------

% Categoria: inicializacao (8)
sintoma(computador_nao_liga, "Computador não liga ao pressionar o botão de energia", inicializacao).
sintoma(computador_ligado, "Computador liga e permanece energizado", inicializacao).
sintoma(sem_leds_acesos, "Nenhum LED indicador do gabinete ou placa-mãe acende", inicializacao).
sintoma(ventoinhas_paradas, "Nenhuma ventoinha interna gira ao tentar ligar", inicializacao).
sintoma(ventoinhas_funcionando, "Ventoinhas internas estão girando normalmente", inicializacao).
sintoma(tomada_com_energia, "Tomada ou filtro de linha confirmado com energia elétrica", inicializacao).
sintoma(cabo_forca_conectado, "Cabo de força devidamente conectado nas duas extremidades", inicializacao).
sintoma(mensagem_sem_dispositivo_boot, "Tela exibe mensagem de sistema operacional ou disco de boot não encontrado", inicializacao).

% Categoria: video (6)
sintoma(sem_imagem, "Monitor não apresenta nenhuma imagem na tela", video).
sintoma(exibe_imagem, "Monitor exibe imagem normalmente", video).
sintoma(monitor_desligado, "Monitor está desligado ou com LED indicador apagado", video).
sintoma(monitor_ligado, "Monitor está ligado com LED indicador aceso", video).
sintoma(mensagem_sem_sinal_video, "Monitor exibe mensagem de 'Sem sinal' ou 'No signal'", video).
sintoma(artefatos_visuais_ou_piscando, "Tela exibe faixas coloridas, distorções gráficas ou fica piscando", video).

% Categoria: memoria_ram (3)
sintoma(bipes_continuos_placa_mae, "Placa-mãe emite sequência de bipes sonoros contínuos ou erro de memória", memoria_ram).
sintoma(tela_azul_frequente, "Sistema apresenta telas azuis (BSOD) ou erros fatais frequentes", memoria_ram).
sintoma(reinicializacao_aleatoria, "Computador reinicia sozinho de forma aleatória durante o uso", memoria_ram).

% Categoria: desempenho (4)
sintoma(computador_lento, "Sistema operacional responde com lentidão excessiva", desempenho).
sintoma(muita_memoria_utilizada, "Consumo de memória RAM muito elevado (próximo a 90-100%)", desempenho).
sintoma(uso_cpu_elevado, "Uso do processador (CPU) constantemente próximo de 100%", desempenho).
sintoma(travamentos_frequentes, "Programas e interface congelam ou travam com frequência", desempenho).

% Categoria: armazenamento (3)
sintoma(pouco_espaco_disco, "Unidade principal de armazenamento com pouco espaço livre (< 15%)", armazenamento).
sintoma(uso_disco_100_porcento, "Taxa de atividade do disco constantemente em 100%", armazenamento).
sintoma(lentidao_abrir_arquivos, "Demora extrema ao abrir pastas, arquivos ou inicializar programas", armazenamento).

% Categoria: rede (8)
sintoma(sem_internet, "Computador sem acesso funcional à internet", rede).
sintoma(desconectado_rede_local, "Sem conexão Wi-Fi ativa ou cabo Ethernet desconectado/sem link", rede).
sintoma(conectado_rede_local, "Conectado à rede Wi-Fi ou via cabo Ethernet local", rede).
sintoma(nao_responde_gateway, "Não há resposta ao tentar alcançar o roteador local (gateway)", rede).
sintoma(responde_gateway, "Roteador local (gateway) responde normalmente", rede).
sintoma(nao_acessa_por_ip, "Não consegue alcançar endereços IP públicos externos", rede).
sintoma(acessa_por_ip, "Consegue alcançar endereços IP externos diretamente", rede).
sintoma(nao_acessa_por_dominio, "Não consegue abrir sites pelo nome de domínio (ex.: exemplo.com)", rede).

% Categoria: temperatura (4)
sintoma(desligamento_subito, "Computador desliga repentinamente sem aviso prévio", temperatura).
sintoma(gabinete_muito_quente, "Gabinete ou saída de ar extremamente quente ao toque", temperatura).
sintoma(ventoinhas_alta_rotacao, "Ventoinhas operam em rotação máxima constante com ruído de vento", temperatura).
sintoma(ventoinha_parada_ou_ruido_anormal, "Cooler parado com o PC ligado ou emitindo ruído mecânico anormal", temperatura).

% ------------------------------------------------------------------------------
% Perguntas Complementares (RF09): pergunta_complementar(Identificador, Pergunta)
% ------------------------------------------------------------------------------

pergunta_complementar(computador_nao_liga, "O computador falha totalmente ao tentar ligar quando você pressiona o botão de energia?").
pergunta_complementar(computador_ligado, "O computador liga e permanece com energia (luzes ou som de funcionamento)?").
pergunta_complementar(sem_leds_acesos, "Todos os LEDs indicadores do gabinete/notebook permanecem completamente apagados?").
pergunta_complementar(ventoinhas_paradas, "As ventoinhas internas (cooler/fonte) permanecem totalmente paradas?").
pergunta_complementar(ventoinhas_funcionando, "Você percebe ou escuta as ventoinhas internas girando quando o computador é ligado?").
pergunta_complementar(tomada_com_energia, "Você confirmou com outro aparelho que a tomada elétrica utilizada está funcionando?").
pergunta_complementar(cabo_forca_conectado, "O cabo de alimentação está firmemente conectado tanto na tomada quanto no computador/fonte?").
pergunta_complementar(mensagem_sem_dispositivo_boot, "A tela exibe alguma mensagem informando ausência de dispositivo de boot ou sistema operacional?").

pergunta_complementar(sem_imagem, "A tela permanece completamente preta ou sem imagem do sistema?").
pergunta_complementar(exibe_imagem, "O monitor chega a exibir alguma imagem (logotipo, BIOS ou mensagens de inicialização)?").
pergunta_complementar(monitor_desligado, "O monitor está com o botão/LED indicador de energia completamente apagado?").
pergunta_complementar(monitor_ligado, "O monitor está energizado (com o LED indicador aceso)?").
pergunta_complementar(mensagem_sem_sinal_video, "O monitor exibe na tela uma mensagem de 'Sem sinal' / 'No signal' / 'Verificar cabo'?").
pergunta_complementar(artefatos_visuais_ou_piscando, "A imagem apresenta faixas coloridas, pontos distorcidos, falhas gráficas ou pisca constantemente?").

pergunta_complementar(bipes_continuos_placa_mae, "Ao ligar o computador, ele emite uma sequência de bipes sonoros repetidos ou códigos de alerta?").
pergunta_complementar(tela_azul_frequente, "O sistema operacional apresenta telas azuis (ou reinícios com erro fatal) com frequência?").
pergunta_complementar(reinicializacao_aleatoria, "O computador reinicia sozinho inesperadamente mesmo sem estar superaquecido?").

pergunta_complementar(computador_lento, "O computador está demorando muito mais que o normal para responder aos comandos?").
pergunta_complementar(muita_memoria_utilizada, "No monitor de recursos/gerenciador de tarefas, o uso de memória RAM está próximo do máximo?").
pergunta_complementar(uso_cpu_elevado, "O uso do processador (CPU) permanece constantemente elevado ou próximo de 100%?").
pergunta_complementar(travamentos_frequentes, "Os programas ou a interface congelam com frequência durante o uso?").

pergunta_complementar(pouco_espaco_disco, "O disco principal do sistema operacional está quase cheio (menos de 15% de espaço livre)?").
pergunta_complementar(uso_disco_100_porcento, "O gerenciador de tarefas mostra o uso do disco constantemente em 100%?").
pergunta_complementar(lentidao_abrir_arquivos, "Há demora extrema especificamente para abrir pastas, copiar arquivos ou iniciar programas?").

pergunta_complementar(sem_internet, "Você está sem conseguir navegar ou acessar serviços na internet neste computador?").
pergunta_complementar(desconectado_rede_local, "O ícone de rede indica que você está desconectado do Wi-Fi ou sem cabo de rede detectado?").
pergunta_complementar(conectado_rede_local, "O computador aparece como conectado à rede Wi-Fi ou ao cabo de rede local?").
pergunta_complementar(nao_responde_gateway, "Ao testar comunicação com o roteador local (gateway padrão), ocorre falha ou tempo esgotado?").
pergunta_complementar(responde_gateway, "O computador consegue se comunicar normalmente com a página/IP do roteador local?").
pergunta_complementar(nao_acessa_por_ip, "Mesmo conectado ao roteador, o computador falha ao tentar alcançar um endereço IP externo (ex.: 1.1.1.1)?").
pergunta_complementar(acessa_por_ip, "O computador consegue alcançar ou pingar um endereço IP externo diretamente?").
pergunta_complementar(nao_acessa_por_dominio, "Ao digitar nomes de sites no navegador, as páginas falham ao carregar?").

pergunta_complementar(desligamento_subito, "O computador desliga subitamente por completo durante o uso (especialmente sob tarefas pesadas)?").
pergunta_complementar(gabinete_muito_quente, "O gabinete ou as saídas de ar do notebook estão anormalmente quentes ao toque?").
pergunta_complementar(ventoinhas_alta_rotacao, "As ventoinhas permanecem girando na velocidade máxima de forma contínua?").
pergunta_complementar(ventoinha_parada_ou_ruido_anormal, "Alguma ventoinha está completamente parada com o PC ligado ou fazendo barulho mecânico de atrito?").

% ------------------------------------------------------------------------------
% Catálogo de Causas / Hipóteses Diagnósticas: causa(Identificador, Descricao, Categoria)
% ------------------------------------------------------------------------------

causa(falha_alimentacao_eletrica, "Possível falha na alimentação elétrica externa (cabo, tomada ou chave da fonte)", inicializacao).
causa(possivel_falha_fonte_ou_placa_mae, "Possível defeito na fonte de alimentação (PSU), botão power ou placa-mãe", inicializacao).
causa(falha_dispositivo_boot, "Possível falha de reconhecimento do disco de boot ou corrupção de inicialização", inicializacao).

causa(problema_monitor, "Possível problema na alimentação elétrica ou estado do monitor", video).
causa(possivel_falha_ram, "Possível falha ou mau contato nos módulos de memória RAM impedindo vídeo", video).
causa(falha_cabo_ou_entrada_video, "Possível problema no cabo de vídeo, porta utilizada ou seleção de entrada do monitor", video).
causa(possivel_falha_placa_video, "Possível instabilidade no subsistema gráfico (GPU, driver ou cabo de vídeo)", video).

causa(falha_contato_ou_modulo_ram, "Possível mau contato ou defeito físico em módulo/slot de memória RAM indicado no POST", memoria_ram).
causa(instabilidade_memoria_ram, "Possível instabilidade intermitente ou erro de endereçamento na memória RAM", memoria_ram).

causa(uso_excessivo_memoria, "Uso excessivo de memória RAM por processos causando paginação intensa", desempenho).
causa(uso_excessivo_cpu, "Saturação contínua do processador (CPU) por processos ou restrição térmica", desempenho).
causa(armazenamento_quase_cheio, "Espaço livre insuficiente na unidade principal degradando o desempenho do sistema", armazenamento).
causa(degradacao_ou_falha_disco, "Possível gargalo severo ou degradação física na unidade de armazenamento (HD/SSD)", armazenamento).

causa(falha_conexao_local_wifi_ou_cabo, "Ausência de enlace físico ou lógico com a rede local (Wi-Fi ou cabo Ethernet)", rede).
causa(falha_roteador_ou_gateway, "Possível travamento ou falha de resposta do roteador local / gateway DHCP", rede).
causa(indisponibilidade_provedor_isp, "Possível indisponibilidade externa no provedor de internet (WAN/ISP)", rede).
causa(possivel_falha_dns, "Possível falha na resolução de nomes DNS apesar de haver conectividade IP", rede).

causa(superaquecimento_cpu_gpu, "Possível superaquecimento de CPU/GPU acionando proteção térmica de desligamento", temperatura).
causa(falha_sistema_refrigeracao, "Possível obstrução ou falha mecânica no sistema de refrigeração (cooler/ventoinha)", temperatura).

% ------------------------------------------------------------------------------
% Recomendações Ordenadas: recomendacao(CausaId, Ordem, Descricao, RequerTecnico)
% ------------------------------------------------------------------------------

% 1. falha_alimentacao_eletrica
recomendacao(falha_alimentacao_eletrica, 1, "Verificar se o cabo de força está firmemente conectado à tomada e à fonte.", false).
recomendacao(falha_alimentacao_eletrica, 2, "Testar a tomada elétrica com outro aparelho ou testar outra tomada confiável.", false).
recomendacao(falha_alimentacao_eletrica, 3, "Verificar se a chave seletora ou interruptor traseiro da fonte (se existir) está ligado.", false).
recomendacao(falha_alimentacao_eletrica, 4, "Caso utilize filtro de linha ou nobreak, testar ligando diretamente na tomada (respeitando a tensão local 110V/220V). Nunca abrir a carcaça da fonte de alimentação.", false).

% 2. possivel_falha_fonte_ou_placa_mae
recomendacao(possivel_falha_fonte_ou_placa_mae, 1, "Desconectar periféricos USB externos não essenciais e tentar ligar novamente.", false).
recomendacao(possivel_falha_fonte_ou_placa_mae, 2, "Verificar externamente se o cabo da fonte está íntegro (sem dobras ou danos).", false).
recomendacao(possivel_falha_fonte_ou_placa_mae, 3, "Encaminhar para teste de fonte com testador apropriado ou multímetro em bancada.", true).
recomendacao(possivel_falha_fonte_ou_placa_mae, 4, "Avaliar conexões internas de energia (ATX 24 pinos / EPS) e botão power com o equipamento desligado da rede elétrica e proteção antiestática (ESD).", true).

% 3. falha_dispositivo_boot
recomendacao(falha_dispositivo_boot, 1, "Remover pendrives, cartões SD ou mídias externas conectadas e reiniciar o computador.", false).
recomendacao(falha_dispositivo_boot, 2, "Acessar o menu de BIOS/UEFI para verificar se o SSD/HD é reconhecido e conferir a ordem de boot (cuidado para não alterar configurações que causem perda de dados).", true).
recomendacao(falha_dispositivo_boot, 3, "Em desktop, verificar com o computador desligado da tomada se os cabos SATA de dados e energia do disco estão firmes.", true).
recomendacao(falha_dispositivo_boot, 4, "Caso o disco não apareça na BIOS ou haja falha lógica do bootloader, realizar diagnóstico de saúde do disco ou reparo de inicialização.", true).

% 4. problema_monitor
recomendacao(problema_monitor, 1, "Verifique a alimentacao e a conexao do monitor (cabo de força na tomada e atrás do monitor).", false).
recomendacao(problema_monitor, 2, "Pressionar o botão de energia do monitor e observar o LED indicador.", false).
recomendacao(problema_monitor, 3, "Testar o monitor em outra tomada ou com outro cabo de alimentação compatível (nunca abrir a carcaça do monitor).", false).

% 5. possivel_falha_ram
recomendacao(possivel_falha_ram, 1, "Desligar completamente o computador da tomada antes de qualquer inspeção interna.", false).
recomendacao(possivel_falha_ram, 2, "Investigue os modulos de memoria RAM verificando se estão firmemente encaixados nos slots (com descarga antiestática ESD).", true).
recomendacao(possivel_falha_ram, 3, "Se houver mais de um módulo, testar um módulo por vez em slots alternados.", true).

% 6. falha_cabo_ou_entrada_video
recomendacao(falha_cabo_ou_entrada_video, 1, "Verificar se o cabo HDMI, DisplayPort ou VGA está firme em ambas as extremidades, sem forçar conectores tortos.", false).
recomendacao(falha_cabo_ou_entrada_video, 2, "Conferir no menu OSD do monitor se a fonte de entrada selecionada (HDMI 1, DP, etc.) corresponde à porta conectada.", false).
recomendacao(falha_cabo_ou_entrada_video, 3, "Em desktops com placa de vídeo dedicada, confirmar se o cabo está ligado na placa dedicada e não na placa-mãe.", false).
recomendacao(falha_cabo_ou_entrada_video, 4, "Testar outro cabo de vídeo ou outra porta disponível no monitor e no computador.", false).

% 7. possivel_falha_placa_video
recomendacao(possivel_falha_placa_video, 1, "Testar outro cabo de vídeo e outro monitor para descartar falha externa.", false).
recomendacao(possivel_falha_placa_video, 2, "Atualizar ou reinstalar de forma limpa o driver de vídeo (em modo de segurança, se necessário).", true).
recomendacao(possivel_falha_placa_video, 3, "Verificar temperaturas da GPU e rotação das ventoinhas da placa.", false).
recomendacao(possivel_falha_placa_video, 4, "Em desktop, com o equipamento fora da tomada e proteção ESD, verificar o encaixe PCIe e os cabos de alimentação auxiliar da GPU.", true).

% 8. falha_contato_ou_modulo_ram
recomendacao(falha_contato_ou_modulo_ram, 1, "Consultar o manual da placa-mãe/notebook para confirmar o significado exato do padrão de bipes.", false).
recomendacao(falha_contato_ou_modulo_ram, 2, "Desligar completamente o equipamento da tomada e remover a bateria (se aplicável).", false).
recomendacao(falha_contato_ou_modulo_ram, 3, "Reencaixar os módulos RAM garantindo travamento completo das presilhas laterais (com proteção antiestática ESD).", true).
recomendacao(falha_contato_ou_modulo_ram, 4, "Testar cada módulo individualmente para isolar módulo ou slot defeituoso.", true).

% 9. instabilidade_memoria_ram
recomendacao(instabilidade_memoria_ram, 1, "Verificar na BIOS se há perfis de overclock (XMP/DOCP) ativos e testar temporariamente em frequência padrão JEDEC.", true).
recomendacao(instabilidade_memoria_ram, 2, "Fazer backup de arquivos importantes e executar ferramenta de diagnóstico de memória não destrutiva (Diagnóstico de Memória do Windows ou MemTest86).", false).
recomendacao(instabilidade_memoria_ram, 3, "Caso o teste acuse erros, isolar o módulo defeituoso testando um pente por vez com o equipamento fora da tomada.", true).

% 10. uso_excessivo_memoria
recomendacao(uso_excessivo_memoria, 1, "Abrir o Gerenciador de Tarefas ou Monitor do Sistema e ordenar os processos por uso de memória.", false).
recomendacao(uso_excessivo_memoria, 2, "Identificar e encerrar aplicativos não essenciais ou com consumo excessivo (evitando encerrar processos críticos do sistema operacional).", false).
recomendacao(uso_excessivo_memoria, 3, "Revisar programas configurados para iniciar junto com o sistema operacional.", false).
recomendacao(uso_excessivo_memoria, 4, "Avaliar se a quantidade de memória RAM instalada atende à carga de trabalho habitual.", false).

% 11. uso_excessivo_cpu
recomendacao(uso_excessivo_cpu, 1, "Inspecionar no monitor de recursos quais processos consomem mais CPU.", false).
recomendacao(uso_excessivo_cpu, 2, "Verificar se há atualizações do sistema, indexação ou varredura de antivírus em execução temporária (sem desativar proteções permanentemente).", false).
recomendacao(uso_excessivo_cpu, 3, "Encerrar processos anômalos travados e verificar se o problema persiste após reinicialização.", false).
recomendacao(uso_excessivo_cpu, 4, "Checar se a frequência da CPU não está limitada por temperatura alta (thermal throttling) ou plano de energia restritivo.", false).

% 12. armazenamento_quase_cheio
recomendacao(armazenamento_quase_cheio, 1, "Verificar o espaço livre disponível nas partições do sistema.", false).
recomendacao(armazenamento_quase_cheio, 2, "Executar limpeza segura de arquivos temporários, lixeira e cache de atualizações antigas usando ferramentas nativas (nunca apagar pastas do sistema).", false).
recomendacao(armazenamento_quase_cheio, 3, "Remover programas não utilizados ou mover arquivos pessoais grandes para armazenamento secundário/nuvem, mantendo ao menos 15% livre.", false).

% 13. degradacao_ou_falha_disco
recomendacao(degradacao_ou_falha_disco, 1, "Realizar backup imediato dos arquivos importantes em mídia externa ou nuvem antes de qualquer teste prolongado.", false).
recomendacao(degradacao_ou_falha_disco, 2, "Verificar no monitor de recursos se algum processo legítimo (como atualização) está realizando leitura intensa.", false).
recomendacao(degradacao_ou_falha_disco, 3, "Consultar os indicadores de saúde S.M.A.R.T. da unidade de armazenamento (nunca desfragmentar SSDs nem estressar disco suspeito antes do backup).", false).
recomendacao(degradacao_ou_falha_disco, 4, "Caso haja setores realocados/pendentes ou desgaste crítico, planejar substituição do disco (preferencialmente por SSD) com técnico.", true).

% 14. falha_conexao_local_wifi_ou_cabo
recomendacao(falha_conexao_local_wifi_ou_cabo, 1, "Verificar se o Modo Avião está desativado e se o adaptador Wi-Fi está ligado.", false).
recomendacao(falha_conexao_local_wifi_ou_cabo, 2, "Se usar cabo Ethernet, checar se o cabo está encaixado nas duas pontas e se os LEDs da porta acendem.", false).
recomendacao(falha_conexao_local_wifi_ou_cabo, 3, "Verificar se outros dispositivos conseguem se conectar à mesma rede Wi-Fi (o sistema nunca solicita senhas de rede).", false).
recomendacao(falha_conexao_local_wifi_ou_cabo, 4, "Reiniciar o adaptador de rede no sistema operacional ou verificar drivers do adaptador.", false).

% 15. falha_roteador_ou_gateway
recomendacao(falha_roteador_ou_gateway, 1, "Reiniciar o modem/roteador desligando-o da tomada por 30 segundos e religando (evitar hard reset de fábrica).", false).
recomendacao(falha_roteador_ou_gateway, 2, "Verificar os LEDs indicadores de energia, Wi-Fi e internet no roteador.", false).
recomendacao(falha_roteador_ou_gateway, 3, "Renovar a concessão DHCP ou reiniciar a interface de rede do computador.", false).
recomendacao(falha_roteador_ou_gateway, 4, "Testar a conexão em outro dispositivo para confirmar se o roteador está respondendo.", false).

% 16. indisponibilidade_provedor_isp
recomendacao(indisponibilidade_provedor_isp, 1, "Observar nos LEDs do modem/ONU se há sinal óptico/DSL ativo ou LED vermelho (LOS/Alarme), sem dobrar cabos de fibra óptica.", false).
recomendacao(indisponibilidade_provedor_isp, 2, "Verificar se o cabo entre o modem/ONU e o roteador está conectado na porta WAN.", false).
recomendacao(indisponibilidade_provedor_isp, 3, "Testar se outros aparelhos na mesma rede também estão sem acesso externo.", false).
recomendacao(indisponibilidade_provedor_isp, 4, "Entrar em contato com o provedor de internet (ISP) informando o status dos LEDs do equipamento.", false).

% 17. possivel_falha_dns
recomendacao(possivel_falha_dns, 1, "Verificar as configurações de DNS do adaptador de rede para evitar endereços manuais inválidos.", false).
recomendacao(possivel_falha_dns, 2, "Limpar o cache DNS local do sistema operacional.", false).
recomendacao(possivel_falha_dns, 3, "Anotar a configuração atual para reversão e testar temporariamente um servidor DNS público confiável (ex.: 1.1.1.1 ou 8.8.8.8) ou verificar o DNS no roteador.", true).
recomendacao(possivel_falha_dns, 4, "Desativar temporariamente VPNs ou proxies locais para verificar se estão bloqueando consultas DNS.", false).

% 18. superaquecimento_cpu_gpu
recomendacao(superaquecimento_cpu_gpu, 1, "Verificar se as saídas e entradas de ar estão desobstruídas (em notebooks, evitar uso sobre camas ou almofadas).", false).
recomendacao(superaquecimento_cpu_gpu, 2, "Monitorar temperaturas de CPU/GPU via software confiável de telemetria.", false).
recomendacao(superaquecimento_cpu_gpu, 3, "Realizar limpeza externa cuidadosa das saídas de poeira com o equipamento desligado (nunca usar aspirador comum internamente).", false).
recomendacao(superaquecimento_cpu_gpu, 4, "Caso persista, encaminhar para limpeza interna completa e substituição da pasta térmica.", true).

% 19. falha_sistema_refrigeracao
recomendacao(falha_sistema_refrigeracao, 1, "Desligar o computador imediatamente para evitar estresse térmico prolongado caso a ventoinha principal esteja parada.", false).
recomendacao(falha_sistema_refrigeracao, 2, "Com o equipamento desligado da tomada, verificar visualmente se há algum cabo ou objeto obstruindo as pás da ventoinha.", true).
recomendacao(falha_sistema_refrigeracao, 3, "Encaminhar para substituição do conjunto cooler/ventoinha defeituoso.", true).

% ------------------------------------------------------------------------------
% Pares de Sintomas Contraditórios (Seção 12): contraditorio(SintomaA, SintomaB)
% ------------------------------------------------------------------------------

contraditorio(computador_ligado, computador_nao_liga).
contraditorio(sem_imagem, exibe_imagem).
contraditorio(monitor_ligado, monitor_desligado).
contraditorio(ventoinhas_funcionando, ventoinhas_paradas).
contraditorio(conectado_rede_local, desconectado_rede_local).
contraditorio(acessa_por_ip, nao_acessa_por_ip).
contraditorio(responde_gateway, nao_responde_gateway).
