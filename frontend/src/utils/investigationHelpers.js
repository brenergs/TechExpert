/**
 * Funções puras auxiliares para categorização, filtragem, validação preventiva,
 * manipulação de sintomas e normalização de resultados diagnósticos (Passos 4.2–4.4).
 */

export const CATEGORY_LABELS = {
  inicializacao: "Inicialização e Energia",
  video: "Vídeo e Monitor",
  memoria_ram: "Memória RAM e Estabilidade",
  desempenho: "Desempenho e Sistema",
  armazenamento: "Armazenamento (HD / SSD)",
  rede: "Rede, Internet e DNS",
  temperatura: "Temperatura e Refrigeração",
};

const CATEGORY_ORDER = [
  "inicializacao",
  "video",
  "memoria_ram",
  "desempenho",
  "armazenamento",
  "rede",
  "temperatura",
];

const SENSITIVE_PATTERN_RE = /\b(senha|password|pin|token|secret)\s*[:=]/i;

/**
 * Verifica preventivamente se um texto parece conter senha ou segredo (Seção 17).
 */
export function hasSensitivePasswordPattern(text) {
  if (typeof text !== "string" || !text.trim()) {
    return false;
  }
  return SENSITIVE_PATTERN_RE.test(text);
}

/**
 * Filtra lista de sintomas por termo de busca textual e categoria selecionada.
 */
export function filterSymptoms(symptoms, searchTerm = "", categoryFilter = "todas") {
  if (!Array.isArray(symptoms)) {
    return [];
  }
  const normalizedQuery = String(searchTerm || "").trim().toLowerCase();
  const normalizedCategory = String(categoryFilter || "todas");

  return symptoms.filter((item) => {
    if (normalizedCategory !== "todas" && item.categoria !== normalizedCategory) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    const label = (CATEGORY_LABELS[item.categoria] || item.categoria || "").toLowerCase();
    return (
      String(item.descricao || "").toLowerCase().includes(normalizedQuery) ||
      String(item.identificador || "").toLowerCase().includes(normalizedQuery) ||
      label.includes(normalizedQuery)
    );
  });
}

/**
 * Agrupa sintomas por categoria respeitando a ordem padrão dos 7 domínios.
 */
export function groupSymptomsByCategory(symptoms) {
  if (!Array.isArray(symptoms) || symptoms.length === 0) {
    return [];
  }

  const buckets = new Map();
  for (const item of symptoms) {
    const key = item.categoria || "outros";
    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key).push(item);
  }

  const orderedKeys = Array.from(buckets.keys()).sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(a);
    const idxB = CATEGORY_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  return orderedKeys.map((categoria) => ({
    categoria,
    rotulo: CATEGORY_LABELS[categoria] || categoria,
    sintomas: buckets.get(categoria),
  }));
}

/**
 * Combina novos identificadores de sintomas sem duplicatas preservando ordem.
 */
export function mergeSymptoms(currentList = [], additions = []) {
  const seen = new Set();
  const merged = [];
  for (const item of [...currentList, ...additions]) {
    if (typeof item === "string" && item && !seen.has(item)) {
      seen.add(item);
      merged.push(item);
    }
  }
  return merged;
}

/**
 * Remove um identificador específico da lista de sintomas selecionados.
 */
export function removeSymptom(currentList = [], target) {
  return currentList.filter((item) => item !== target);
}

/**
 * Constrói mapa identificador -> descrição a partir de uma lista de sintomas.
 */
export function buildSymptomDescriptionMap(symptoms = []) {
  const map = new Map();
  if (!Array.isArray(symptoms)) {
    return map;
  }
  for (const item of symptoms) {
    if (item && item.identificador) {
      map.set(item.identificador, item.descricao || item.identificador);
    }
  }
  return map;
}

/**
 * Normaliza uma hipótese diagnóstica ordenando recomendações, identificando
 * procedimentos técnicos e enriquecendo evidências com descrições legíveis.
 */
export function normalizeHypothesis(item, symptomMap = new Map()) {
  const rawRecs = Array.isArray(item?.recomendacoes) ? item.recomendacoes : [];
  const recomendacoes =
    rawRecs.length > 0
      ? [...rawRecs]
          .sort((a, b) => (a.ordem_execucao || 0) - (b.ordem_execucao || 0))
          .map((rec, index) => ({
            ordem_execucao: rec.ordem_execucao ?? index + 1,
            descricao: rec.descricao || "",
            requer_conhecimento_tecnico: Boolean(rec.requer_conhecimento_tecnico),
          }))
      : item?.recomendacao
      ? [
          {
            ordem_execucao: 1,
            descricao: item.recomendacao,
            requer_conhecimento_tecnico: false,
          },
        ]
      : [];

  const regrasAplicadas = Array.isArray(item?.regras_aplicadas)
    ? item.regras_aplicadas
    : [];

  const rawExplicacoes = Array.isArray(item?.explicacoes) ? item.explicacoes : [];
  const explicacoes = rawExplicacoes.map((exp) => {
    const evidencias = Array.isArray(exp.evidencias_utilizadas)
      ? exp.evidencias_utilizadas
      : [];
    return {
      identificador_regra: exp.identificador_regra || "",
      justificativa: exp.justificativa || "",
      evidencias_utilizadas: evidencias.map((ident) => ({
        identificador: ident,
        descricao:
          symptomMap instanceof Map
            ? symptomMap.get(ident) || ident
            : symptomMap?.[ident] || ident,
      })),
    };
  });

  const requerAlertaTecnico = recomendacoes.some(
    (rec) => rec.requer_conhecimento_tecnico
  );

  return {
    causa: item?.causa || "",
    descricao_causa: item?.descricao_causa || item?.causa || "",
    dominio: item?.dominio || null,
    dominio_rotulo: item?.dominio
      ? CATEGORY_LABELS[item.dominio] || item.dominio
      : null,
    nivel_confianca: item?.nivel_confianca ?? null,
    recomendacao_principal: item?.recomendacao || recomendacoes[0]?.descricao || "",
    recomendacoes,
    regras_aplicadas: regrasAplicadas,
    explicacoes,
    requer_alerta_tecnico: requerAlertaTecnico,
  };
}

/**
 * Resume o estado consolidado de um diagnóstico para renderização consistente na UI.
 */
export function summarizeDiagnosisResult(result) {
  if (!result || typeof result !== "object") {
    return null;
  }

  const diagnosticos = Array.isArray(result.diagnosticos) ? result.diagnosticos : [];
  const complementares = Array.isArray(result.sintomas_complementares)
    ? result.sintomas_complementares
    : [];
  const contradicoes = Array.isArray(result.contradicoes) ? result.contradicoes : [];

  const isInconclusiva =
    result.status === "inconclusiva" ||
    (diagnosticos.length === 0 && (complementares.length > 0 || contradicoes.length > 0));

  return {
    status: result.status || (diagnosticos.length > 0 ? "diagnosticada" : "inconclusiva"),
    isDiagnosticada: diagnosticos.length > 0,
    isInconclusiva,
    hasMultipleHypotheses: diagnosticos.length > 1,
    hasContradictions: contradicoes.length > 0,
    hasComplementary: complementares.length > 0,
    totalHipoteses: diagnosticos.length,
    versaoRegras: result.versao_regras || null,
    avisoHipotese:
      result.aviso_hipotese ||
      "Os resultados representam hipóteses técnicas prováveis e não substituem avaliação presencial especializada.",
  };
}
