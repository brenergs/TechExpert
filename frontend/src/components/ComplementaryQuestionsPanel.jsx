import { useEffect, useState } from "react";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  HelpCircleIcon,
} from "./Icons.jsx";

export default function ComplementaryQuestionsPanel({
  diagnosticResult,
  loading = false,
  disabled = false,
  onRemoveContradictorySymptom,
  onSubmitComplementary,
}) {
  const [selectedAnswers, setSelectedAnswers] = useState([]);

  const complementares = diagnosticResult?.sintomas_complementares || [];
  const contradicoes = diagnosticResult?.contradicoes || [];

  useEffect(() => {
    setSelectedAnswers([]);
  }, [diagnosticResult]);

  if (contradicoes.length === 0 && complementares.length === 0) {
    return null;
  }

  const toggleAnswer = (identificador) => {
    setSelectedAnswers((prev) =>
      prev.includes(identificador)
        ? prev.filter((item) => item !== identificador)
        : [...prev, identificador]
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (selectedAnswers.length === 0) return;
    onSubmitComplementary(selectedAnswers);
  };

  return (
    <section className="card" aria-label="Consulta complementar e resolução de conflitos">
      {contradicoes.length > 0 && (
        <div className="contradictions-block">
          <div className="banner banner-danger" role="alert">
            <AlertTriangleIcon size={18} />
            <div>
              <strong>Evidências contraditórias detectadas:</strong> alguns sintomas
              marcados são mutuamente exclusivos. Remova o item incorreto para
              continuar o diagnóstico.
            </div>
          </div>

          <div className="contradiction-list">
            {contradicoes.map((item) => (
              <div
                key={`${item.sintoma_a}-${item.sintoma_b}`}
                className="contradiction-card"
              >
                <div>
                  <strong>
                    <code>{item.sintoma_a}</code> × <code>{item.sintoma_b}</code>
                  </strong>
                  <p className="card-subtitle">{item.motivo}</p>
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => onRemoveContradictorySymptom(item.sintoma_a)}
                    disabled={disabled || loading}
                  >
                    Remover {item.sintoma_a}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => onRemoveContradictorySymptom(item.sintoma_b)}
                    disabled={disabled || loading}
                  >
                    Remover {item.sintoma_b}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {complementares.length > 0 && (
        <form onSubmit={handleSubmit}>
          <div className="banner banner-warning" role="status">
            <HelpCircleIcon size={18} />
            <div>
              <strong>Consulta Complementar (RF09):</strong>{" "}
              {diagnosticResult?.aviso_hipotese ||
                "Os sintomas atuais ainda são insuficientes para uma conclusão segura. Confirme abaixo quais observações adicionais se aplicam:"}
            </div>
          </div>

          <div className="complementary-list">
            {complementares.map((item) => {
              const checked = selectedAnswers.includes(item.identificador);
              return (
                <label
                  key={item.identificador}
                  className={`symptom-option ${checked ? "selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAnswer(item.identificador)}
                    disabled={disabled || loading}
                  />
                  <div className="symptom-option-text">
                    <span className="symptom-desc">{item.pergunta}</span>
                    <code className="symptom-code">{item.identificador}</code>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="form-actions" style={{ marginTop: 14 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={disabled || loading || selectedAnswers.length === 0}
            >
              <CheckCircleIcon size={16} />
              {loading
                ? "Reavaliando diagnóstico..."
                : `Enviar Respostas (${selectedAnswers.length}) e Reavaliar`}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

