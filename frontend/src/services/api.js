/**
 * Cliente HTTP centralizado para comunicação com a API REST do TechExpert.
 */

export function resolveApiBaseUrl() {
  const viteEnv =
    typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.VITE_API_BASE_URL
      : undefined;
  const nodeEnv =
    typeof globalThis !== "undefined" && globalThis.process?.env
      ? globalThis.process.env.VITE_API_BASE_URL
      : undefined;
  const raw = viteEnv || nodeEnv || "http://localhost:8000";
  return String(raw).replace(/\/+$/, "");
}

export class ApiError extends Error {
  constructor(message, status = 0, detail = null, payload = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.payload = payload;
  }
}

function formatErrorMessage(status, payload, fallbackMessage) {
  if (payload && typeof payload === "object") {
    const { detail } = payload;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    if (Array.isArray(detail) && detail.length > 0) {
      const messages = detail
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            const loc = Array.isArray(item.loc) ? item.loc.join(".") : "";
            return loc ? `${loc}: ${item.msg}` : item.msg;
          }
          return null;
        })
        .filter(Boolean);
      if (messages.length > 0) {
        return messages.join("; ");
      }
    }
  }
  if (status > 0) {
    return fallbackMessage || `Erro na requisição HTTP (${status}).`;
  }
  return fallbackMessage || "Não foi possível conectar ao servidor do TechExpert.";
}

async function parseJsonSafe(response) {
  const contentType = response.headers?.get?.("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    return text ? { detail: text } : null;
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const baseUrl = resolveApiBaseUrl();
  const url = `${baseUrl}${path}`;
  const headers = {
    Accept: "application/json",
    ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (networkError) {
    throw new ApiError(
      "Não foi possível conectar à API do TechExpert. Verifique se o backend está em execução.",
      0,
      networkError?.message || null,
      null
    );
  }

  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    throw new ApiError(
      formatErrorMessage(response.status, payload, response.statusText),
      response.status,
      payload?.detail ?? null,
      payload
    );
  }

  return payload;
}

function buildAdminHeaders(adminKey, adminUserId = null) {
  const headers = {};
  if (adminKey) {
    headers["X-Admin-Key"] = adminKey;
  }
  if (adminUserId !== null && adminUserId !== undefined && adminUserId !== "") {
    headers["X-Admin-User-Id"] = String(adminUserId);
  }
  return headers;
}

/**
 * Consulta GET /health e retorna o estado mesmo quando HTTP 503 com JSON degradado.
 */
export async function verificarSaude() {
  const baseUrl = resolveApiBaseUrl();
  let response;
  try {
    response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  } catch (networkError) {
    throw new ApiError(
      "Backend indisponível no endereço configurado.",
      0,
      networkError?.message || null,
      null
    );
  }

  const payload = await parseJsonSafe(response);
  if (payload && typeof payload === "object" && "status" in payload) {
    return {
      ...payload,
      httpStatus: response.status,
      reachable: true,
    };
  }

  if (!response.ok) {
    throw new ApiError(
      formatErrorMessage(response.status, payload, response.statusText),
      response.status,
      payload?.detail ?? null,
      payload
    );
  }

  return {
    status: "ok",
    httpStatus: response.status,
    reachable: true,
  };
}

/**
 * Consulta catálogo completo de sintomas e diagnósticos (GET /api/diagnosticos).
 */
export function listarDiagnosticosESintomas() {
  return request("/api/diagnosticos", { method: "GET" });
}

/**
 * Cria uma nova consulta de investigação (POST /api/consultas — RF01).
 */
export function criarConsulta({ usuarioId = null, descricao = null } = {}) {
  const body = {};
  if (usuarioId !== null && usuarioId !== undefined && usuarioId !== "") {
    body.usuario_id = Number(usuarioId);
  }
  if (typeof descricao === "string" && descricao.trim()) {
    body.descricao = descricao.trim();
  }
  return request("/api/consultas", {
    method: "POST",
    body,
  });
}

/**
 * Registra sintomas observados em uma consulta (POST /api/consultas/{id}/sintomas — RF02).
 */
export function registrarSintomas(
  consultaId,
  sintomas,
  { substituir = false } = {}
) {
  const query = `?substituir=${substituir ? "true" : "false"}`;
  return request(`/api/consultas/${consultaId}/sintomas${query}`, {
    method: "POST",
    body: { sintomas },
  });
}

/**
 * Executa inferência lógica no motor Prolog (POST /api/consultas/{id}/diagnosticar).
 */
export function executarDiagnostico(
  consultaId,
  { sintomas = null, substituir = false } = {}
) {
  const query = `?substituir=${substituir ? "true" : "false"}`;
  const body = Array.isArray(sintomas) ? { sintomas } : undefined;
  return request(`/api/consultas/${consultaId}/diagnosticar${query}`, {
    method: "POST",
    body,
  });
}

/**
 * Obtém detalhes completos de uma consulta (GET /api/consultas/{id}).
 */
export function buscarConsulta(consultaId) {
  return request(`/api/consultas/${consultaId}`, { method: "GET" });
}

/**
 * Lista histórico de consultas com filtros opcionais (GET /api/consultas — RF07).
 */
export function listarHistorico({
  status = "",
  usuarioId = null,
  limit = 50,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }
  if (usuarioId !== null && usuarioId !== undefined && usuarioId !== "") {
    params.set("usuario_id", String(usuarioId));
  }
  if (limit !== undefined && limit !== null) {
    params.set("limit", String(limit));
  }
  if (offset !== undefined && offset !== null) {
    params.set("offset", String(offset));
  }
  const qs = params.toString();
  return request(`/api/consultas${qs ? `?${qs}` : ""}`, { method: "GET" });
}

/**
 * Finaliza explicitamente uma consulta (PATCH /api/consultas/{id}/encerrar — RF10).
 */
export function encerrarConsulta(consultaId) {
  return request(`/api/consultas/${consultaId}/encerrar`, {
    method: "PATCH",
  });
}

/**
 * Consulta visão administrativa da base de conhecimento (GET /api/admin/conhecimento — RF08).
 */
export function obterConhecimentoAdmin(adminKey, adminUserId = null) {
  return request("/api/admin/conhecimento", {
    method: "GET",
    headers: buildAdminHeaders(adminKey, adminUserId),
  });
}

/**
 * Recarrega base Prolog e ressincroniza catálogo (POST /api/admin/conhecimento/recarregar — RF08).
 */
export function recarregarConhecimentoAdmin(adminKey, adminUserId = null) {
  return request("/api/admin/conhecimento/recarregar", {
    method: "POST",
    headers: buildAdminHeaders(adminKey, adminUserId),
  });
}

/**
 * Cadastra ou atualiza descrição/categoria de sintoma (PUT /api/admin/conhecimento/sintomas — RF08).
 */
export function atualizarSintomaAdmin(payload, adminKey, adminUserId = null) {
  return request("/api/admin/conhecimento/sintomas", {
    method: "PUT",
    headers: buildAdminHeaders(adminKey, adminUserId),
    body: payload,
  });
}

