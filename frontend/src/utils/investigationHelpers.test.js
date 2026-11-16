import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSymptomDescriptionMap,
  filterSymptoms,
  groupSymptomsByCategory,
  hasSensitivePasswordPattern,
  mergeSymptoms,
  normalizeHypothesis,
  removeSymptom,
  summarizeDiagnosisResult,
} from "./investigationHelpers.js";

const SAMPLE_SYMPTOMS = [
  { identificador: "sem_internet", descricao: "Sem acesso à internet", categoria: "rede" },
  { identificador: "sem_imagem", descricao: "Monitor sem imagem na tela", categoria: "video" },
  { identificador: "computador_nao_liga", descricao: "Computador não liga", categoria: "inicializacao" },
  { identificador: "computador_lento", descricao: "Sistema operacional lento", categoria: "desempenho" },
  { identificador: "monitor_desligado", descricao: "Monitor está desligado", categoria: "video" },
];

test("groupSymptomsByCategory agrupa e ordena categorias conforme os domínios", () => {
  const grouped = groupSymptomsByCategory(SAMPLE_SYMPTOMS);
  assert.deepEqual(
    grouped.map((g) => g.categoria),
    ["inicializacao", "video", "desempenho", "rede"]
  );
  assert.equal(grouped[1].sintomas.length, 2);
});

test("filterSymptoms filtra por texto e por categoria", () => {
  const onlyVideo = filterSymptoms(SAMPLE_SYMPTOMS, "", "video");
  assert.equal(onlyVideo.length, 2);

  const byText = filterSymptoms(SAMPLE_SYMPTOMS, "desligado", "todas");
  assert.deepEqual(
    byText.map((s) => s.identificador),
    ["monitor_desligado"]
  );
});

test("hasSensitivePasswordPattern detecta padrões de senha ou segredo", () => {
  assert.equal(hasSensitivePasswordPattern("Computador lento ao abrir navegador"), false);
  assert.equal(hasSensitivePasswordPattern("Minha senha: 12345"), true);
  assert.equal(hasSensitivePasswordPattern("password=abc"), true);
});

test("mergeSymptoms e removeSymptom mantêm integridade sem duplicatas", () => {
  const merged = mergeSymptoms(["sem_imagem"], ["computador_ligado", "sem_imagem"]);
  assert.deepEqual(merged, ["sem_imagem", "computador_ligado"]);

  const afterRemove = removeSymptom(merged, "sem_imagem");
  assert.deepEqual(afterRemove, ["computador_ligado"]);
});

test("normalizeHypothesis ordena recomendações, detecta risco técnico e mapeia evidências", () => {
  const symptomMap = buildSymptomDescriptionMap([
    ...SAMPLE_SYMPTOMS,
    { identificador: "computador_ligado", descricao: "Computador liga e permanece energizado", categoria: "inicializacao" },
  ]);

  const normalized = normalizeHypothesis(
    {
      causa: "possivel_falha_ram",
      descricao_causa: "Possível falha nos módulos de RAM",
      dominio: "video",
      recomendacao: "Investigue os módulos de memória RAM",
      recomendacoes: [
        { ordem_execucao: 2, descricao: "Reencaixar módulos", requer_conhecimento_tecnico: true },
        { ordem_execucao: 1, descricao: "Desligar da tomada", requer_conhecimento_tecnico: false },
      ],
      regras_aplicadas: ["regra_video_02"],
      explicacoes: [
        {
          identificador_regra: "regra_video_02",
          evidencias_utilizadas: ["sem_imagem", "computador_ligado"],
          justificativa: "Sem vídeo com computador energizado.",
        },
      ],
    },
    symptomMap
  );

  assert.equal(normalized.dominio_rotulo, "Vídeo e Monitor");
  assert.equal(normalized.requer_alerta_tecnico, true);
  assert.deepEqual(
    normalized.recomendacoes.map((r) => r.ordem_execucao),
    [1, 2]
  );
  assert.equal(
    normalized.explicacoes[0].evidencias_utilizadas[0].descricao,
    "Monitor sem imagem na tela"
  );
});

test("summarizeDiagnosisResult identifica múltiplas hipóteses e estado inconclusivo", () => {
  const multi = summarizeDiagnosisResult({
    status: "diagnosticada",
    versao_regras: "1.0.0",
    aviso_hipotese: "Hipóteses prováveis",
    diagnosticos: [{ causa: "problema_monitor" }, { causa: "possivel_falha_ram" }],
    sintomas_complementares: [],
    contradicoes: [],
  });
  assert.equal(multi.isDiagnosticada, true);
  assert.equal(multi.hasMultipleHypotheses, true);
  assert.equal(multi.totalHipoteses, 2);

  const insuf = summarizeDiagnosisResult({
    status: "inconclusiva",
    versao_regras: "1.0.0",
    diagnosticos: [],
    sintomas_complementares: [{ identificador: "monitor_desligado", pergunta: "Monitor apagado?" }],
    contradicoes: [],
  });
  assert.equal(insuf.isDiagnosticada, false);
  assert.equal(insuf.isInconclusiva, true);
  assert.equal(insuf.hasComplementary, true);
});
