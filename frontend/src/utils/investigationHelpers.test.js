import assert from "node:assert/strict";
import test from "node:test";
import {
  filterSymptoms,
  groupSymptomsByCategory,
  hasSensitivePasswordPattern,
  mergeSymptoms,
  removeSymptom,
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

