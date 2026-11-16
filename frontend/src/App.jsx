import { useCallback, useEffect, useState } from "react";
import {
  ActivityIcon,
  AlertTriangleIcon,
  CpuIcon,
  DatabaseIcon,
  HistoryIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
} from "./components/Icons.jsx";
import InvestigationPage from "./pages/InvestigationPage.jsx";
import {
  listarDiagnosticosESintomas,
  verificarSaude,
} from "./services/api.js";

const TABS = [
  { id: "nova", label: "Nova Investigação", icon: StethoscopeIcon },
  { id: "historico", label: "Histórico", icon: HistoryIcon },
  { id: "admin", label: "Administração", icon: ShieldCheckIcon },
];

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

  const renderStatusPills = () => {
    if (loadingBootstrap) {
      return <span className="pill pill-neutral">Verificando serviços...</span>;
    }
    if (!health) {
      return (
        <span className="pill pill-danger">
          <AlertTriangleIcon size={14} /> API offline
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
          <ActivityIcon size={14} />
          API: {health.status === "ok" ? "Operacional" : "Degradada"}
        </span>
        <span
          className={`pill ${
            health.database === "connected" ? "pill-success" : "pill-warning"
          }`}
        >
          <DatabaseIcon size={14} />
          PostgreSQL: {health.database === "connected" ? "Conectado" : "Desconectado"}
        </span>
        <span
          className={`pill ${
            health.prolog_kb === "found" ? "pill-success" : "pill-danger"
          }`}
        >
          <CpuIcon size={14} />
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
              <CpuIcon size={22} />
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
            <RefreshCwIcon size={15} />
            Atualizar conexão
          </button>
        </div>
      </div>

      <main className="main-content">
        <div className="banner banner-info">
          <ShieldCheckIcon size={18} />
          <div>
            <strong>Orientação técnica e privacidade:</strong> o TechExpert
            apresenta <em>hipóteses técnicas possíveis</em> com suas respectivas
            regras explicáveis. Nunca informe senhas ou dados confidenciais.
          </div>
        </div>

        {bootstrapError && (
          <div className="banner banner-warning" role="alert">
            <AlertTriangleIcon size={18} />
            <div>
              <strong>Conexão com o catálogo pendente:</strong> {bootstrapError}
            </div>
          </div>
        )}

        {activeTab === "nova" && <InvestigationPage catalog={catalog} />}

        {activeTab === "historico" && (
          <section className="card">
            <h2 className="card-title">
              <HistoryIcon size={20} />
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
              <ShieldCheckIcon size={20} />
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
