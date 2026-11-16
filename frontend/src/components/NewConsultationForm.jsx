import { useState } from "react";
import {
  AlertTriangleIcon,
  PlusCircleIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
} from "./Icons.jsx";
import { hasSensitivePasswordPattern } from "../utils/investigationHelpers.js";

const STATUS_BADGE = {
  aberta: { label: "Aberta", className: "pill-neutral" },
  em_investigacao: { label: "Em investigação", className: "pill-neutral" },
  diagnosticada: { label: "Diagnosticada", className: "pill-success" },
  inconclusiva: { label: "Inconclusiva", className: "pill-warning" },
  encerrada: { label: "Encerrada", className: "pill-danger" },
};

function formatDateTime(isoValue) {
  if (!isoValue) return "Agora";
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return String(isoValue);
  return parsed.toLocaleString("pt-BR");
}

export default function NewConsultationForm({
  consultaAtual,
  loading,
  onCreateConsultation,
  onResetConsultation,
}) {
  const [descricao, setDescricao] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError("");

    if (hasSensitivePasswordPattern(descricao)) {
      setLocalError(
        "Por segurança, não informe senhas, PINs ou tokens na descrição do problema."
      );
      return;
    }

    const created = await onCreateConsultation(descricao.trim());
    if (created) {
      setDescricao("");
    }
  };

  if (consultaAtual) {
    const badge = STATUS_BADGE[consultaAtual.status] || {
      label: consultaAtual.status,
      className: "pill-neutral",
    };

    return (
      <section className="card" aria-label="Consulta ativa">
        <div className="consultation-active-header">
          <div>
            <div className="consultation-meta-row">
              <h2 className="card-title" style={{ marginBottom: 0 }}>
                <StethoscopeIcon size={20} />
                Consulta #{consultaAtual.id}
              </h2>
              <span className={`pill ${badge.className}`}>{badge.label}</span>
              {consultaAtual.versao_regras && (
                <span className="pill pill-neutral">
                  Regras v{consultaAtual.versao_regras}
                </span>
              )}
            </div>
            <p className="card-subtitle" style={{ marginTop: 6 }}>
              Iniciada em {formatDateTime(consultaAtual.data_consulta)}
              {consultaAtual.descricao
                ? ` — "${consultaAtual.descricao}"`
                : " — Sem descrição textual inicial."}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onResetConsultation}
            disabled={loading}
          >
            <PlusCircleIcon size={16} />
            Nova Investigação
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card" aria-label="Iniciar nova consulta">
      <h2 className="card-title">
        <PlusCircleIcon size={20} />
        1. Iniciar Nova Investigação (RF01)
      </h2>
      <p className="card-subtitle">
        Opcionalmente descreva o problema observado antes de selecionar os sintomas
        abaixo, ou marque diretamente os sintomas para iniciar automaticamente.
      </p>

      <div className="banner banner-info" style={{ marginTop: 14 }}>
        <ShieldCheckIcon size={18} />
        <div>
          <strong>Aviso de privacidade:</strong> nunca informe senhas (Wi-Fi,
          roteador, sistema operacional), chaves privadas ou dados confidenciais.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form-stack" style={{ marginTop: 14 }}>
        <div className="form-field">
          <label htmlFor="consulta-descricao" className="field-label">
            Descrição inicial do problema (opcional)
          </label>
          <textarea
            id="consulta-descricao"
            className="textarea-input"
            rows={2}
            maxLength={1000}
            placeholder="Ex.: O computador liga, as ventoinhas giram, mas não aparece imagem na tela..."
            value={descricao}
            onChange={(e) => {
              setDescricao(e.target.value);
              if (localError) setLocalError("");
            }}
            disabled={loading}
          />
          <div className="field-hint">
            <span>Máximo de 1000 caracteres</span>
            <span>{descricao.length}/1000</span>
          </div>
        </div>

        {localError && (
          <div className="banner banner-danger" role="alert">
            <AlertTriangleIcon size={18} />
            <span>{localError}</span>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <PlusCircleIcon size={16} />
            {loading ? "Criando consulta..." : "Iniciar Nova Investigação"}
          </button>
        </div>
      </form>
    </section>
  );
}

