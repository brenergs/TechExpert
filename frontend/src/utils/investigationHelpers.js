/**
 * Funções puras auxiliares para categorização, filtragem, validação preventiva
 * e manipulação de sintomas no fluxo de investigação (Passos 4.2+).
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

