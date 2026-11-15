:- encoding(utf8).

% ==============================================================================
% TechExpert — Regras de Diagnóstico de Rede e Internet (v1.0.0)
% ==============================================================================
% Domínios contemplados:
% - Conexão com a internet e rede local (regra_rede_01..03)
% - Resolução de nomes DNS (regra_dns_01)

:- multifile
    premissas_regra/3,
    regra_diagnostico/6,
    diagnostico/3.

:- discontiguous
    premissas_regra/3,
    regra_diagnostico/6,
    diagnostico/3.

% ------------------------------------------------------------------------------
% Domínio 5: Problemas de Conexão com a Internet
% ------------------------------------------------------------------------------

premissas_regra(
    regra_rede_01,
    falha_conexao_local_wifi_ou_cabo,
    [sem_internet, desconectado_rede_local]
).

regra_diagnostico(
    regra_rede_01,
    falha_conexao_local_wifi_ou_cabo,
    SintomasInformados,
    [sem_internet, desconectado_rede_local],
    "Verifique o Modo Avião, o adaptador Wi-Fi ou o encaixe físico do cabo Ethernet",
    "O equipamento não possui enlace ativo com a rede local (Wi-Fi desligado/desconectado ou cabo Ethernet sem link), impossibilitando qualquer comunicação externa."
) :-
    member(sem_internet, SintomasInformados),
    member(desconectado_rede_local, SintomasInformados).

premissas_regra(
    regra_rede_02,
    falha_roteador_ou_gateway,
    [sem_internet, conectado_rede_local, nao_responde_gateway]
).

regra_diagnostico(
    regra_rede_02,
    falha_roteador_ou_gateway,
    SintomasInformados,
    [sem_internet, conectado_rede_local, nao_responde_gateway],
    "Reinicie o modem/roteador por 30 segundos, verifique os LEDs e renove o endereço IP (DHCP)",
    "Apesar de o enlace local parecer ativo, não há resposta do gateway padrão (roteador), indicando travamento do roteador, falha de atribuição IP (DHCP) ou conflito local."
) :-
    member(sem_internet, SintomasInformados),
    member(conectado_rede_local, SintomasInformados),
    member(nao_responde_gateway, SintomasInformados).

premissas_regra(
    regra_rede_03,
    indisponibilidade_provedor_isp,
    [sem_internet, conectado_rede_local, responde_gateway, nao_acessa_por_ip]
).

regra_diagnostico(
    regra_rede_03,
    indisponibilidade_provedor_isp,
    SintomasInformados,
    [sem_internet, conectado_rede_local, responde_gateway, nao_acessa_por_ip],
    "Verifique os LEDs do modem/ONU, a conexão da porta WAN e consulte o provedor de internet (ISP)",
    "A rede local e o roteador estão respondendo, mas o tráfego não alcança IPs públicos externos, apontando falha no enlace WAN, autenticação do provedor ou manutenção da operadora."
) :-
    member(sem_internet, SintomasInformados),
    member(conectado_rede_local, SintomasInformados),
    member(responde_gateway, SintomasInformados),
    member(nao_acessa_por_ip, SintomasInformados).

% ------------------------------------------------------------------------------
% Domínio 6: Problemas Relacionados ao DNS
% ------------------------------------------------------------------------------

premissas_regra(
    regra_dns_01,
    possivel_falha_dns,
    [sem_internet, acessa_por_ip, nao_acessa_por_dominio]
).

regra_diagnostico(
    regra_dns_01,
    possivel_falha_dns,
    SintomasInformados,
    [sem_internet, acessa_por_ip, nao_acessa_por_dominio],
    "Verifique as configuracoes de DNS",
    "A conectividade IP externa funciona normalmente, mas a tradução de nomes de domínio para endereços IP falha, caracterizando erro na resolução DNS local ou do servidor DNS configurado."
) :-
    member(sem_internet, SintomasInformados),
    member(acessa_por_ip, SintomasInformados),
    member(nao_acessa_por_dominio, SintomasInformados).
