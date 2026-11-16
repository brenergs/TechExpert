import assert from "node:assert/strict";
import test from "node:test";
import {
  ApiError,
  atualizarSintomaAdmin,
  buscarConsulta,
  criarConsulta,
  encerrarConsulta,
  executarDiagnostico,
  listarDiagnosticosESintomas,
  listarHistorico,
  obterConhecimentoAdmin,
  recarregarConhecimentoAdmin,
  registrarSintomas,
  verificarSaude,
} from "./api.js";

function createFetchMock(handler) {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return handler(url, options);
  };
  return {
    calls,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

test("verificarSaude aceita 200 e 503 degradado com JSON válido", async () => {
  const mock = createFetchMock(async () =>
    jsonResponse({ status: "degraded", database: "disconnected", prolog_kb: "found" }, 503)
  );
  try {
    const res = await verificarSaude();
    assert.equal(res.status, "degraded");
    assert.equal(res.prolog_kb, "found");
    assert.equal(res.httpStatus, 503);
    assert.equal(mock.calls[0].url, "http://localhost:8000/health");
  } finally {
    mock.restore();
  }
});

test("endpoints principais constroem URL, método e payloads corretos", async () => {
  const mock = createFetchMock(async (url) => {
    if (url.endsWith("/api/diagnosticos")) {
      return jsonResponse({ versao_regras: "1.0.0", total_sintomas: 36, total_diagnosticos: 19, sintomas: [], diagnosticos: [] });
    }
    return jsonResponse({ ok: true }, 200);
  });

  try {
    await listarDiagnosticosESintomas();
    await criarConsulta({ usuarioId: 1, descricao: "Sem vídeo" });
    await registrarSintomas(42, ["sem_imagem", "monitor_desligado"], { substituir: true });
    await executarDiagnostico(42, { sintomas: ["sem_imagem"], substituir: false });
    await buscarConsulta(42);
    await listarHistorico({ status: "diagnosticada", usuarioId: 1, limit: 10, offset: 5 });
    await encerrarConsulta(42);

    assert.equal(mock.calls[0].url, "http://localhost:8000/api/diagnosticos");
    assert.equal(mock.calls[1].options.method, "POST");
    assert.equal(
      mock.calls[1].options.body,
      JSON.stringify({ usuario_id: 1, descricao: "Sem vídeo" })
    );
    assert.equal(
      mock.calls[2].url,
      "http://localhost:8000/api/consultas/42/sintomas?substituir=true"
    );
    assert.equal(
      mock.calls[3].url,
      "http://localhost:8000/api/consultas/42/diagnosticar?substituir=false"
    );
    assert.equal(mock.calls[4].url, "http://localhost:8000/api/consultas/42");
    assert.equal(
      mock.calls[5].url,
      "http://localhost:8000/api/consultas?status=diagnosticada&usuario_id=1&limit=10&offset=5"
    );
    assert.equal(mock.calls[6].url, "http://localhost:8000/api/consultas/42/encerrar");
    assert.equal(mock.calls[6].options.method, "PATCH");
  } finally {
    mock.restore();
  }
});

test("endpoints administrativos enviam X-Admin-Key e X-Admin-User-Id", async () => {
  const mock = createFetchMock(async () => jsonResponse({ versao_regras: "1.0.0" }, 200));
  try {
    await obterConhecimentoAdmin("segredo", 2);
    await recarregarConhecimentoAdmin("segredo", 2);
    await atualizarSintomaAdmin(
      { identificador: "sem_imagem", descricao: "Sem imagem", categoria: "video", recarregar_motor: true },
      "segredo",
      2
    );

    assert.equal(mock.calls[0].options.headers["X-Admin-Key"], "segredo");
    assert.equal(mock.calls[0].options.headers["X-Admin-User-Id"], "2");
    assert.equal(mock.calls[1].url, "http://localhost:8000/api/admin/conhecimento/recarregar");
    assert.equal(mock.calls[2].options.method, "PUT");
  } finally {
    mock.restore();
  }
});

test("erros Pydantic 422 e HTTP 409 convertem para ApiError com mensagem legível", async () => {
  const mock = createFetchMock(async () =>
    jsonResponse(
      {
        detail: [
          {
            loc: ["body", "sintomas"],
            msg: "Sintoma desconhecido ou não autorizado",
            type: "value_error",
          },
        ],
      },
      422
    )
  );
  try {
    await assert.rejects(
      () => registrarSintomas(1, ["invalido"]),
      (err) =>
        err instanceof ApiError &&
        err.status === 422 &&
        err.message.includes("body.sintomas: Sintoma desconhecido")
    );
  } finally {
    mock.restore();
  }
});

