import { useCallback, useEffect, useState } from "react";
import DiagnosisResultsPanel from "../components/DiagnosisResultsPanel.jsx";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  HistoryIcon,
  RefreshCwIcon,
} from "../components/Icons.jsx";
import {
  buscarConsulta,
  encerrarConsulta,
  listarHistorico,
} from "../services/api.js";
import {
  formatConsultationStatus,
  formatDateTimePtBr,
} from "../utils/investigationHelpers.js";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "aberta", label: "Aberta" },
  { value: "em_investigacao", label: "Em investigação" },
  { value: "diagnosticada", label: "Diagnosticada" },
  { value: "inconclusiva", label: "Inconclusiva" },
  { value: "encerrada", label: "Encerrada" },
];

export default function HistoryPage({ catalog }) {
  const [consultas, setConsultas] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [closingId, setClosingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const carregarHistorico = useCallback(async () => {
    setLoadingList(true);
    setErrorMessage("");
    try {
      const list = await listarHistorico({ status: statusFilter, limit: 50 });
      setConsultas(Array.isArray(list) ? list : []);
    } catch (err) {
      setErrorMessage(err.message || "Não foi possível carregar o histórico.");
    } finally {
      setLoadingList(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

  const handleSelectConsultation = async (consultaId) => {
    setLoadingDetail(true);
    setErrorMessage("");
    try {
      const detail = await buscarConsulta(consultaId);
      setSelectedDetail(detail);
    } catch (err) {
      setErrorMessage(err.message || "Não foi possível carregar os detalhes da consulta.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseConsultation = async (consultaId) => {
    setClosingId(consultaId);
    setErrorMessage("");
    try {
      const updated = await encerrarConsulta(consultaId);
      setConsultas((prev) =>
        prev.map((item) => (item.id === consultaId ? updated : item))
      );
      if (selectedDetail?.id === consultaId) {
        setSelectedDetail((prev) =>
          prev ? { ...prev, status: updated.status } : prev
        );
      }
    } catch (err) {
      setErrorMessage(err.message || "Falha ao encerrar consulta.");
    } finally {
      setClosingId(null);
    }
  };

  const detailAsDiagnosisResult =
    selectedDetail &&
    (selectedDetail.diagnosticos?.length > 0 ||
      selectedDetail.status === "inconclusiva")
      ? {
          consulta_id: selectedDetail.id,
          status: selectedDetail.status,
          versao_regras: selectedDetail.versao_regras,
          aviso_hipotese:
            selectedDetail.diagnosticos?.length > 0
              ? "Hipóteses técnicas registradas no histórico desta investigação."
              : "Consulta registrada sem conclusões suficientes.",
          diagnosticos: selectedDetail.diagnosticos || [],
          sintomas_complementares: [],
          contradicoes: [],
        }
      : null;

  return (
    <div className="page-stack">
      <section className="card" aria-label="Histórico de consultas">
        <div className="section-header-row">
          <div>
            <h2 className="card-title">
              <HistoryIcon size={20} />
              Histórico de Consultas (RF07)
            </h2>
            <p className="card-subtitle">
              Acompanhe investigações realizadas, revise justificativas registradas
              e finalize consultas em aberto.
            </p>
          </div>

          <div className="form-actions">
            <select
              className="select-input"
              aria-label="Filtrar histórico por status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: "auto", minWidth: 190 }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={carregarHistorico}
              disabled={loadingList}
            >
              <RefreshCwIcon size={15} />
              Atualizar
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="banner banner-danger" style={{ marginTop: 14 }} role="alert">
            <AlertTriangleIcon size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {loadingList ? (
          <p className="card-subtitle" style={{ marginTop: 16 }}>
            Carregando histórico de consultas...
          </p>
        ) : consultas.length === 0 ? (
          <p className="card-subtitle" style={{ marginTop: 16 }}>
            Nenhuma consulta encontrada para o filtro selecionado.
          </p>
        ) : (
          <div className="history-list">
            {consultas.map((item) => {
              const badge = formatConsultationStatus(item.status);
              const isSelected = selectedDetail?.id === item.id;
              return (
                <div
                  key={item.id}
                  className={`history-item ${isSelected ? "selected" : ""}`}
                >
                  <div className="history-item-main">
                    <div className="consultation-meta-row">
                      <strong>Consulta #{item.id}</strong>
                      <span className={`pill ${badge.className}`}>
                        {badge.label}
                      </span>
                      {item.versao_regras && (
                        <span className="pill pill-neutral">
                          Regras v{item.versao_regras}
                        </span>
                      )}
                    </div>
                    <p className="card-subtitle">
                      {formatDateTimePtBr(item.data_consulta)}
                      {item.descricao ? ` — "${item.descricao}"` : ""}
                    </p>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleSelectConsultation(item.id)}
                      disabled={loadingDetail}
                    >
                      {isSelected ? "Atualizar detalhes" : "Ver detalhes"}
                    </button>
                    {!badge.isClosed && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleCloseConsultation(item.id)}
                        disabled={closingId === item.id}
                      >
                        <CheckCircleIcon size={15} />
                        {closingId === item.id ? "Encerrando..." : "Encerrar"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {loadingDetail && (
        <section className="card">
          <p className="card-subtitle">Carregando detalhes da consulta...</p>
        </section>
      )}

      {selectedDetail && !loadingDetail && (
        <div className="page-stack">
          <section className="card" aria-label="Detalhes da consulta selecionada">
            <div className="consultation-active-header">
              <div>
                <div className="consultation-meta-row">
                  <h3 className="card-title" style={{ marginBottom: 0 }}>
                    Detalhes da Consulta #{selectedDetail.id}
                  </h3>
                  <span
                    className={`pill ${
                      formatConsultationStatus(selectedDetail.status).className
                    }`}
                  >
                    {formatConsultationStatus(selectedDetail.status).label}
                  </span>
                </div>
                <p className="card-subtitle" style={{ marginTop: 6 }}>
                  Aberta em {formatDateTimePtBr(selectedDetail.data_consulta)}
                  {selectedDetail.descricao
                    ? ` — "${selectedDetail.descricao}"`
                    : ""}
                </p>
              </div>

              {!formatConsultationStatus(selectedDetail.status).isClosed && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleCloseConsultation(selectedDetail.id)}
                  disabled={closingId === selectedDetail.id}
                >
                  <CheckCircleIcon size={16} />
                  {closingId === selectedDetail.id
                    ? "Encerrando..."
                    : "Encerrar Investigação (RF10)"}
                </button>
              )}
            </div>

            <div className="evidence-list" style={{ marginTop: 14 }}>
              <span className="evidence-label">
                Sintomas registrados ({selectedDetail.sintomas?.length || 0}):
              </span>
              {selectedDetail.sintomas?.length > 0 ? (
                <div className="evidence-chips">
                  {selectedDetail.sintomas.map((sint) => (
                    <span key={sint.identificador} className="evidence-chip">
                      {sint.descricao} (<code>{sint.identificador}</code>)
                    </span>
                  ))}
                </div>
              ) : (
                <span className="card-subtitle">
                  Nenhum sintoma registrado nesta consulta.
                </span>
              )}
            </div>
          </section>

          <DiagnosisResultsPanel
            diagnosticResult={detailAsDiagnosisResult}
            catalogSymptoms={catalog?.sintomas || selectedDetail.sintomas || []}
            consultaStatus={selectedDetail.status}
          />
        </div>
      )}
    </div>
  );
}

