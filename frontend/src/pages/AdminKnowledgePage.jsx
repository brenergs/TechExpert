import { useState } from "react";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
} from "../components/Icons.jsx";
import {
  atualizarSintomaAdmin,
  obterConhecimentoAdmin,
  recarregarConhecimentoAdmin,
} from "../services/api.js";
import { validateAdminSymptomPayload } from "../utils/investigationHelpers.js";

export default function AdminKnowledgePage({ onCatalogUpdated }) {
  const [adminKey, setAdminKey] = useState("");
  const [adminUserId, setAdminUserId] = useState("");
  const [adminInfo, setAdminInfo] = useState(null);
  const [loadingAction, setLoadingAction] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [identificador, setIdentificador] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("video");
  const [recarregarMotor, setRecarregarMotor] = useState(true);

  const isBusy = Boolean(loadingAction);

  const handleLoadKnowledge = async (event) => {
    event?.preventDefault();
    if (!adminKey.trim()) {
      setErrorMessage("Informe a chave administrativa (X-Admin-Key) para autenticar.");
      return;
    }

    setLoadingAction("load");
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const data = await obterConhecimentoAdmin(
        adminKey.trim(),
        adminUserId.trim() || null
      );
      setAdminInfo(data);
      setSuccessMessage("Base de conhecimento carregada com autorização administrativa.");
    } catch (err) {
      setAdminInfo(null);
      setErrorMessage(err.message || "Falha ao autenticar acesso administrativo.");
    } finally {
      setLoadingAction("");
    }
  };

  const handleReloadEngine = async () => {
    if (!adminKey.trim()) return;
    setLoadingAction("reload");
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const res = await recarregarConhecimentoAdmin(
        adminKey.trim(),
        adminUserId.trim() || null
      );
      const refreshed = await obterConhecimentoAdmin(
        adminKey.trim(),
        adminUserId.trim() || null
      );
      setAdminInfo(refreshed);
      await onCatalogUpdated?.();
      setSuccessMessage(
        `Motor recarregado (v${res.versao_regras}) e ${res.sintomas_sincronizados_banco} sintomas sincronizados no banco.`
      );
    } catch (err) {
      setErrorMessage(err.message || "Falha ao recarregar o motor Prolog.");
    } finally {
      setLoadingAction("");
    }
  };

  const handleUpdateSymptom = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const check = validateAdminSymptomPayload({
      identificador,
      descricao,
      categoria,
    });
    if (!check.valid) {
      setErrorMessage(check.errors.join(" "));
      return;
    }

    setLoadingAction("save");
    try {
      const res = await atualizarSintomaAdmin(
        {
          ...check.cleaned,
          recarregar_motor: recarregarMotor,
        },
        adminKey.trim(),
        adminUserId.trim() || null
      );
      const refreshed = await obterConhecimentoAdmin(
        adminKey.trim(),
        adminUserId.trim() || null
      );
      setAdminInfo(refreshed);
      await onCatalogUpdated?.();
      setSuccessMessage(
        `Sintoma '${res.sintoma.identificador}' ${res.acao} com sucesso.`
      );
    } catch (err) {
      setErrorMessage(err.message || "Falha ao salvar sintoma administrativo.");
    } finally {
      setLoadingAction("");
    }
  };

  const handleFillFromSymptom = (sintoma) => {
    setIdentificador(sintoma.identificador);
    setDescricao(sintoma.descricao);
    setCategoria(sintoma.categoria);
    setErrorMessage("");
    setSuccessMessage("");
  };

  return (
    <div className="page-stack">
      <section className="card" aria-label="Autenticação administrativa">
        <h2 className="card-title">
          <ShieldCheckIcon size={20} />
          Gerenciamento da Base de Conhecimento (RF08)
        </h2>
        <p className="card-subtitle">
          Área restrita a administradores autorizados para inspecionar a
          sincronização entre Prolog e PostgreSQL, atualizar metadados e recarregar o motor.
        </p>

        <form onSubmit={handleLoadKnowledge} className="admin-auth-grid">
          <div className="form-field">
            <label htmlFor="admin-key-input" className="field-label">
              Chave Administrativa (X-Admin-Key)
            </label>
            <input
              id="admin-key-input"
              type="password"
              className="text-input"
              placeholder="Informe a ADMIN_API_KEY configurada no backend"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              disabled={isBusy}
            />
          </div>

          <div className="form-field">
            <label htmlFor="admin-user-input" className="field-label">
              ID de Usuário Admin (opcional)
            </label>
            <input
              id="admin-user-input"
              type="number"
              min="1"
              className="text-input"
              placeholder="Ex.: 2"
              value={adminUserId}
              onChange={(e) => setAdminUserId(e.target.value)}
              disabled={isBusy}
            />
          </div>

          <div className="form-actions" style={{ alignSelf: "end" }}>
            <button type="submit" className="btn btn-primary" disabled={isBusy}>
              <ShieldCheckIcon size={16} />
              {loadingAction === "load" ? "Validando..." : "Autenticar e Carregar"}
            </button>
          </div>
        </form>

        {errorMessage && (
          <div className="banner banner-danger" style={{ marginTop: 14 }} role="alert">
            <AlertTriangleIcon size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="banner banner-info" style={{ marginTop: 14 }} role="status">
            <CheckCircleIcon size={18} />
            <span>{successMessage}</span>
          </div>
        )}
      </section>

      {adminInfo && (
        <>
          <section className="card" aria-label="Resumo da base administrativa">
            <div className="section-header-row">
              <div>
                <h3 className="card-title">Estado Atual da Base</h3>
                <p className="card-subtitle">
                  Motor Prolog em modo <code>{adminInfo.prolog_backend_mode}</code>
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReloadEngine}
                disabled={isBusy}
              >
                <RefreshCwIcon size={15} />
                {loadingAction === "reload"
                  ? "Recarregando..."
                  : "Recarregar Motor e Sincronizar"}
              </button>
            </div>

            <div className="grid-cards">
              <div className="category-tile">
                <span className="card-subtitle">Versão das Regras</span>
                <div className="metric-value">v{adminInfo.versao_regras}</div>
              </div>
              <div className="category-tile">
                <span className="card-subtitle">Sintomas (Prolog / Banco)</span>
                <div className="metric-value">
                  {adminInfo.total_sintomas_prolog} / {adminInfo.total_sintomas_banco}
                </div>
              </div>
              <div className="category-tile">
                <span className="card-subtitle">Diagnósticos Mapeados</span>
                <div className="metric-value">{adminInfo.total_diagnosticos}</div>
              </div>
            </div>
          </section>

          <section className="card" aria-label="Atualizar metadados de sintoma">
            <h3 className="card-title">Cadastrar ou Atualizar Sintoma no Catálogo</h3>
            <form onSubmit={handleUpdateSymptom} className="form-stack" style={{ marginTop: 12 }}>
              <div className="admin-auth-grid">
                <div className="form-field">
                  <label htmlFor="sintoma-ident" className="field-label">
                    Identificador (snake_case ASCII)
                  </label>
                  <input
                    id="sintoma-ident"
                    type="text"
                    className="text-input"
                    placeholder="Ex.: sem_imagem"
                    value={identificador}
                    onChange={(e) => setIdentificador(e.target.value)}
                    disabled={isBusy}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="sintoma-cat" className="field-label">
                    Categoria
                  </label>
                  <input
                    id="sintoma-cat"
                    type="text"
                    className="text-input"
                    placeholder="Ex.: video"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    disabled={isBusy}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="sintoma-desc" className="field-label">
                  Descrição exibida ao usuário
                </label>
                <input
                  id="sintoma-desc"
                  type="text"
                  className="text-input"
                  placeholder="Descrição clara do sintoma"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  disabled={isBusy}
                />
              </div>

              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={recarregarMotor}
                  onChange={(e) => setRecarregarMotor(e.target.checked)}
                  disabled={isBusy}
                />
                <span>Recarregar motor Prolog após salvar</span>
              </label>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={isBusy}>
                  <CheckCircleIcon size={16} />
                  {loadingAction === "save" ? "Salvando..." : "Salvar Alteração"}
                </button>
              </div>
            </form>

            <div style={{ marginTop: 18 }}>
              <span className="evidence-label">
                Preenchimento rápido a partir do catálogo ({adminInfo.sintomas?.length || 0} itens):
              </span>
              <div className="evidence-chips" style={{ marginTop: 8 }}>
                {(adminInfo.sintomas || []).map((sint) => (
                  <button
                    key={sint.identificador}
                    type="button"
                    className="chip-selected"
                    onClick={() => handleFillFromSymptom(sint)}
                    title={sint.descricao}
                  >
                    <code>{sint.identificador}</code>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

