import { useState } from "react";
import ComplementaryQuestionsPanel from "../components/ComplementaryQuestionsPanel.jsx";
import DiagnosisResultsPanel from "../components/DiagnosisResultsPanel.jsx";
import { AlertTriangleIcon } from "../components/Icons.jsx";
import NewConsultationForm from "../components/NewConsultationForm.jsx";
import SymptomSelector from "../components/SymptomSelector.jsx";
import {
  criarConsulta,
  encerrarConsulta,
  executarDiagnostico,
  registrarSintomas,
} from "../services/api.js";
import { mergeSymptoms, removeSymptom } from "../utils/investigationHelpers.js";

export default function InvestigationPage({ catalog }) {
  const [consultaAtual, setConsultaAtual] = useState(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [loadingAction, setLoadingAction] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const sintomas = catalog?.sintomas || [];
  const isClosed = consultaAtual?.status === "encerrada";
  const isBusy = Boolean(loadingAction);

  const handleCreateConsultation = async (descricao) => {
    setLoadingAction("create");
    setErrorMessage("");
    try {
      const created = await criarConsulta({ descricao });
      setConsultaAtual(created);
      setDiagnosticResult(null);
      return created;
    } catch (err) {
      setErrorMessage(err.message || "Erro ao iniciar nova consulta.");
      return null;
    } finally {
      setLoadingAction("");
    }
  };

  const handleResetConsultation = () => {
    setConsultaAtual(null);
    setSelectedSymptoms([]);
    setDiagnosticResult(null);
    setErrorMessage("");
  };

  const handleToggleSymptom = (identificador) => {
    setSelectedSymptoms((prev) =>
      prev.includes(identificador)
        ? removeSymptom(prev, identificador)
        : [...prev, identificador]
    );
  };

  const handleRunDiagnosis = async () => {
    if (selectedSymptoms.length === 0) return;

    setLoadingAction("diagnose");
    setErrorMessage("");
    try {
      let targetConsulta = consultaAtual;
      if (!targetConsulta) {
        targetConsulta = await criarConsulta({});
        setConsultaAtual(targetConsulta);
      }

      const result = await executarDiagnostico(targetConsulta.id, {
        sintomas: selectedSymptoms,
        substituir: true,
      });

      setDiagnosticResult(result);
      setConsultaAtual((prev) =>
        prev
          ? {
              ...prev,
              status: result.status,
              versao_regras: result.versao_regras,
            }
          : prev
      );
    } catch (err) {
      setErrorMessage(err.message || "Falha ao executar diagnóstico.");
    } finally {
      setLoadingAction("");
    }
  };

  const handleSubmitComplementary = async (newSymptoms) => {
    if (!consultaAtual || newSymptoms.length === 0) return;

    const merged = mergeSymptoms(selectedSymptoms, newSymptoms);
    setSelectedSymptoms(merged);
    setLoadingAction("complementary");
    setErrorMessage("");

    try {
      await registrarSintomas(consultaAtual.id, newSymptoms, {
        substituir: false,
      });
      const result = await executarDiagnostico(consultaAtual.id, {});
      setDiagnosticResult(result);
      setConsultaAtual((prev) =>
        prev
          ? {
              ...prev,
              status: result.status,
              versao_regras: result.versao_regras,
            }
          : prev
      );
    } catch (err) {
      setErrorMessage(
        err.message || "Falha ao enviar respostas complementares."
      );
    } finally {
      setLoadingAction("");
    }
  };

  const handleRemoveContradictorySymptom = (identificador) => {
    setSelectedSymptoms((prev) => removeSymptom(prev, identificador));
    setDiagnosticResult(null);
  };

  const handleCloseConsultation = async () => {
    if (!consultaAtual || isClosed) return;

    setLoadingAction("close");
    setErrorMessage("");
    try {
      const closed = await encerrarConsulta(consultaAtual.id);
      setConsultaAtual(closed);
    } catch (err) {
      setErrorMessage(err.message || "Falha ao encerrar consulta.");
    } finally {
      setLoadingAction("");
    }
  };

  return (
    <div className="page-stack">
      <NewConsultationForm
        consultaAtual={consultaAtual}
        loading={isBusy}
        onCreateConsultation={handleCreateConsultation}
        onResetConsultation={handleResetConsultation}
      />

      {errorMessage && (
        <div className="banner banner-danger" role="alert">
          <AlertTriangleIcon size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <SymptomSelector
        sintomas={sintomas}
        selectedSymptoms={selectedSymptoms}
        onToggleSymptom={handleToggleSymptom}
        onClearSymptoms={() => {
          setSelectedSymptoms([]);
          setDiagnosticResult(null);
        }}
        onRunDiagnosis={handleRunDiagnosis}
        disabled={isClosed}
        loading={loadingAction === "diagnose" || loadingAction === "complementary"}
      />

      <ComplementaryQuestionsPanel
        diagnosticResult={diagnosticResult}
        loading={loadingAction === "complementary"}
        disabled={isClosed}
        onRemoveContradictorySymptom={handleRemoveContradictorySymptom}
        onSubmitComplementary={handleSubmitComplementary}
      />

      <DiagnosisResultsPanel
        diagnosticResult={diagnosticResult}
        catalogSymptoms={sintomas}
        consultaStatus={consultaAtual?.status}
        onCloseConsultation={consultaAtual ? handleCloseConsultation : null}
        closingConsultation={loadingAction === "close"}
      />
    </div>
  );
}
