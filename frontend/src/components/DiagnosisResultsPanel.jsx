import { useMemo } from "react";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  CpuIcon,
  HelpCircleIcon,
  ShieldCheckIcon,
  WrenchIcon,
} from "./Icons.jsx";
import {
  buildSymptomDescriptionMap,
  normalizeHypothesis,
  summarizeDiagnosisResult,
} from "../utils/investigationHelpers.js";

export default function DiagnosisResultsPanel({
  diagnosticResult,
  catalogSymptoms = [],
  onCloseConsultation = null,
  closingConsultation = false,
  consultaStatus = null,
}) {
  const symptomMap = useMemo(
    () => buildSymptomDescriptionMap(catalogSymptoms),
    [catalogSymptoms]
  );

  const summary = useMemo(
    () => summarizeDiagnosisResult(diagnosticResult),
    [diagnosticResult]
  );

  const normalizedHypotheses = useMemo(() => {
    if (!diagnosticResult?.diagnosticos) return [];
    return diagnosticResult.diagnosticos.map((item) =>
      normalizeHypothesis(item, symptomMap)
    );
  }, [diagnosticResult, symptomMap]);

  if (!summary) {
    return null;
  }

  const isClosed = consultaStatus === "encerrada";

  return (
    <section className="card" aria-label="Resultados do diagnóstico especialista">
      <div className="section-header-row">
        <div>
          <h2 className="card-title">
            <CpuIcon size={20} />
            3. Diagnóstico e Explicabilidade
          </h2>
          <p className="card-subtitle">
            {summary.isDiagnosticada
              ? `${summary.totalHipoteses} hipótese(s) técnica(s) compatível(is) encontrada(s) pelo motor SWI-Prolog.`
              : "Nenhuma hipótese conclusiva pôde ser confirmada com segurança."}
          </p>
        </div>

        <div className="form-actions">
          {summary.versaoRegras && (
            <span className="pill pill-neutral">
              Base de Regras v{summary.versaoRegras}
            </span>
          )}
          <span
            className={`pill ${
              summary.isDiagnosticada ? "pill-success" : "pill-warning"
            }`}
          >
            {summary.isDiagnosticada ? "Hipóteses geradas" : "Inconclusivo"}
          </span>
        </div>
      </div>

      {/* Aviso obrigatório (Seção 17): hipóteses técnicas, nunca diagnósticos definitivos */}
      <div className="banner banner-info" style={{ marginTop: 14 }}>
        <ShieldCheckIcon size={18} />
        <div>
          <strong>Aviso Técnico (Seção 17):</strong> {summary.avisoHipotese}
        </div>
      </div>

      {/* Aviso explícito de múltiplas hipóteses (RF06) */}
      {summary.hasMultipleHypotheses && (
        <div className="banner banner-warning" style={{ marginTop: 12 }}>
          <AlertTriangleIcon size={18} />
          <div>
            <strong>Múltiplas hipóteses possíveis identificadas (RF06):</strong>{" "}
            os sintomas informados são compatíveis com{" "}
            {summary.totalHipoteses} causas distintas. Avalie todas as hipóteses
            abaixo em conjunto antes de concluir a causa raiz.
          </div>
        </div>
      )}

      {/* Tratamento visual de estado inconclusivo */}
      {!summary.isDiagnosticada && (
        <div
          className={`banner ${
            summary.hasContradictions ? "banner-danger" : "banner-warning"
          }`}
          style={{ marginTop: 14 }}
          role="status"
        >
          {summary.hasContradictions ? (
            <AlertTriangleIcon size={18} />
          ) : (
            <HelpCircleIcon size={18} />
          )}
          <div>
            <strong>
              {summary.hasContradictions
                ? "Diagnóstico bloqueado por contradição:"
                : "Evidências insuficientes para concluir:"}
            </strong>{" "}
            {summary.hasContradictions
              ? "revise os sintomas conflitantes destacados no painel acima."
              : "utilize o painel de consulta complementar acima ou marque mais sintomas observados."}
          </div>
        </div>
      )}

      {/* Grid de múltiplas hipóteses */}
      {normalizedHypotheses.length > 0 && (
        <div className="hypothesis-grid">
          {normalizedHypotheses.map((hip, idx) => (
            <article
              key={`${hip.causa}-${idx}`}
              className="hypothesis-card"
              aria-label={`Hipótese ${idx + 1}: ${hip.causa}`}
            >
              <div className="hypothesis-header">
                <div>
                  <div className="consultation-meta-row">
                    <span className="pill pill-neutral">
                      Hipótese {idx + 1}
                    </span>
                    {hip.dominio_rotulo && (
                      <span className="pill pill-neutral">
                        {hip.dominio_rotulo}
                      </span>
                    )}
                    {hip.requer_alerta_tecnico && (
                      <span className="pill pill-warning">
                        <AlertTriangleIcon size={13} />
                        Contém procedimento técnico
                      </span>
                    )}
                  </div>
                  <h3 className="hypothesis-title">{hip.descricao_causa}</h3>
                  <code className="symptom-code">Causa: {hip.causa}</code>
                </div>
              </div>

              {/* Recomendações ordenadas (RF04) */}
              <div className="hypothesis-section">
                <h4 className="subsection-title">
                  <WrenchIcon size={15} />
                  Procedimentos Recomendados (ordem de execução)
                </h4>

                <ol className="recommendation-list">
                  {hip.recomendacoes.map((rec) => (
                    <li
                      key={`${hip.causa}-rec-${rec.ordem_execucao}`}
                      className={`recommendation-item ${
                        rec.requer_conhecimento_tecnico ? "technical" : ""
                      }`}
                    >
                      <span className="step-number">{rec.ordem_execucao}</span>
                      <div className="recommendation-body">
                        <p>{rec.descricao}</p>
                        {rec.requer_conhecimento_tecnico && (
                          <span className="tech-warning-badge">
                            <AlertTriangleIcon size={13} />
                            Requer conhecimento técnico / cuidados de segurança
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Painel de Explicabilidade (RF05 / RNF06) */}
              <div className="explainability-box">
                <h4 className="subsection-title">
                  <CheckCircleIcon size={15} />
                  Explicabilidade Lógica (RF05)
                </h4>

                <div className="rules-applied-row">
                  <span>Regras acionadas:</span>
                  {hip.regras_aplicadas.map((regraId) => (
                    <code key={regraId} className="rule-badge">
                      {regraId}
                    </code>
                  ))}
                </div>

                {hip.explicacoes.map((exp, expIdx) => (
                  <div
                    key={`${exp.identificador_regra}-${expIdx}`}
                    className="explanation-item"
                  >
                    <p className="explanation-text">{exp.justificativa}</p>
                    {exp.evidencias_utilizadas.length > 0 && (
                      <div className="evidence-list">
                        <span className="evidence-label">
                          Evidências que fundamentaram a conclusão:
                        </span>
                        <div className="evidence-chips">
                          {exp.evidencias_utilizadas.map((ev) => (
                            <span
                              key={ev.identificador}
                              className="evidence-chip"
                              title={ev.identificador}
                            >
                              {ev.descricao} (<code>{ev.identificador}</code>)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {onCloseConsultation && !isClosed && (
        <div className="diagnosis-action-bar">
          <span className="card-subtitle">
            Investigação concluída? Finalize a consulta para preservá-la no histórico.
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCloseConsultation}
            disabled={closingConsultation}
          >
            <CheckCircleIcon size={16} />
            {closingConsultation ? "Encerrando..." : "Encerrar Investigação (RF10)"}
          </button>
        </div>
      )}
    </section>
  );
}

