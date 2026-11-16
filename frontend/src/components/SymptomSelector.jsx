import { useMemo, useState } from "react";
import {
  CheckCircleIcon,
  SearchIcon,
  StethoscopeIcon,
} from "./Icons.jsx";
import {
  CATEGORY_LABELS,
  filterSymptoms,
  groupSymptomsByCategory,
} from "../utils/investigationHelpers.js";

export default function SymptomSelector({
  sintomas = [],
  selectedSymptoms = [],
  onToggleSymptom,
  onClearSymptoms,
  onRunDiagnosis,
  disabled = false,
  loading = false,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todas");

  const availableCategories = useMemo(() => {
    const seen = new Set();
    for (const item of sintomas) {
      if (item.categoria) seen.add(item.categoria);
    }
    return Array.from(seen);
  }, [sintomas]);

  const filteredSymptoms = useMemo(
    () => filterSymptoms(sintomas, searchTerm, categoryFilter),
    [sintomas, searchTerm, categoryFilter]
  );

  const groupedCategories = useMemo(
    () => groupSymptomsByCategory(filteredSymptoms),
    [filteredSymptoms]
  );

  const selectedSet = useMemo(
    () => new Set(selectedSymptoms),
    [selectedSymptoms]
  );

  const descriptionById = useMemo(() => {
    const map = new Map();
    for (const item of sintomas) {
      map.set(item.identificador, item.descricao);
    }
    return map;
  }, [sintomas]);

  return (
    <section className="card" aria-label="Seleção de sintomas">
      <div className="section-header-row">
        <div>
          <h2 className="card-title">
            <StethoscopeIcon size={20} />
            2. Selecionar Sintomas Observados (RF02)
          </h2>
          <p className="card-subtitle">
            Marque todos os sintomas percebidos no equipamento. Você pode combinar
            sintomas de diferentes categorias.
          </p>
        </div>
        <span className="pill pill-neutral">
          {selectedSymptoms.length} selecionado(s)
        </span>
      </div>

      <div className="symptom-toolbar">
        <div className="search-box">
          <SearchIcon size={16} />
          <input
            type="search"
            className="text-input search-input"
            placeholder="Filtrar sintomas por descrição ou código..."
            aria-label="Filtrar sintomas"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={disabled}
          />
        </div>

        <select
          className="select-input"
          aria-label="Filtrar por categoria"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          disabled={disabled}
        >
          <option value="todas">Todas as categorias ({sintomas.length})</option>
          {availableCategories.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat] || cat}
            </option>
          ))}
        </select>
      </div>

      {sintomas.length === 0 ? (
        <p className="card-subtitle" style={{ marginTop: 16 }}>
          Nenhum sintoma carregado. Verifique a conexão com a API do TechExpert.
        </p>
      ) : groupedCategories.length === 0 ? (
        <p className="card-subtitle" style={{ marginTop: 16 }}>
          Nenhum sintoma corresponde ao filtro "{searchTerm}".
        </p>
      ) : (
        <div className="category-groups">
          {groupedCategories.map((group) => {
            const countInGroup = group.sintomas.filter((s) =>
              selectedSet.has(s.identificador)
            ).length;

            return (
              <div key={group.categoria} className="category-group-card">
                <div className="category-group-header">
                  <h3>{group.rotulo}</h3>
                  <span
                    className={`pill ${
                      countInGroup > 0 ? "pill-success" : "pill-neutral"
                    }`}
                  >
                    {countInGroup}/{group.sintomas.length}
                  </span>
                </div>

                <div className="symptom-list">
                  {group.sintomas.map((item) => {
                    const checked = selectedSet.has(item.identificador);
                    return (
                      <label
                        key={item.identificador}
                        className={`symptom-option ${checked ? "selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggleSymptom(item.identificador)}
                          disabled={disabled || loading}
                        />
                        <div className="symptom-option-text">
                          <span className="symptom-desc">{item.descricao}</span>
                          <code className="symptom-code">{item.identificador}</code>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="diagnosis-action-bar">
        <div className="selected-chips-wrap">
          {selectedSymptoms.length > 0 ? (
            selectedSymptoms.map((ident) => (
              <button
                key={ident}
                type="button"
                className="chip-selected"
                onClick={() => onToggleSymptom(ident)}
                disabled={disabled || loading}
                title={`Remover: ${descriptionById.get(ident) || ident}`}
              >
                <span>{descriptionById.get(ident) || ident}</span>
                <span aria-hidden="true">×</span>
              </button>
            ))
          ) : (
            <span className="card-subtitle">
              Selecione ao menos 1 sintoma para executar o diagnóstico.
            </span>
          )}
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClearSymptoms}
            disabled={disabled || loading || selectedSymptoms.length === 0}
          >
            Limpar seleção
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onRunDiagnosis}
            disabled={disabled || loading || selectedSymptoms.length === 0}
          >
            <CheckCircleIcon size={16} />
            {loading ? "Analisando regras..." : "Executar Diagnóstico Especialista"}
          </button>
        </div>
      </div>
    </section>
  );
}

