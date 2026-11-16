"""Serviço de integração com o motor especialista SWI-Prolog.

Carrega e consulta a base de conhecimento em prolog/knowledge_base.pl de forma
thread-safe, utilizando PySwip quando disponível/compatível e alternando de modo
transparente para o executável oficial `swipl` com serialização JSON UTF-8 caso
o ambiente Windows bloqueie a inicialização embarcada da libswipl.dll.
"""

import faulthandler
import json
import logging
from pathlib import Path
import shutil
import subprocess
import threading
from typing import Any

from backend.app.database.connection import resolve_prolog_kb_path
from backend.app.schemas.diagnostic import (
    CatalogoDiagnosticosResponse,
    DiagnosticoResponse,
    SintomaCatalogItem,
    refresh_allowed_symptom_identifiers,
    validate_symptom_list,
)

logger = logging.getLogger(__name__)


class PrologServiceError(RuntimeError):
    """Erro base da camada de integração com o motor Prolog."""


class PrologExecutionError(PrologServiceError):
    """Erro durante a execução ou decodificação de consulta no SWI-Prolog."""


class PrologService:
    """Wrapper thread-safe para inferência e consulta à base SWI-Prolog."""

    def __init__(self, kb_path: Path | None = None) -> None:
        self._lock = threading.RLock()
        self._kb_path = (kb_path or resolve_prolog_kb_path()).resolve()
        self._prolog: Any | None = None
        self._swipl_bin: str | None = None
        self._backend_mode: str = ""
        self._initialize_engine()

    @property
    def kb_path(self) -> Path:
        """Retorna o caminho absoluto da base de conhecimento Prolog carregada."""
        return self._kb_path

    @property
    def backend_mode(self) -> str:
        """Retorna o modo ativo de execução ('pyswip' ou 'swipl_cli')."""
        return self._backend_mode

    def _find_swipl_binary(self) -> str | None:
        """Localiza o binário `swipl` no PATH ou em caminhos padrão."""
        found = shutil.which("swipl")
        if found:
            return found
        win_default = Path(r"C:\Program Files\swipl\bin\swipl.exe")
        if win_default.is_file():
            return str(win_default)
        return None

    def _initialize_engine(self) -> None:
        """Inicializa o motor Prolog tentando PySwip e usando swipl CLI como fallback."""
        if not self._kb_path.is_file():
            raise PrologServiceError(
                f"Base de conhecimento Prolog não encontrada em: {self._kb_path}"
            )

        was_faulthandler_enabled = faulthandler.is_enabled()
        if was_faulthandler_enabled:
            faulthandler.disable()
        try:
            from pyswip import Prolog

            prolog = Prolog()
            prolog.consult(self._kb_path.as_posix())
            list(prolog.query("versao_vigente(_Versao)", maxresult=1))
            self._prolog = prolog
            self._backend_mode = "pyswip"
            logger.info("Motor Prolog inicializado via PySwip (%s).", self._kb_path)
            return
        except Exception as exc:  # pragma: no cover - depende da plataforma
            logger.warning(
                "PySwip indisponível neste ambiente (%s). Ativando fallback via swipl CLI.",
                exc,
            )
        finally:
            if was_faulthandler_enabled:
                faulthandler.enable()

        swipl_bin = self._find_swipl_binary()
        if not swipl_bin:
            raise PrologServiceError(
                "Nem PySwip nem o executável 'swipl' puderam ser inicializados."
            )

        self._swipl_bin = swipl_bin
        self._backend_mode = "swipl_cli"
        logger.info(
            "Motor Prolog inicializado via swipl CLI (%s) em %s.",
            self._swipl_bin,
            self._kb_path,
        )

    def _decode_json_output(self, raw: Any) -> dict[str, Any]:
        """Converte string ou bytes JSON retornados pelo Prolog em dict Python."""
        if isinstance(raw, bytes):
            text = raw.decode("utf-8")
        else:
            text = str(raw)
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError as exc:
            raise PrologExecutionError(
                f"Resposta JSON inválida do motor Prolog: {text!r}"
            ) from exc
        if not isinstance(parsed, dict):
            raise PrologExecutionError("Resposta do motor Prolog deve ser um objeto JSON.")
        return parsed

    def _run_json_goal(self, pyswip_goal: str, cli_goal: str) -> dict[str, Any]:
        """Executa predicado de serialização JSON de forma thread-safe."""
        with self._lock:
            if self._backend_mode == "pyswip" and self._prolog is not None:
                try:
                    results = list(self._prolog.query(pyswip_goal, maxresult=1))
                except Exception as exc:
                    raise PrologExecutionError(
                        f"Falha ao executar consulta PySwip: {exc}"
                    ) from exc
                if not results or "JsonStr" not in results[0]:
                    raise PrologExecutionError(
                        "O motor Prolog não retornou resultados para a consulta."
                    )
                return self._decode_json_output(results[0]["JsonStr"])

            if self._backend_mode == "swipl_cli" and self._swipl_bin:
                try:
                    completed = subprocess.run(
                        [
                            self._swipl_bin,
                            "-q",
                            "-f",
                            str(self._kb_path),
                            "-g",
                            cli_goal,
                            "-t",
                            "halt",
                        ],
                        capture_output=True,
                        text=True,
                        encoding="utf-8",
                        check=False,
                        timeout=15,
                    )
                except (OSError, subprocess.SubprocessError) as exc:
                    raise PrologExecutionError(
                        f"Falha ao invocar swipl CLI: {exc}"
                    ) from exc

                if completed.returncode != 0:
                    raise PrologExecutionError(
                        f"swipl CLI retornou erro ({completed.returncode}): "
                        f"{completed.stderr.strip()}"
                    )
                return self._decode_json_output(completed.stdout.strip())

            raise PrologServiceError("Motor Prolog não inicializado.")

    def obter_versao_regras(self) -> str:
        """Retorna a versão vigente declarada em versao_base_regras/1."""
        return self.listar_catalogo().versao_regras

    def listar_catalogo(self) -> CatalogoDiagnosticosResponse:
        """Consulta o catálogo completo de sintomas e diagnósticos no Prolog."""
        data = self._run_json_goal(
            pyswip_goal="catalogo_json(JsonStr)",
            cli_goal="imprimir_catalogo_json",
        )
        return CatalogoDiagnosticosResponse.model_validate(data)

    def listar_sintomas(self) -> list[SintomaCatalogItem]:
        """Retorna a lista completa de sintomas e perguntas complementares."""
        return self.listar_catalogo().sintomas

    def executar_diagnostico(
        self,
        sintomas: list[str],
        consulta_id: int = 0,
    ) -> dict[str, Any]:
        """Valida os sintomas contra a whitelist, consulta o Prolog e formata a saída."""
        validated = validate_symptom_list(sintomas, allow_empty=True)
        prolog_list = "[" + ",".join(validated) + "]"

        raw_result = self._run_json_goal(
            pyswip_goal=f"diagnosticar_json({prolog_list}, JsonStr)",
            cli_goal=f"imprimir_diagnostico_json({prolog_list})",
        )

        status_inferencia = raw_result.get("status_inferencia", "insuficiente")
        api_status = "diagnosticada" if status_inferencia == "diagnosticada" else "inconclusiva"

        payload = {
            "consulta_id": consulta_id,
            "status": api_status,
            "versao_regras": raw_result["versao_regras"],
            "aviso_hipotese": raw_result["aviso_hipotese"],
            "diagnosticos": raw_result.get("diagnosticos", []),
            "sintomas_complementares": raw_result.get("sintomas_complementares", []),
            "contradicoes": raw_result.get("contradicoes", []),
        }
        # Garante conformidade integral com o contrato DiagnosticoResponse
        validated_response = DiagnosticoResponse.model_validate(payload)
        return {
            **validated_response.model_dump(),
            "status_inferencia": status_inferencia,
        }

    def recarregar_base_conhecimento(self) -> dict[str, Any]:
        """Recarrega a base Prolog e atualiza a whitelist de sintomas (RF08)."""
        with self._lock:
            if self._backend_mode == "pyswip" and self._prolog is not None:
                self._prolog.consult(self._kb_path.as_posix())
            allowed = refresh_allowed_symptom_identifiers()
            catalogo = self.listar_catalogo()
            return {
                "versao_regras": catalogo.versao_regras,
                "total_sintomas": catalogo.total_sintomas,
                "total_diagnosticos": catalogo.total_diagnosticos,
                "whitelist_size": len(allowed),
                "backend_mode": self._backend_mode,
            }


_SERVICE_LOCK = threading.Lock()
_PROLOG_SERVICE_INSTANCE: PrologService | None = None


def get_prolog_service() -> PrologService:
    """Retorna instância singleton thread-safe do PrologService."""
    global _PROLOG_SERVICE_INSTANCE
    if _PROLOG_SERVICE_INSTANCE is None:
        with _SERVICE_LOCK:
            if _PROLOG_SERVICE_INSTANCE is None:
                _PROLOG_SERVICE_INSTANCE = PrologService()
    return _PROLOG_SERVICE_INSTANCE


def reset_prolog_service() -> None:
    """Reinicia a instância singleton em memória (útil para testes)."""
    global _PROLOG_SERVICE_INSTANCE
    with _SERVICE_LOCK:
        _PROLOG_SERVICE_INSTANCE = None
