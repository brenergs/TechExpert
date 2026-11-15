# Engenharia do Conhecimento e Base de Regras — TechExpert

> **Versão da Base de Conhecimento:** `1.0.0`  
> **Documento de referência:** `TechExpert — Sistema Especialista para Diagnóstico de Problemas Computacionais.pdf` (Seções 2, 5, 11, 12 e 17)  
> **Status:** Mapeamento técnico da v1.0 concluído (Passo 1.2)

---

## 1. Visão Geral e Princípios da Engenharia do Conhecimento

A inteligência do **TechExpert** fundamenta-se na **Inteligência Artificial Simbólica**, formalizando o raciocínio de profissionais de suporte técnico e manutenção de computadores em três elementos principais (Seção 11):

1. **Base de Fatos (`prolog/facts/symptoms.pl`):** armazena o vocabulário controlado de sintomas, categorias, recomendações ordenadas, alertas técnicos, pares de sintomas contraditórios, sugestões complementares e a versão vigente da base de regras.
2. **Base de Regras (`prolog/rules/*.pl`):** formaliza relações lógicas do tipo `SE <conjunto de sintomas observados> ENTÃO <hipótese diagnóstica + justificativa>` distribuídas por domínio (`hardware.pl`, `network.pl`, `performance.pl`).
3. **Motor de Inferência (`prolog/knowledge_base.pl`):** executa unificação, *backtracking* e encadeamento de regras no **SWI-Prolog** para produzir conclusões explicáveis.

### Princípios Obrigatórios da Base v1.0
- **Versionamento rastreável (`versao_base_regras: 1.0.0`):** toda execução de diagnóstico deve registrar a versão da base de regras utilizada (Seção 17).
- **Múltiplas hipóteses (Seção 11.3 / RF06):** o motor não deve interromper na primeira regra satisfeita; todas as hipóteses compatíveis com os sintomas fornecidos devem ser retornadas.
- **Hipóteses técnicas, não diagnósticos definitivos (Seção 17):** toda conclusão deve ser apresentada como hipótese técnica sujeita a confirmação por inspeção adicional.
- **Explicabilidade (Seção 1 / RF05 / RNF06):** cada hipótese gerada deve identificar explicitamente o identificador da regra (`regra_id`), os sintomas/evidências utilizados e uma justificativa técnica compreensível.
- **Abstenção segura (Seção 17 / RF09):** se as evidências forem insuficientes ou contraditórias, o sistema não deve inferir um diagnóstico indevido; deve sinalizar a insuficiência/contradição e sugerir sintomas complementares.

---

## 2. Mapeamento dos 7 Domínios do Escopo Inicial

A seguir está o mapeamento completo das regras, sintomas, causas, procedimentos recomendados (ordenados), alertas de risco e referências técnicas para os 7 domínios definidos nas Seções 2 e 5.1 da especificação.

---

### 2.1. Domínio 1 — Problemas de Inicialização do Computador (`prolog/rules/hardware.pl`)

| ID da Regra | Sintomas Observáveis (Átomos + Descrição) | Causa / Hipótese (`identificador`) | Justificativa Técnica (Explicabilidade) | Procedimentos Recomendados (Ordenados) | Alerta de Risco / Conhecimento Técnico | Referência Técnica de Validação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `regra_init_01` | • `computador_nao_liga` *(Computador não liga ao pressionar o botão power)*<br>• `sem_leds_acesos` *(Nenhum LED da placa-mãe ou gabinete acende)*<br>• `ventoinhas_paradas` *(Nenhuma ventoinha gira)* | `falha_alimentacao_eletrica` | Ausência total de sinais elétricos (LEDs apagados e ventoinhas paradas) sugere interrupção no fornecimento de energia antes da placa-mãe. | 1. Verificar se o cabo de força está firmemente conectado à tomada e à fonte.<br>2. Testar a tomada elétrica com outro aparelho ou testar outra tomada confiável.<br>3. Verificar se a chave seletora/interruptor traseiro da fonte (se existir) está ligado.<br>4. Caso utilize filtro de linha ou nobreak, testar ligando diretamente na tomada (respeitando a tensão local). | **Risco baixo (etapas 1–4):** evitar conectar em tomadas com tensão incompatível (110V/220V). Nunca abrir a carcaça da fonte de alimentação. | Guias de troubleshooting de energia e POST — CompTIA A+ (Hardware & Power Supply Diagnostics). |
| `regra_init_02` | • `computador_nao_liga` *(Computador não liga)*<br>• `tomada_com_energia` *(Tomada e filtro de linha confirmados com energia)*<br>• `cabo_forca_conectado` *(Cabo de alimentação devidamente conectado)*<br>• `sem_leds_acesos` *(Nenhum LED acende)* | `possivel_falha_fonte_ou_placa_mae` | Com tomada e cabo de força confirmados, a ausência de resposta elétrica aponta para possível defeito na fonte de alimentação (PSU), botão power ou placa-mãe. | 1. Desconectar periféricos USB externos não essenciais e tentar ligar novamente.<br>2. Verificar externamente se o cabo da fonte está íntegro (sem dobras ou danos).<br>3. Encaminhar para teste de fonte com testador apropriado ou multímetro em bancada.<br>4. Avaliar conexões internas de energia (ATX 24 pinos / EPS) e botão power. | **Requer conhecimento técnico (passos 3 e 4):** abertura de gabinete e manipulação elétrica exigem proteção antiestática (ESD) e equipamento desligado da rede elétrica. | Procedimentos de diagnóstico de PSU e placa-mãe — CompTIA A+ / Manuais de manutenção ATX. |
| `regra_init_03` | • `computador_ligado` *(Computador liga normalmente)*<br>• `exibe_imagem` *(Monitor exibe imagem de inicialização)*<br>• `mensagem_sem_dispositivo_boot` *(Exibe mensagem de ausência de dispositivo de boot / sistema não encontrado)* | `falha_dispositivo_boot` | O hardware completa o POST e exibe vídeo, mas o firmware (BIOS/UEFI) não localiza um sistema operacional inicializável no disco configurado. | 1. Remover pendrives, cartões SD ou mídias externas conectadas e reiniciar.<br>2. Acessar o menu de BIOS/UEFI para verificar se o SSD/HD é reconhecido e conferir a ordem de boot.<br>3. Verificar (se desktop) se os cabos SATA de dados e energia do disco estão firmes.<br>4. Caso o disco não apareça na BIOS ou haja falha lógica do bootloader, realizar diagnóstico de saúde do disco/reparo de boot. | **Requer conhecimento técnico (passos 2–4):** alterações indevidas na BIOS/UEFI ou comandos de particionamento podem causar perda de dados; manter equipamento desligado da tomada ao checar cabos internos. | Documentação UEFI/BIOS Boot Sequence e recuperação de inicialização (Microsoft Learn / Linux Boot Troubleshooting). |

---

### 2.2. Domínio 2 — Investigação de Falhas de Vídeo (`prolog/rules/hardware.pl`)

| ID da Regra | Sintomas Observáveis (Átomos + Descrição) | Causa / Hipótese (`identificador`) | Justificativa Técnica (Explicabilidade) | Procedimentos Recomendados (Ordenados) | Alerta de Risco / Conhecimento Técnico | Referência Técnica de Validação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `regra_video_01` *(Regra oficial da Seção 12)* | • `sem_imagem` *(Tela sem imagem)*<br>• `monitor_desligado` *(Monitor sem LED indicador / aparentemente desligado)* | `problema_monitor` | Quando não há imagem e o monitor permanece desligado, a causa provável está na alimentação elétrica do próprio monitor ou no seu botão/cabo de energia. | 1. Verificar a alimentação elétrica do monitor (cabo de força na tomada e atrás do monitor).<br>2. Pressionar o botão de energia do monitor e observar o LED indicador.<br>3. Testar o monitor em outra tomada ou com outro cabo de alimentação compatível. | **Risco baixo:** não abrir a carcaça do monitor devido a capacitores internos energizados. | Especificação oficial TechExpert PDF (Seção 12 — `knowledge_base.pl`) e guias de diagnóstico de displays. |
| `regra_video_02` *(Regra oficial da Seção 12)* | • `sem_imagem` *(Tela sem imagem)*<br>• `computador_ligado` *(Computador permanece ligado)*<br>• `ventoinhas_funcionando` *(Ventoinhas internas girando)* | `possivel_falha_ram` | O computador energiza e mantém as ventoinhas ativas, mas não gera vídeo; esse comportamento frequentemente indica interrupção no POST por mau contato ou falha nos módulos de memória RAM. | 1. Desligar completamente o computador da tomada antes de qualquer inspeção interna.<br>2. Investigar os módulos de memória RAM (verificar encaixe firme nos slots).<br>3. Se houver mais de um módulo, testar um módulo por vez em slots alternados após limpeza segura dos contatos (álcool isopropílico apenas se necessário e seco). | **Requer conhecimento técnico:** manuseio interno exige desligamento total da energia, descarga eletrostática (ESD) e cuidado para não forçar travas dos slots DIMM/SO-DIMM. | Especificação oficial TechExpert PDF (Seção 12 — `knowledge_base.pl`) e procedimentos de POST/RAM (CompTIA A+). |
| `regra_video_03` | • `sem_imagem` *(Tela sem imagem)*<br>• `computador_ligado` *(Computador ligado)*<br>• `monitor_ligado` *(Monitor ligado com LED ativo)*<br>• `mensagem_sem_sinal_video` *(Monitor exibe "Sem sinal" / "No signal")* | `falha_cabo_ou_entrada_video` | Tanto o computador quanto o monitor estão energizados, porém não há transmissão de sinal entre a saída de vídeo e o painel do monitor. | 1. Verificar se o cabo HDMI/DisplayPort/VGA está firme em ambas as extremidades.<br>2. Conferir no menu OSD do monitor se a fonte de entrada selecionada (HDMI 1, DP, etc.) corresponde à porta conectada.<br>3. Em desktops com placa de vídeo dedicada, confirmar se o cabo está ligado na placa dedicada e não na placa-mãe.<br>4. Testar outro cabo de vídeo ou outra porta disponível. | **Risco baixo:** conectar ou desconectar cabos de vídeo com firmeza, sem forçar conectores tortos. | Guias de troubleshooting de vídeo VESA / HDMI / DisplayPort e CompTIA A+. |
| `regra_video_04` | • `computador_ligado` *(Computador ligado)*<br>• `monitor_ligado` *(Monitor ligado)*<br>• `artefatos_visuais_ou_piscando` *(Faixas coloridas, blocos distorcidos ou tela piscando)* | `possivel_falha_placa_video` | Artefatos visuais ou falhas intermitentes de renderização com monitor energizado apontam para instabilidade de GPU, VRAM, driver gráfico ou cabo defeituoso. | 1. Testar outro cabo de vídeo e outro monitor para descartar falha externa.<br>2. Atualizar ou reinstalar de forma limpa o driver de vídeo (em modo de segurança, se necessário).<br>3. Verificar temperaturas da GPU e rotação das ventoinhas da placa.<br>4. Em desktop, verificar o encaixe PCIe e cabos de alimentação auxiliar da GPU. | **Requer conhecimento técnico (passos 2 e 4):** remoção/reinstalação de GPU exige equipamento fora da tomada e proteção antiestática; evitar alterações de tensão/clock. | Guias de diagnóstico de subsistema gráfico (NVIDIA/AMD/Intel Troubleshooting Guides). |

---

### 2.3. Domínio 3 — Possíveis Problemas de Memória RAM (`prolog/rules/hardware.pl`)

| ID da Regra | Sintomas Observáveis (Átomos + Descrição) | Causa / Hipótese (`identificador`) | Justificativa Técnica (Explicabilidade) | Procedimentos Recomendados (Ordenados) | Alerta de Risco / Conhecimento Técnico | Referência Técnica de Validação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `regra_ram_01` | • `computador_ligado` *(Computador ligado)*<br>• `sem_imagem` *(Sem imagem no monitor)*<br>• `bipes_continuos_placa_mae` *(Placa-mãe emite sequência de bipe/códigos de erro de memória no POST)* | `falha_contato_ou_modulo_ram` | Códigos sonoros (bipes) ou LEDs de diagnóstico DRAM durante o POST indicam explicitamente falha na inicialização ou detecção da memória RAM. | 1. Consultar o manual da placa-mãe/notebook para confirmar o significado exato do padrão de bipe.<br>2. Desligar o equipamento da tomada e remover a bateria (se aplicável).<br>3. Reencaixar os módulos RAM garantindo travamento completo das presilhas laterais.<br>4. Testar cada módulo individualmente para isolar módulo ou slot defeituoso. | **Requer conhecimento técnico:** nunca inserir ou remover módulos de RAM com o equipamento energizado ou em suspensão; risco de dano elétrico permanente ao módulo e ao slot. | Manuais de códigos de bipe BIOS/UEFI (AMI, Award, Phoenix) e especificações JEDEC DDR4/DDR5. |
| `regra_ram_02` | • `computador_ligado` *(Sistema inicia)*<br>• `tela_azul_frequente` *(Ocorrência recorrente de tela azul / kernel panic)*<br>• `reinicializacao_aleatoria` *(Reinicializações súbitas sob uso)* | `instabilidade_memoria_ram` | Falhas intermitentes de leitura/escrita em endereços de memória causam corrupção de estado do sistema operacional, resultando em telas azuis (BSOD) ou reinícios inesperados. | 1. Verificar se há perfis de overclock (XMP/DOCP) ativos e testar temporariamente em frequência padrão JEDEC.<br>2. Executar ferramenta de diagnóstico de memória não destrutiva (ex.: Diagnóstico de Memória do Windows ou MemTest86).<br>3. Caso o teste acuse erros, isolar o módulo defeituoso testando um pente por vez. | **Requer conhecimento técnico (passos 1 e 3):** alterações em BIOS e abertura do gabinete exigem cuidado técnico; recomenda-se backup de arquivos importantes antes de diagnósticos prolongados. | Microsoft Windows BugCheck / Memory Diagnostics Documentation & MemTest86 Reference. |

---

### 2.4. Domínio 4 — Lentidão do Sistema Operacional e Problemas de Armazenamento (`prolog/rules/performance.pl`)

| ID da Regra | Sintomas Observáveis (Átomos + Descrição) | Causa / Hipótese (`identificador`) | Justificativa Técnica (Explicabilidade) | Procedimentos Recomendados (Ordenados) | Alerta de Risco / Conhecimento Técnico | Referência Técnica de Validação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `regra_perf_01` *(Regra oficial da Seção 12)* | • `computador_lento` *(Sistema operacional respondendo com lentidão excessiva)*<br>• `muita_memoria_utilizada` *(Consumo de memória RAM próximo a 90–100%)* | `uso_excessivo_memoria` | Quando a memória física se esgota, o sistema passa a usar memória virtual (paginação em disco), degradando drasticamente o tempo de resposta geral. | 1. Abrir o Gerenciador de Tarefas / Monitor do Sistema e ordenar os processos por uso de memória.<br>2. Identificar e encerrar aplicativos não essenciais ou com vazamento de memória (muitas abas de navegador, serviços em segundo plano).<br>3. Revisar programas configurados para iniciar junto com o sistema operacional.<br>4. Avaliar se a quantidade de RAM instalada atende à carga de trabalho habitual. | **Risco baixo (passos 1–3):** evitar encerrar processos críticos do núcleo do sistema operacional para não perder trabalho não salvo. | Especificação oficial TechExpert PDF (Seção 12 — `knowledge_base.pl`) e documentação de gerenciamento de memória de SO. |
| `regra_perf_02` | • `computador_lento` *(Sistema lento)*<br>• `uso_cpu_elevado` *(Processador sustentadamente próximo de 100%)*<br>• `travamentos_frequentes` *(Engasgos na interface e atrasos de resposta)* | `uso_excessivo_cpu` | Saturação contínua da CPU impede o escalonamento ágil de tarefas interativas, causando congelamentos temporários e lentidão generalizada. | 1. Inspecionar no monitor de recursos quais processos consomem mais CPU.<br>2. Verificar se há atualizações do sistema, indexação ou varredura de antivírus em execução temporária.<br>3. Encerrar processos anômalos travados e verificar se o problema persiste após reinicialização.<br>4. Checar se a frequência da CPU não está limitada por temperatura alta (*thermal throttling*) ou plano de energia restritivo. | **Risco baixo:** não desativar permanentemente soluções de segurança/antivírus. | Guias de análise de desempenho de CPU (Windows Performance Monitor / Linux `top`/`htop`). |
| `regra_perf_03` | • `computador_lento` *(Sistema lento)*<br>• `pouco_espaco_disco` *(Unidade principal com menos de 10–15% de espaço livre)* | `armazenamento_quase_cheio` | Discos e especialmente SSDs próximos da capacidade máxima perdem desempenho de escrita, prejudicam arquivos temporários e impedem a alocação adequada de paginação. | 1. Verificar espaço livre disponível nas partições do sistema.<br>2. Executar limpeza segura de arquivos temporários, lixeira e cache de atualizações antigas usando ferramentas nativas do sistema.<br>3. Remover programas não utilizados ou mover arquivos pessoais grandes (vídeos, backups) para armazenamento secundário/nuvem, mantendo ao menos 15% livre. | **Risco baixo:** nunca apagar manualmente pastas de sistema (ex.: `Windows`, `System32`, `/usr`, `/etc`) nem arquivos desconhecidos sem certeza. | Boas práticas de armazenamento SSD/HDD e manutenção de sistemas operacionais (CompTIA A+). |
| `regra_perf_04` | • `computador_lento` *(Sistema lento)*<br>• `uso_disco_100_porcento` *(Uso ativo de disco constantemente em 100%)*<br>• `lentidao_abrir_arquivos` *(Demora extrema ao abrir pastas, programas ou na inicialização)* | `degradacao_ou_falha_disco` | Uso contínuo de disco em 100% combinado com alta latência de leitura/escrita indica possível gargalo de HD mecânico, fragmentação severa ou falha física iminente (setores defeituosos / desgaste). | 1. **Realizar backup imediato dos arquivos importantes** em mídia externa ou nuvem.<br>2. Verificar no monitor de recursos se algum processo legítimo (como atualização) está realizando leitura intensa.<br>3. Consultar os indicadores de saúde **S.M.A.R.T.** da unidade de armazenamento.<br>4. Caso haja setores realocados/pendentes ou desgaste crítico, planejar substituição do disco (preferencialmente por SSD) com técnico. | **Alerta crítico de dados:** evitar rodar testes de estresse prolongados ou desfragmentação em discos com suspeita de falha física antes de concluir o backup; nunca desfragmentar SSDs. | Especificação S.M.A.R.T. (ATA/NVMe) e guias de diagnóstico de armazenamento. |

---

### 2.5. Domínio 5 — Problemas de Conexão com a Internet (`prolog/rules/network.pl`)

| ID da Regra | Sintomas Observáveis (Átomos + Descrição) | Causa / Hipótese (`identificador`) | Justificativa Técnica (Explicabilidade) | Procedimentos Recomendados (Ordenados) | Alerta de Risco / Conhecimento Técnico | Referência Técnica de Validação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `regra_rede_01` | • `sem_internet` *(Sem acesso à internet)*<br>• `desconectado_rede_local` *(Computador sem conexão Wi-Fi ativa ou cabo de rede desconectado/sem link)* | `falha_conexao_local_wifi_ou_cabo` | O equipamento não possui enlace ativo com a rede local (Wi-Fi desligado/desconectado ou cabo Ethernet sem link), impossibilitando qualquer comunicação externa. | 1. Verificar se o Modo Avião está desativado e se o adaptador Wi-Fi está ligado.<br>2. Se usar cabo Ethernet, checar se o cabo está encaixado nas duas pontas e se os LEDs da porta acendem.<br>3. Verificar se outros dispositivos conseguem se conectar à mesma rede Wi-Fi.<br>4. Reiniciar o adaptador de rede no sistema operacional ou verificar drivers do adaptador. | **Risco baixo e privacidade:** o sistema nunca deve solicitar senha do Wi-Fi ao usuário (Seção 17). | Metodologia de troubleshooting em camadas OSI/TCP-IP (Camadas 1 e 2 — Cisco Networking Academy). |
| `regra_rede_02` | • `sem_internet` *(Sem acesso à internet)*<br>• `conectado_rede_local` *(Conectado ao Wi-Fi ou cabo local)*<br>• `nao_responde_gateway` *(Não consegue alcançar/pingar o roteador local / gateway padrão)* | `falha_roteador_ou_gateway` | Apesar de o enlace local parecer ativo, não há resposta do gateway padrão (roteador), indicando travamento do roteador, falha de atribuição IP (DHCP) ou conflito local. | 1. Reiniciar o modem/roteador desligando-o da tomada por 30 segundos e religando.<br>2. Verificar os LEDs indicadores de energia, Wi-Fi e internet no roteador.<br>3. Renovar a concessão DHCP / reiniciar a interface de rede do computador.<br>4. Testar a conexão em outro dispositivo para confirmar se o roteador está respondendo. | **Risco baixo e privacidade:** não redefinir o roteador para padrões de fábrica (*hard reset*) sem orientação, pois apaga configurações do provedor; não informar senhas administrativas do roteador no sistema. | Metodologia de troubleshooting TCP/IP (Camada 3 — Gateway/DHCP — Cisco / CompTIA Network+). |
| `regra_rede_03` | • `sem_internet` *(Sem acesso à internet)*<br>• `conectado_rede_local` *(Conectado à rede local)*<br>• `responde_gateway` *(Roteador/gateway responde normalmente)*<br>• `nao_acessa_por_ip` *(Não alcança endereços IP externos públicos)* | `indisponibilidade_provedor_isp` | A rede local e o roteador estão respondendo, mas o tráfego não alcança IPs públicos externos, apontando falha no enlace WAN, autenticação do provedor ou manutenção da operadora. | 1. Observar nos LEDs do modem/ONU se há sinal óptico/DSL ativo ou LED vermelho (LOS/Alarme).<br>2. Verificar se o cabo entre o modem/ONU e o roteador está conectado na porta WAN.<br>3. Testar se outros aparelhos na mesma rede também estão sem acesso externo.<br>4. Entrar em contato com o provedor de internet (ISP) informando o status dos LEDs do equipamento. | **Risco baixo:** não dobrar ou desconectar cabos de fibra óptica (risco de quebra da fibra). | Metodologia de isolamento de falha LAN vs. WAN — CompTIA Network+ / Cisco Troubleshooting. |

---

### 2.6. Domínio 6 — Problemas Relacionados ao DNS (`prolog/rules/network.pl`)

| ID da Regra | Sintomas Observáveis (Átomos + Descrição) | Causa / Hipótese (`identificador`) | Justificativa Técnica (Explicabilidade) | Procedimentos Recomendados (Ordenados) | Alerta de Risco / Conhecimento Técnico | Referência Técnica de Validação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `regra_dns_01` *(Regra oficial da Seção 12)* | • `sem_internet` *(Usuário relata falta de navegação/internet)*<br>• `acessa_por_ip` *(Consegue alcançar/pingar endereços IP externos)*<br>• `nao_acessa_por_dominio` *(Não consegue acessar sites pelo nome de domínio)* | `possivel_falha_dns` | A conectividade IP externa funciona normalmente, mas a tradução de nomes de domínio para endereços IP falha, caracterizando erro na resolução DNS local ou do servidor DNS configurado. | 1. Verificar as configurações de DNS do adaptador de rede (evitar endereços manuais inválidos).<br>2. Limpar o cache DNS local do sistema operacional.<br>3. Testar temporariamente um servidor DNS público confiável (ex.: `1.1.1.1` ou `8.8.8.8`) ou verificar DNS configurado no roteador.<br>4. Desativar temporariamente VPNs ou proxies locais para verificar se estão bloqueando consultas DNS. | **Requer conhecimento técnico (passo 3):** alterações em propriedades avançadas de rede devem ser anotadas previamente para permitir reversão. | Especificação oficial TechExpert PDF (Seções 11.2 e 12 — `knowledge_base.pl`) e RFC 1034 / RFC 1035 (Domain Name System). |

---

### 2.7. Domínio 7 — Possíveis Problemas de Superaquecimento (`prolog/rules/hardware.pl`)

| ID da Regra | Sintomas Observáveis (Átomos + Descrição) | Causa / Hipótese (`identificador`) | Justificativa Técnica (Explicabilidade) | Procedimentos Recomendados (Ordenados) | Alerta de Risco / Conhecimento Técnico | Referência Técnica de Validação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `regra_temp_01` | • `desligamento_subito` *(Computador desliga repentinamente sem aviso, especialmente em carga)*<br>• `gabinete_muito_quente` *(Carcaça ou saída de ar extremamente quente ao toque)*<br>• `ventoinhas_alta_rotacao` *(Ventoinhas operam em rotação máxima constante)* | `superaquecimento_cpu_gpu` | A combinação de calor excessivo, rotação máxima dos coolers e desligamento súbito indica acionamento da proteção térmica de hardware (*thermal shutdown*) para evitar danos ao processador/GPU. | 1. Verificar se as saídas e entradas de ar estão desobstruídas (em notebooks, evitar uso sobre camas/almofadas).<br>2. Monitorar temperaturas de CPU/GPU via software confiável de telemetria.<br>3. Realizar limpeza externa cuidadosa das saídas de poeira (com o equipamento desligado).<br>4. Caso persista, encaminhar para limpeza interna completa e substituição da pasta térmica. | **Requer conhecimento técnico (passo 4):** nunca usar aspirador comum diretamente em componentes internos (risco de estática) nem desmontar dissipadores sem pasta térmica nova e técnica adequada. | Documentação térmica de processadores (Intel / AMD Thermal Management) e boas práticas CompTIA A+. |
| `regra_temp_02` | • `computador_ligado` *(Computador ligado)*<br>• `gabinete_muito_quente` *(Aquecimento elevado perceptível)*<br>• `ventoinha_parada_ou_ruido_anormal` *(Cooler parado ou emitindo ruído mecânico forte de atrito)* | `falha_sistema_refrigeracao` | Calor excessivo acompanhado de ventoinha inoperante ou com ruído mecânico aponta para falha física do cooler/fan ou obstrução mecânica da hélice. | 1. Desligar o computador para evitar estresse térmico prolongado caso a ventoinha principal do processador esteja parada.<br>2. Verificar visualmente (através das grades ou com equipamento desligado da tomada) se há algum cabo ou objeto obstruindo as pás da ventoinha.<br>3. Encaminhar para substituição do conjunto cooler/ventoinha defeituoso. | **Alerta crítico / Requer conhecimento técnico:** não continuar usando o computador sob carga pesada com a ventoinha da CPU parada; desconectar da energia elétrica antes de qualquer inspeção interna. | Guias de manutenção de refrigeração e fluxo de ar em PCs e notebooks (CompTIA A+). |

---

## 3. Cenários Especiais de Inferência (Múltiplas Hipóteses, Contradições e Consulta Complementar)

### 3.1. Múltiplas Hipóteses Simultâneas (Seção 11.3 / RF06)
O motor em Prolog utiliza `findall/3` para retornar **todas** as regras satisfeitas, evitando assumir uma única causa quando os sintomas suportam mais de uma linha de investigação:

- **Exemplo A (Vídeo + Monitor/RAM):** Se o usuário informar `[sem_imagem, monitor_desligado, computador_ligado, ventoinhas_funcionando]`, o sistema dispara simultaneamente:
  - `regra_video_01` → `problema_monitor` (pois o monitor está desligado);
  - `regra_video_02` → `possivel_falha_ram` (pois o computador está ligado com ventoinhas girando e sem imagem).
- **Exemplo B (Lentidão Multifatorial):** Se o usuário informar `[computador_lento, muita_memoria_utilizada, pouco_espaco_disco]`, o sistema retorna:
  - `regra_perf_01` → `uso_excessivo_memoria`;
  - `regra_perf_03` → `armazenamento_quase_cheio`.

### 3.2. Pares de Sintomas Contraditórios (Seção 12)
Antes ou durante a inferência, a base de fatos sinaliza pares mutuamente exclusivos. Caso enviados juntos na mesma consulta, o sistema deve alertar a contradição em vez de produzir conclusões inconsistentes:

| Sintoma A | Sintoma B | Motivo da Contradição |
| :--- | :--- | :--- |
| `computador_ligado` | `computador_nao_liga` | Estados elétricos opostos para o mesmo evento de inicialização. |
| `sem_imagem` | `exibe_imagem` | Presença e ausência simultânea de saída de vídeo. |
| `monitor_ligado` | `monitor_desligado` | Estados de energia opostos para o monitor. |
| `ventoinhas_funcionando` | `ventoinhas_paradas` | Estados opostos de rotação das ventoinhas. |
| `conectado_rede_local` | `desconectado_rede_local` | Enlace de rede local ativo e inativo simultaneamente. |
| `acessa_por_ip` | `nao_acessa_por_ip` | Resposta e falha de resposta simultânea para IP externo. |
| `responde_gateway` | `nao_responde_gateway` | Estados opostos de alcance ao roteador local. |

### 3.3. Gatilhos de Consulta Complementar (RF09)
Quando os sintomas informados não atingem todas as premissas de nenhuma regra (ou ativam parcialmente uma família de regras), o sistema solicita informações adicionais antes de concluir:

| Sintoma(s) Informado(s) (Insuficientes) | Hipóteses Candidatas Parciais | Perguntas / Sintomas Complementares Sugeridos |
| :--- | :--- | :--- |
| `[sem_imagem]` | `problema_monitor`, `possivel_falha_ram`, `falha_cabo_ou_entrada_video` | Verificar se `computador_ligado`, `ventoinhas_funcionando`, `monitor_ligado` ou `monitor_desligado`, e se aparece `mensagem_sem_sinal_video`. |
| `[computador_nao_liga]` | `falha_alimentacao_eletrica`, `possivel_falha_fonte_ou_placa_mae` | Confirmar se há `sem_leds_acesos`, `ventoinhas_paradas`, `tomada_com_energia` e `cabo_forca_conectado`. |
| `[sem_internet]` | `falha_conexao_local_wifi_ou_cabo`, `falha_roteador_ou_gateway`, `indisponibilidade_provedor_isp`, `possivel_falha_dns` | Verificar se está `conectado_rede_local` ou `desconectado_rede_local`, se `responde_gateway` e se `acessa_por_ip` / `nao_acessa_por_dominio`. |
| `[computador_lento]` | `uso_excessivo_memoria`, `uso_excessivo_cpu`, `armazenamento_quase_cheio`, `degradacao_ou_falha_disco` | Verificar no monitor de recursos se há `muita_memoria_utilizada`, `uso_cpu_elevado`, `pouco_espaco_disco` ou `uso_disco_100_porcento`. |
| `[gabinete_muito_quente]` | `superaquecimento_cpu_gpu`, `falha_sistema_refrigeracao` | Verificar se ocorre `desligamento_subito`, `ventoinhas_alta_rotacao` ou `ventoinha_parada_ou_ruido_anormal`. |

---

## 4. Escopo Negativo e Diretrizes de Segurança (Seções 5.2 e 17)

### 4.1. Funcionalidades Explicitamente Fora do Escopo da Versão 1.0
Nenhuma regra, recomendação ou requisito da versão 1.0 deve contemplar:
- **Diagnóstico físico automatizado dos componentes** (leitura direta de sensores de placa-mãe, multímetro automático ou testes de hardware em baixo nível pelo sistema).
- **Execução automática de reparos no computador** (o sistema apenas **recomenda** procedimentos ao usuário; não altera configurações nem executa scripts na máquina).
- **Acesso direto ao sistema operacional do usuário** (sem agentes locais, coleta automática de logs ou leitura de registro/sistema de arquivos).
- **Garantia absoluta de identificação de defeitos físicos** (saídas são hipóteses orientativas).
- **Substituição da avaliação de profissionais especializados** (recomenda encaminhamento técnico quando necessário).
- **Treinamento de modelos de Deep Learning** (abordagem estritamente simbólica na v1.0).

### 4.2. Diretrizes Obrigatórias de Segurança para Regras e Recomendações
1. **Proibição de procedimentos destrutivos:** nenhuma regra deve sugerir ações com risco iminente ao equipamento ou aos dados (ex.: abrir fonte chaveada, lavar componentes com água, formatar disco sem backup, atualizar BIOS sem estabilidade de energia, alterar tensões/overclock).
2. **Sinalização explícita de risco técnico:** toda recomendação que envolva abertura de gabinete, manuseio de componentes internos (RAM, GPU, cabos SATA, coolers) ou alterações avançadas de BIOS/rede deve possuir flag `RequerConhecimentoTecnico = true` e exibir alerta visível ao usuário.
3. **Privacidade estrita:** nenhuma recomendação ou pergunta complementar pode solicitar senhas (Wi-Fi, usuário do SO, roteador, contas online), chaves privadas ou informações confidenciais.
4. **Rastreabilidade de versão:** toda regra pertence a uma versão explícita da base (`1.0.0`), registrada no banco de dados a cada consulta diagnosticada.
