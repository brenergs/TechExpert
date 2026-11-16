# Especificação de Requisitos e Padronização — TechExpert

> **Versão:** `1.0.0`  
> **Documento de referência:** `TechExpert — Sistema Especialista para Diagnóstico de Problemas Computacionais.pdf` (Seções 7, 8, 12, 13, 14 e 17)  
> **Documento complementar:** [knowledge_base.md](./knowledge_base.md)  
> **Status:** Especificação e dicionário controlado da v1.0 concluídos (Passo 1.3)

---

## 1. Requisitos Funcionais Consolidados (`RF01–RF10`)

A tabela abaixo consolida os requisitos funcionais da Seção 7 do documento de projeto, com seus critérios de aceitação, endpoints associados e módulos responsáveis:

| ID | Requisito | Descrição Original | Critérios de Aceitação | Endpoint / Interface Principal | Módulos Responsáveis |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF01** | Cadastro de consulta | Permitir iniciar uma nova investigação. | O usuário consegue criar uma nova consulta associada ao seu cadastro (ou sessão válida), recebendo um `id` único, `data_consulta` e `status = aberta`. | `POST /api/consultas` | `models.py` (`Consulta`), `diagnostics.py`, páginas React |
| **RF02** | Seleção de sintomas | Permitir informar os sintomas observados. | O usuário seleciona um ou mais sintomas do vocabulário controlado agrupados por categoria; os sintomas são validados contra a whitelist e persistidos em `Consulta_Sintoma`. | `POST /api/consultas/{id}/sintomas` | `symptoms.pl`, `diagnostic.py` (Pydantic), `diagnostics.py`, formulário React |
| **RF03** | Diagnóstico | Identificar possíveis causas utilizando regras lógicas. | A partir dos sintomas registrados na consulta, o motor Prolog executa a inferência e identifica as causas compatíveis; se não houver evidências suficientes, retorna status inconclusivo sem forçar diagnóstico. | `POST /api/consultas/{id}/diagnosticar` | `knowledge_base.pl`, `rules/*.pl`, `prolog_service.py` |
| **RF04** | Recomendações | Apresentar procedimentos para investigar ou solucionar o problema. | Cada hipótese retornada traz recomendações ordenadas (`ordem_execucao`) e indicação explícita quando o passo exigir conhecimento técnico. | `POST /api/consultas/{id}/diagnosticar`<br>`GET /api/consultas/{id}` | `symptoms.pl`, `Recomendacao`, componente de recomendações React |
| **RF05** | Explicabilidade | Informar quais evidências e regras fundamentaram o resultado. | Cada diagnóstico lista os identificadores das regras aplicadas (`regra_id`), os sintomas observados que dispararam a regra e a justificativa textual legível, persistidos em `Regra_Aplicada`. | `POST /api/consultas/{id}/diagnosticar`<br>`GET /api/consultas/{id}` | `knowledge_base.pl`, `Regra_Aplicada`, painel de explicabilidade React |
| **RF06** | Múltiplos diagnósticos | Permitir apresentar mais de uma hipótese. | O motor utiliza `findall/3` (ou equivalente) para coletar todas as regras satisfeitas; a API e a UI exibem todas as hipóteses compatíveis como lista, nunca assumindo apenas a primeira como única verdade. | `POST /api/consultas/{id}/diagnosticar` | `knowledge_base.pl`, `prolog_service.py`, cards de hipóteses React |
| **RF07** | Histórico | Registrar consultas realizadas. | Todas as consultas, sintomas informados, diagnósticos, recomendações, regras aplicadas e a versão da base de regras permanecem gravados no PostgreSQL e podem ser listados e inspecionados posteriormente. | `GET /api/consultas`<br>`GET /api/consultas/{id}` | `models.py`, `diagnostics.py`, página de histórico React |
| **RF08** | Gerenciamento da base | Permitir que administradores autorizados atualizem o conhecimento do sistema. | Apenas usuários com papel administrativo autorizado podem consultar/atualizar itens da base de conhecimento e acionar recarga controlada no motor Prolog, preservando integridade e versionamento. | `GET / PUT / POST /api/admin/conhecimento` *(autenticado)* | `models.py` (`Usuario`), `prolog_service.py`, rotas admin, painel admin React |
| **RF09** | Consulta complementar | Solicitar informações adicionais quando os sintomas forem insuficientes. | Quando nenhuma regra completa dispara (ou há hipóteses parcialmente satisfeitas), o motor retorna sugestões de sintomas complementares em forma de perguntas objetivas para o usuário responder e reexecutar o diagnóstico. | `POST /api/consultas/{id}/diagnosticar` *(campo `sintomas_complementares`)* | `symptoms.pl`, `knowledge_base.pl`, fluxo interativo React |
| **RF10** | Encerramento | Permitir finalizar uma investigação. | O usuário pode encerrar explicitamente uma consulta em andamento ou diagnosticada, alterando seu `status` para `encerrada` e impedindo novas mutações de diagnóstico nessa investigação. | `PATCH /api/consultas/{id}/encerrar` | `models.py` (`Consulta`), `diagnostics.py`, botão de encerramento React |

---

## 2. Requisitos Não Funcionais Consolidados (`RNF01–RNF08`)

| ID | Requisito | Descrição Original | Critério de Verificação / Meta Técnica | Estratégia de Implementação |
| :--- | :--- | :--- | :--- | :--- |
| **RNF01** | Desempenho | Executar inferências com tempo de resposta adequado. | Tempo de inferência no motor Prolog `< 200 ms` para o conjunto de regras da v1.0 e resposta ponta a ponta da API `< 500 ms` em ambiente local/Docker, aferido na Fase 5.2. | Carregamento único da base Prolog em memória na inicialização do serviço Python (`PySwip`), evitando reconsultas por requisição. |
| **RNF02** | Usabilidade | Apresentar interface simples e intuitiva. | Usuário leigo consegue iniciar consulta, marcar sintomas categorizados, responder perguntas complementares e ler hipóteses/alertas sem jargões opacos. | Agrupamento de sintomas por domínio, linguagem clara nas descrições e destaque visual para alertas técnicos e avisos de hipótese. |
| **RNF03** | Manutenibilidade | Permitir adicionar e modificar regras sem reescrever toda a aplicação. | Nova regra adicionada em `prolog/rules/*.pl` e fatos em `prolog/facts/symptoms.pl` passam a ser atendidos sem alterar rotas ou modelos relacionais. | Separação de fatos e regras por domínio (`hardware.pl`, `network.pl`, `performance.pl`) e desacoplamento via `prolog_service.py`. |
| **RNF04** | Modularidade | Separar interface, API, motor de inferência e persistência. | Nenhuma regra de inferência reside no frontend ou no SQL; React comunica apenas via HTTP/JSON com FastAPI, que isola PySwip e SQLAlchemy. | Arquitetura estrita em 4 camadas (`frontend/`, `backend/app/routes/`, `prolog/`, `backend/app/database/`). |
| **RNF05** | Segurança | Validar as entradas e proteger os dados dos usuários. | 100% das entradas passam por validação Pydantic + regex + whitelist; tentativas de injeção Prolog retornam HTTP `422`/`400`; RF08 exige autorização administrativa; sem coleta de senhas de terceiros. | Schemas estritos (`diagnostic.py`), parametrização/whitelist de átomos, controle de acesso para admin e ausência de campos confidenciais. |
| **RNF06** | Explicabilidade | Permitir rastrear as regras utilizadas nas conclusões. | Todo diagnóstico retornado e persistido possui ao menos um registro em `Regra_Aplicada` contendo `identificador_regra` e `justificativa`, além da `versao_base_regras`. | Assinatura padronizada das regras Prolog retornando `regra_id`, sintomas casados e justificativa textual. |
| **RNF07** | Portabilidade | Permitir execução em diferentes sistemas operacionais. | Aplicação completa executa de forma reproduzível em Windows, Linux e macOS via `docker compose up --build`. | Containerização via `docker-compose.yml` com imagens explícitas para PostgreSQL, Backend+SWI-Prolog e Frontend. |
| **RNF08** | Testabilidade | Permitir testar regras individualmente e o comportamento integrado. | Suíte `plunit` cobrindo todas as regras e casos especiais + suíte `pytest` cobrindo integração Python ↔ Prolog e Backend ↔ PostgreSQL. | Separação de testes em `prolog/tests/diagnostic_tests.pl` e `backend/tests/`. |

---

## 3. Vocabulário Controlado de Identificadores

Todos os identificadores compartilhados entre **SWI-Prolog**, **PostgreSQL**, **FastAPI** e **React** devem obedecer rigorosamente a este vocabulário controlado, evitando divergências de grafia ou risco de injeção sintática no motor lógico.

### 3.1. Convenção Léxica e Sintática
- **Formato obrigatório:** `snake_case` em ASCII minúsculo, iniciando por letra.
- **Expressão regular de validação:** `^[a-z][a-z0-9_]{1,63}$`
- **Restrições:** proibido o uso de acentos, cedilha, espaços, letras maiúsculas, hífen (`-`), aspas, parênteses, pontos ou operadores Prolog (`,`, `;`, `:-`, `.`, `|`).
- **Mapeamento entre camadas:**
  - **SWI-Prolog:** usado diretamente como átomo (ex.: `sem_imagem`, `possivel_falha_ram`, `regra_video_02`).
  - **PostgreSQL:** armazenado em `Sintoma.identificador`, `Diagnostico.identificador` e `Regra_Aplicada.identificador_regra`.
  - **API REST / React:** trafegado como string JSON exata nos payloads e respostas.

### 3.2. Categorias Padronizadas de Sintomas (`Sintoma.categoria`)

| Identificador de Categoria | Rótulo na Interface | Arquivo de Regras Associado |
| :--- | :--- | :--- |
| `inicializacao` | Inicialização e Energia | `prolog/rules/hardware.pl` |
| `video` | Vídeo e Monitor | `prolog/rules/hardware.pl` |
| `memoria_ram` | Memória RAM e Estabilidade | `prolog/rules/hardware.pl` |
| `desempenho` | Desempenho e Sistema | `prolog/rules/performance.pl` |
| `armazenamento` | Armazenamento (HD / SSD) | `prolog/rules/performance.pl` |
| `rede` | Rede, Internet e DNS | `prolog/rules/network.pl` |
| `temperatura` | Temperatura e Refrigeração | `prolog/rules/hardware.pl` |

### 3.3. Dicionário Completo de Sintomas (36 Átomos Padronizados)

> Inclui integralmente os átomos de exemplo da Seção 12 do PDF (`sem_imagem`, `monitor_desligado`, `computador_ligado`, `ventoinhas_funcionando`, `sem_internet`, `acessa_por_ip`, `nao_acessa_por_dominio`, `computador_lento`, `muita_memoria_utilizada`) e todos os átomos necessários para os 7 domínios de [knowledge_base.md](./knowledge_base.md).

| # | Identificador (Átomo Prolog) | Categoria | Descrição (`Sintoma.descricao`) | Pergunta Complementar (`RF09`) |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `computador_nao_liga` | `inicializacao` | Computador não liga ao pressionar o botão de energia | O computador falha totalmente ao tentar ligar quando você pressiona o botão de energia? |
| 2 | `computador_ligado` | `inicializacao` | Computador liga e permanece energizado | O computador liga e permanece com energia (luzes ou som de funcionamento)? |
| 3 | `sem_leds_acesos` | `inicializacao` | Nenhum LED indicador do gabinete ou placa-mãe acende | Todos os LEDs indicadores do gabinete/notebook permanecem completamente apagados? |
| 4 | `ventoinhas_paradas` | `inicializacao` | Nenhuma ventoinha interna gira ao tentar ligar | As ventoinhas internas (cooler/fonte) permanecem totalmente paradas? |
| 5 | `ventoinhas_funcionando` | `inicializacao` | Ventoinhas internas estão girando normalmente | Você percebe ou escuta as ventoinhas internas girando quando o computador é ligado? |
| 6 | `tomada_com_energia` | `inicializacao` | Tomada ou filtro de linha confirmado com energia elétrica | Você confirmou com outro aparelho que a tomada elétrica utilizada está funcionando? |
| 7 | `cabo_forca_conectado` | `inicializacao` | Cabo de força devidamente conectado nas duas extremidades | O cabo de alimentação está firmemente conectado tanto na tomada quanto no computador/fonte? |
| 8 | `mensagem_sem_dispositivo_boot` | `inicializacao` | Tela exibe mensagem de sistema operacional ou disco de boot não encontrado | A tela exibe alguma mensagem informando ausência de dispositivo de boot ou sistema operacional? |
| 9 | `sem_imagem` | `video` | Monitor não apresenta nenhuma imagem na tela | A tela permanece completamente preta ou sem imagem do sistema? |
| 10 | `exibe_imagem` | `video` | Monitor exibe imagem normalmente | O monitor chega a exibir alguma imagem (logotipo, BIOS ou mensagens de inicialização)? |
| 11 | `monitor_desligado` | `video` | Monitor está desligado ou com LED indicador apagado | O monitor está com o botão/LED indicador de energia completamente apagado? |
| 12 | `monitor_ligado` | `video` | Monitor está ligado com LED indicador aceso | O monitor está energizado (com o LED indicador aceso)? |
| 13 | `mensagem_sem_sinal_video` | `video` | Monitor exibe mensagem de "Sem sinal" ou "No signal" | O monitor exibe na tela uma mensagem de "Sem sinal" / "No signal" / "Verificar cabo"? |
| 14 | `artefatos_visuais_ou_piscando` | `video` | Tela exibe faixas coloridas, distorções gráficas ou fica piscando | A imagem apresenta faixas coloridas, pontos distorcidos, falhas gráficas ou pisca constantemente? |
| 15 | `bipes_continuos_placa_mae` | `memoria_ram` | Placa-mãe emite sequência de bipes sonoros contínuos ou erro de memória | Ao ligar o computador, ele emite uma sequência de bipes sonoros repetidos ou códigos de alerta? |
| 16 | `tela_azul_frequente` | `memoria_ram` | Sistema apresenta telas azuis (BSOD) ou erros fatais frequentes | O sistema operacional apresenta telas azuis (ou reinícios com erro fatal) com frequência? |
| 17 | `reinicializacao_aleatoria` | `memoria_ram` | Computador reinicia sozinho de forma aleatória durante o uso | O computador reinicia sozinho inesperadamente mesmo sem estar superaquecido? |
| 18 | `computador_lento` | `desempenho` | Sistema operacional responde com lentidão excessiva | O computador está demorando muito mais que o normal para responder aos comandos? |
| 19 | `muita_memoria_utilizada` | `desempenho` | Consumo de memória RAM muito elevado (próximo a 90–100%) | No monitor de recursos/gerenciador de tarefas, o uso de memória RAM está próximo do máximo? |
| 20 | `uso_cpu_elevado` | `desempenho` | Uso do processador (CPU) constantemente próximo de 100% | O uso do processador (CPU) permanece constantemente elevado ou próximo de 100%? |
| 21 | `travamentos_frequentes` | `desempenho` | Programas e interface congelam ou travam com frequência | Os programas ou a interface congelam com frequência durante o uso? |
| 22 | `pouco_espaco_disco` | `armazenamento` | Unidade principal de armazenamento com pouco espaço livre (< 15%) | O disco principal do sistema operacional está quase cheio (menos de 15% de espaço livre)? |
| 23 | `uso_disco_100_porcento` | `armazenamento` | Taxa de atividade do disco constantemente em 100% | O gerenciador de tarefas mostra o uso do disco constantemente em 100%? |
| 24 | `lentidao_abrir_arquivos` | `armazenamento` | Demora extrema ao abrir pastas, arquivos ou inicializar programas | Há demora extrema especificamente para abrir pastas, copiar arquivos ou iniciar programas? |
| 25 | `sem_internet` | `rede` | Computador sem acesso funcional à internet | Você está sem conseguir navegar ou acessar serviços na internet neste computador? |
| 26 | `desconectado_rede_local` | `rede` | Sem conexão Wi-Fi ativa ou cabo Ethernet desconectado/sem link | O ícone de rede indica que você está desconectado do Wi-Fi ou sem cabo de rede detectado? |
| 27 | `conectado_rede_local` | `rede` | Conectado à rede Wi-Fi ou via cabo Ethernet local | O computador aparece como conectado à rede Wi-Fi ou ao cabo de rede local? |
| 28 | `nao_responde_gateway` | `rede` | Não há resposta ao tentar alcançar o roteador local (gateway) | Ao testar comunicação com o roteador local (gateway padrão), ocorre falha ou tempo esgotado? |
| 29 | `responde_gateway` | `rede` | Roteador local (gateway) responde normalmente | O computador consegue se comunicar normalmente com a página/IP do roteador local? |
| 30 | `nao_acessa_por_ip` | `rede` | Não consegue alcançar endereços IP públicos externos | Mesmo conectado ao roteador, o computador falha ao tentar alcançar um endereço IP externo (ex.: `1.1.1.1`)? |
| 31 | `acessa_por_ip` | `rede` | Consegue alcançar endereços IP externos diretamente | O computador consegue alcançar ou pingar um endereço IP externo diretamente? |
| 32 | `nao_acessa_por_dominio` | `rede` | Não consegue abrir sites pelo nome de domínio (ex.: `exemplo.com`) | Ao digitar nomes de sites no navegador, as páginas falham ao carregar? |
| 33 | `desligamento_subito` | `temperatura` | Computador desliga repentinamente sem aviso prévio | O computador desliga subitamente por completo durante o uso (especialmente sob tarefas pesadas)? |
| 34 | `gabinete_muito_quente` | `temperatura` | Gabinete ou saída de ar extremamente quente ao toque | O gabinete ou as saídas de ar do notebook estão anormalmente quentes ao toque? |
| 35 | `ventoinhas_alta_rotacao` | `temperatura` | Ventoinhas operam em rotação máxima constante com ruído de vento | As ventoinhas permanecem girando na velocidade máxima de forma contínua? |
| 36 | `ventoinha_parada_ou_ruido_anormal` | `temperatura` | Cooler parado com o PC ligado ou emitindo ruído mecânico anormal | Alguma ventoinha está completamente parada com o PC ligado ou fazendo barulho mecânico de atrito? |

### 3.4. Dicionário Completo de Causas / Hipóteses Diagnósticas (19 Átomos)

| # | Identificador (`Diagnostico.identificador`) | Descrição Resumida (`Diagnostico.descricao`) | Domínio | Arquivo Prolog |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `falha_alimentacao_eletrica` | Possível falha na alimentação elétrica externa (cabo, tomada ou chave da fonte) | `inicializacao` | `hardware.pl` |
| 2 | `possivel_falha_fonte_ou_placa_mae` | Possível defeito na fonte de alimentação (PSU), botão power ou placa-mãe | `inicializacao` | `hardware.pl` |
| 3 | `falha_dispositivo_boot` | Possível falha de reconhecimento do disco de boot ou corrupção de inicialização | `inicializacao` | `hardware.pl` |
| 4 | `problema_monitor` | Possível problema na alimentação elétrica ou estado do monitor | `video` | `hardware.pl` |
| 5 | `possivel_falha_ram` | Possível falha ou mau contato nos módulos de memória RAM impedindo vídeo | `video` | `hardware.pl` |
| 6 | `falha_cabo_ou_entrada_video` | Possível problema no cabo de vídeo, porta utilizada ou seleção de entrada do monitor | `video` | `hardware.pl` |
| 7 | `possivel_falha_placa_video` | Possível instabilidade no subsistema gráfico (GPU, driver ou cabo de vídeo) | `video` | `hardware.pl` |
| 8 | `falha_contato_ou_modulo_ram` | Possível mau contato ou defeito físico em módulo/slot de memória RAM indicado no POST | `memoria_ram` | `hardware.pl` |
| 9 | `instabilidade_memoria_ram` | Possível instabilidade intermitente ou erro de endereçamento na memória RAM | `memoria_ram` | `hardware.pl` |
| 10 | `uso_excessivo_memoria` | Uso excessivo de memória RAM por processos causando paginação intensa | `desempenho` | `performance.pl` |
| 11 | `uso_excessivo_cpu` | Saturação contínua do processador (CPU) por processos ou restrição térmica | `desempenho` | `performance.pl` |
| 12 | `armazenamento_quase_cheio` | Espaço livre insuficiente na unidade principal degradando o desempenho do sistema | `armazenamento` | `performance.pl` |
| 13 | `degradacao_ou_falha_disco` | Possível gargalo severo ou degradação física na unidade de armazenamento (HD/SSD) | `armazenamento` | `performance.pl` |
| 14 | `falha_conexao_local_wifi_ou_cabo` | Ausência de enlace físico ou lógico com a rede local (Wi-Fi ou cabo Ethernet) | `rede` | `network.pl` |
| 15 | `falha_roteador_ou_gateway` | Possível travamento ou falha de resposta do roteador local / gateway DHCP | `rede` | `network.pl` |
| 16 | `indisponibilidade_provedor_isp` | Possível indisponibilidade externa no provedor de internet (WAN/ISP) | `rede` | `network.pl` |
| 17 | `possivel_falha_dns` | Possível falha na resolução de nomes DNS apesar de haver conectividade IP | `rede` | `network.pl` |
| 18 | `superaquecimento_cpu_gpu` | Possível superaquecimento de CPU/GPU acionando proteção térmica de desligamento | `temperatura` | `hardware.pl` |
| 19 | `falha_sistema_refrigeracao` | Possível obstrução ou falha mecânica no sistema de refrigeração (cooler/ventoinha) | `temperatura` | `hardware.pl` |

### 3.5. Dicionário Completo de Regras (`Regra_Aplicada.identificador_regra`)

| ID da Regra (`regra_id`) | Causa Associada | Sintomas Exigidos (Premissas) | Arquivo Prolog |
| :--- | :--- | :--- | :--- |
| `regra_init_01` | `falha_alimentacao_eletrica` | `computador_nao_liga`, `sem_leds_acesos`, `ventoinhas_paradas` | `hardware.pl` |
| `regra_init_02` | `possivel_falha_fonte_ou_placa_mae` | `computador_nao_liga`, `tomada_com_energia`, `cabo_forca_conectado`, `sem_leds_acesos` | `hardware.pl` |
| `regra_init_03` | `falha_dispositivo_boot` | `computador_ligado`, `exibe_imagem`, `mensagem_sem_dispositivo_boot` | `hardware.pl` |
| `regra_video_01` | `problema_monitor` | `sem_imagem`, `monitor_desligado` | `hardware.pl` |
| `regra_video_02` | `possivel_falha_ram` | `sem_imagem`, `computador_ligado`, `ventoinhas_funcionando` | `hardware.pl` |
| `regra_video_03` | `falha_cabo_ou_entrada_video` | `sem_imagem`, `computador_ligado`, `monitor_ligado`, `mensagem_sem_sinal_video` | `hardware.pl` |
| `regra_video_04` | `possivel_falha_placa_video` | `computador_ligado`, `monitor_ligado`, `artefatos_visuais_ou_piscando` | `hardware.pl` |
| `regra_ram_01` | `falha_contato_ou_modulo_ram` | `computador_ligado`, `sem_imagem`, `bipes_continuos_placa_mae` | `hardware.pl` |
| `regra_ram_02` | `instabilidade_memoria_ram` | `computador_ligado`, `tela_azul_frequente`, `reinicializacao_aleatoria` | `hardware.pl` |
| `regra_perf_01` | `uso_excessivo_memoria` | `computador_lento`, `muita_memoria_utilizada` | `performance.pl` |
| `regra_perf_02` | `uso_excessivo_cpu` | `computador_lento`, `uso_cpu_elevado`, `travamentos_frequentes` | `performance.pl` |
| `regra_perf_03` | `armazenamento_quase_cheio` | `computador_lento`, `pouco_espaco_disco` | `performance.pl` |
| `regra_perf_04` | `degradacao_ou_falha_disco` | `computador_lento`, `uso_disco_100_porcento`, `lentidao_abrir_arquivos` | `performance.pl` |
| `regra_rede_01` | `falha_conexao_local_wifi_ou_cabo` | `sem_internet`, `desconectado_rede_local` | `network.pl` |
| `regra_rede_02` | `falha_roteador_ou_gateway` | `sem_internet`, `conectado_rede_local`, `nao_responde_gateway` | `network.pl` |
| `regra_rede_03` | `indisponibilidade_provedor_isp` | `sem_internet`, `conectado_rede_local`, `responde_gateway`, `nao_acessa_por_ip` | `network.pl` |
| `regra_dns_01` | `possivel_falha_dns` | `sem_internet`, `acessa_por_ip`, `nao_acessa_por_dominio` | `network.pl` |
| `regra_temp_01` | `superaquecimento_cpu_gpu` | `desligamento_subito`, `gabinete_muito_quente`, `ventoinhas_alta_rotacao` | `hardware.pl` |
| `regra_temp_02` | `falha_sistema_refrigeracao` | `computador_ligado`, `gabinete_muito_quente`, `ventoinha_parada_ou_ruido_anormal` | `hardware.pl` |

### 3.6. Estados Padronizados de Consulta (`Consulta.status`)

| Status | Significado | Transições Permitidas |
| :--- | :--- | :--- |
| `aberta` | Consulta recém-criada (`POST /api/consultas`), ainda sem sintomas registrados. | → `em_investigacao`, `encerrada` |
| `em_investigacao` | Sintomas registrados ou aguardando respostas complementares (`RF02`, `RF09`). | → `diagnosticada`, `inconclusiva`, `encerrada` |
| `diagnosticada` | Pelo menos uma hipótese técnica válida foi gerada e persistida (`RF03`, `RF06`). | → `em_investigacao` (novos sintomas), `encerrada` |
| `inconclusiva` | Sintomas insuficientes ou contraditórios impediram conclusão segura (`RF09`, Seção 17). | → `em_investigacao` (sintomas complementares/corrigidos), `encerrada` |
| `encerrada` | Investigação finalizada explicitamente pelo usuário (`RF10`). Estado terminal. | *(nenhuma)* |

---

## 4. Tratamento de Evidências Contraditórias, Insuficientes e Consulta Complementar (`RF09`)

### 4.1. Regra de Detecção de Evidências Contraditórias (Seção 12)
Antes de aceitar as hipóteses inferidas, o motor Prolog (`knowledge_base.pl`) e a camada de validação verificam se há presença simultânea de pares mutuamente exclusivos declarados em `prolog/facts/symptoms.pl`:

1. `computador_ligado` × `computador_nao_liga`
2. `sem_imagem` × `exibe_imagem`
3. `monitor_ligado` × `monitor_desligado`
4. `ventoinhas_funcionando` × `ventoinhas_paradas`
5. `conectado_rede_local` × `desconectado_rede_local`
6. `acessa_por_ip` × `nao_acessa_por_ip`
7. `responde_gateway` × `nao_responde_gateway`

- **Comportamento exigido:** quando detectada qualquer contradição, a resposta deve informar os pares conflitantes no campo `contradicoes[]`, classificar a consulta como `inconclusiva` (não persistindo diagnósticos espúrios) e orientar o usuário a corrigir os sintomas informados.

### 4.2. Regra de Sintomas Insuficientes e Seleção de Perguntas Complementares (`RF09`)
Quando **nenhuma** regra completa é satisfeita pelos sintomas informados (ou quando o conjunto de sintomas possui interseção parcial com regras existentes):

1. O motor não deve "chutar" ou retornar a primeira regra por fallback.
2. O backend marca a consulta como `inconclusiva` (ou mantém `em_investigacao`), preenche a mensagem orientando que **não há evidências suficientes para produzir uma conclusão** (Seção 17) e calcula o conjunto de **sintomas complementares** (`sintomas_complementares[]`):
   - Para cada regra que compartilha pelo menos 1 sintoma com a entrada atual e não possui premissa contraditória com o que já foi informado, extraem-se os sintomas faltantes dessa regra.
   - Cada sintoma faltante é retornado com `identificador` e `pergunta` (definida na coluna *Pergunta Complementar* da Seção 3.3), sem repetir sintomas já informados nem sugerir sintomas contraditórios.
3. No frontend, o usuário responde às perguntas selecionando os sintomas confirmados, que são adicionados à consulta (`POST /api/consultas/{id}/sintomas`) antes de reexecutar `POST /api/consultas/{id}/diagnosticar`.

---

## 5. Diretrizes de Segurança, Validação e Limitações (Seção 17 e `RNF05`)

As regras abaixo são requisitos obrigatórios de aceitação para todas as fases de implementação:

1. **Bloqueio de execução arbitrária no Prolog (Anti-Injeção):**
   - Toda lista de sintomas recebida na API é validada por schema Pydantic (`^[a-z][a-z0-9_]{1,63}$`) e filtrada contra a whitelist oficial de átomos carregada de `symptoms.pl` / tabela `Sintoma`.
   - O backend nunca constrói strings de query Prolog concatenando texto livre de usuário.
2. **Privacidade e não coleta de dados confidenciais:**
   - Nenhuma tela, endpoint ou pergunta complementar pode solicitar senhas (Wi-Fi, sistema operacional, contas de e-mail, roteador), tokens, chaves ou dados pessoais sensíveis além de `nome` e `email` cadastrais previstos no modelo de dados (Seção 13).
3. **Caráter orientativo das conclusões (Hipóteses Técnicas):**
   - A API e a interface devem rotular explicitamente todos os resultados como **hipóteses técnicas possíveis**, nunca como diagnóstico definitivo ou garantia de defeito físico.
4. **Segurança física nas recomendações e alerta técnico:**
   - Recomendações destrutivas ou invasivas (abrir fonte chaveada, formatar disco sem backup, alterar tensões) são proibidas na base de conhecimento.
   - Toda recomendação que envolva abertura do equipamento, manipulação de hardware interno (RAM, placa de vídeo, cooler, cabos internos) ou alteração avançada de BIOS/rede carrega o atributo `requer_conhecimento_tecnico = true`, exibindo alerta visual obrigatório na interface.
5. **Versionamento e auditabilidade:**
   - A versão vigente da base (`versao_base_regras`, iniciando em `1.0.0`) deve ser retornada pelo motor Prolog e gravada em toda consulta diagnosticada no PostgreSQL.
6. **Controle de acesso ao gerenciamento da base (`RF08`):**
   - Apenas administradores autorizados podem alterar registros de conhecimento ou acionar recarga de base; usuários comuns têm acesso apenas às suas consultas e ao catálogo público de sintomas/diagnósticos.
