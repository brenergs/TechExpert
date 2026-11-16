import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Cpu,
  Database,
  History,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import {
  listarDiagnosticosESintomas,
  verificarSaude,
} from "./services/api.js";

const TABS = [
  { id: "nova", label: "Nova Investigação", icon: Stethoscope },
  { id: "historico", label: "Histórico", icon: History },
  { id: "admin", label: "Administração", icon: ShieldCheck },
];

const CATEGORY_LABELS = {
  inicializacao: "Inicialização e Energia",
  video: "Vídeo e Monitor",
  memoria_ram: "Memória RAM e Estabilidade",
  desempenho: "Desempenho e Sistema",
  armazenamento: "Armazenamento (HD / SSD)",
  rede: "Rede, Internet e DNS",
  temperatura: "Temperatura e Refrigeração",
};

export default function App() {
  const [activeTab, setActiveTab] = useState("nova");
  const [health, setHealth] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [bootstrapError, setBootstrapError] = useState("");

  const carregarStatusECatalogo = useCallback(async () => {
    setLoadingBootstrap(true);
    setBootstrapError("");

    const [healthResult, catalogResult] = await Promise.allSettled([
      verificarSaude(),
      listarDiagnosticosESintomas(),
    ]);

    if (healthResult.status === "fulfilled") {
      setHealth(healthResult.value);
    } else {
      setHealth(null);
    }

    if (catalogResult.status === "fulfilled") {
      setCatalog(catalogResult.value);
    } else {
      setCatalog(null);
      setBootstrapError(
        catalogResult.reason?.message ||
          "Não foi possível carregar o catálogo de sintomas e diagnósticos."
      );
    }

    setLoadingBootstrap(false);
  }, []);

  useEffect(() => {
    carregarStatusECatalogo();
  }, [carregarStatusECatalogo]);

  const categoriasAgrupadas = useMemo(() => {
    if (!catalog?.sintomas) return [];
    const counts = new Map();
    for (const item of catalog.sintomas) {
      counts.set(item.categoria, (counts.get(item.categoria) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([categoria, quantidade]) => ({
      categoria,
      rotulo: CATEGORY_LABELS[categoria] || categoria,
      quantidade,
    }));
  }, [catalog]);

  const renderStatusPills = () => {
    if (loadingBootstrap) {
      return <span className="pill pill-neutral">Verificando serviços...</span>;
    }
    if (!health) {
      return (
        <span className="pill pill-danger">
          <AlertTriangle size={14} /> API offline
        </span>
      );
    }
    return (
      <>
        <span
          className={`pill ${
            health.status === "ok" ? "pill-success" : "pill-warning"
          }`}
        >
          <Activity size={14} />
          API: {health.status === "ok" ? "Operacional" : "Degradada"}
        </span>
        <span
          className={`pill ${
            health.database === "connected" ? "pill-success" : "pill-warning"
          }`}
        >
          <Database size={14} />
          PostgreSQL: {health.database === "connected" ? "Conectado" : "Desconectado"}
        </span>
        <span
          className={`pill ${
            health.prolog_kb === "found" ? "pill-success" : "pill-danger"
          }`}
        >
          <Cpu size={14} />
          Motor Prolog:{" "}
          {health.versao_regras ? `v${health.versao_regras}` : health.prolog_kb}
        </span>
      </>
    );
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <div className="brand-icon" aria-hidden="true">
              <Cpu size={22} />
            </div>
            <div>
              <h1 className="brand-title">TechExpert</h1>
              <p className="brand-subtitle">
                Sistema Especialista para Diagnóstico de Problemas Computacionais
              </p>
            </div>
          </div>

          <nav className="nav-tabs" aria-label="Navegação principal">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`nav-tab ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="status-bar">
        <div className="status-bar-inner">
          <div className="status-pills">{renderStatusPills()}</div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={carregarStatusECatalogo}
            disabled={loadingBootstrap}
          >
            <RefreshCw size={15} />
            Atualizar conexão
          </button>
        </div>
      </div>

      <main className="main-content">
        <div className="banner banner-info">
          <ShieldCheck size={18} />
          <div>
            <strong>Orientação técnica e privacidade:</strong> o TechExpert
            apresenta <em>hipóteses técnicas possíveis</em> com suas respectivas
            regras explicáveis. Nunca informe senhas ou dados confidenciais.
          </div>
        </div>

        {bootstrapError && (
          <div className="banner banner-warning" role="alert">
            <AlertTriangle size={18} />
            <div>
              <strong>Conexão com o catálogo pendente:</strong> {bootstrapError}
            </div>
          </div>
        )}

        {activeTab === "nova" && (
          <section className="card">
            <h2 className="card-title">
              <Stethoscope size={20} />
              Base de Conhecimento Carregada
            </h2>
            <p className="card-subtitle">
              {catalog
                ? `Catálogo pronto com ${catalog.total_sintomas} sintomas e ${catalog.total_diagnosticos} hipóteses diagnósticas (versão ${catalog.versao_regras}).`
                : "Inicie o backend FastAPI para carregar os sintomas categorizados e iniciar investigações."}
            </p>

            {categoriasAgrupadas.length > 0 && (
              <div className="grid-cards">
                {categoriasAgrupadas.map((item) => (
                  <div key={item.categoria} className="category-tile">
                    <div className="category-tile-header">
                      <span>{item.rotulo}</span>
                      <span className="pill pill-neutral">{item.quantidade}</span>
                    </div>
                    <small className="card-subtitle">
                      Categoria: <code>{item.categoria}</code>
                    </small>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "historico" && (
          <section className="card">
            <h2 className="card-title">
              <History size={20} />
              Histórico de Consultas
            </h2>
            <p className="card-subtitle">
              A visualização detalhada e o encerramento de consultas do histórico
              serão integrados nesta aba no Passo 4.4.
            </p>
          </section>
        )}

        {activeTab === "admin" && (
          <section className="card">
            <h2 className="card-title">
              <ShieldCheck size={20} />
              Administração da Base de Conhecimento (RF08)
            </h2>
            <p className="card-subtitle">
              O painel administrativo protegido para gerenciamento e recarga da
              base será integrado nesta aba no Passo 4.4.
            </p>
          </section>
        )}
      </main>

      <footer className="app-footer">
        TechExpert v1.0 — Inteligência Artificial Simbólica com SWI-Prolog, FastAPI,
        PostgreSQL e React
      </footer>
    </div>
  );
}
