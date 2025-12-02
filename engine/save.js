/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/save.js – Sistema de salvamento (LocalStorage + JSON)
   =======================================================*/

const SAVE_KEY = "vfm2026-save";      // chave principal do save completo
const SAVE_VERSION = 1;               // versão do formato de save
const GAMESTATE_KEY = "vfm-save";     // chave usada por game.js para gameState

// -------------------------------------------------------
// Monta objeto de save completo (metadados + gameState)
// -------------------------------------------------------
function buildSaveObject() {
  try {
    const meta = Object.assign({}, window.Game || {});
    let gameStateData = null;

    try {
      const raw = localStorage.getItem(GAMESTATE_KEY);
      if (raw) {
        gameStateData = JSON.parse(raw);
      }
    } catch (e) {
      console.error("[SAVE] Erro lendo gameState do LocalStorage:", e);
    }

    return {
      version: SAVE_VERSION,
      meta,
      gameState: gameStateData,
      savedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.error("[SAVE] Erro ao montar objeto de save:", e);
    return null;
  }
}

/* =======================================================
   Salvar jogo (LocalStorage)
   =======================================================*/
function salvarJogo() {
  try {
    const objeto = buildSaveObject();
    if (!objeto) return;

    const dados = JSON.stringify(objeto);
    localStorage.setItem(SAVE_KEY, dados);
    console.log("%c[SAVE] Jogo salvo no navegador.", "color:#0EA5E9");
  } catch (e) {
    console.error("Erro ao salvar jogo:", e);
  }
}

/* =======================================================
   Carregar jogo (a partir do LocalStorage)
   checkOnly = true => apenas verifica se existe save
   =======================================================*/
function carregarJogo(checkOnly) {
  try {
    const dados = localStorage.getItem(SAVE_KEY);
    if (!dados) {
      if (!checkOnly) {
        console.warn("[LOAD] Nenhum save encontrado em", SAVE_KEY);
      }
      return false;
    }

    const obj = JSON.parse(dados);

    // Verificação simples de versão
    if (obj.version && obj.version !== SAVE_VERSION) {
      console.warn("[LOAD] Versão de save diferente. Esperado:", SAVE_VERSION, "Encontrado:", obj.version);
      // ainda assim tenta carregar campos básicos se existirem
    }

    if (checkOnly) {
      return true;
    }

    // Restaura meta (Game)
    if (obj.meta && typeof window.Game === "object") {
      Object.assign(window.Game, obj.meta);
    }

    // Restaura gameState (se existir)
    if (obj.gameState) {
      try {
        // Regrava o gameState bruto na chave que game.js usa
        localStorage.setItem(GAMESTATE_KEY, JSON.stringify(obj.gameState));

        // Se existir a função loadGameState em game.js, use-a
        if (typeof loadGameState === "function") {
          const loaded = loadGameState();
          // opcional: sincroniza alguns campos principais com Game
          if (loaded && typeof window.Game === "object") {
            if (loaded.controlledTeamId && !window.Game.teamId) {
              window.Game.teamId = loaded.controlledTeamId;
            }
            if (loaded.coachName && !window.Game.coachName) {
              window.Game.coachName = loaded.coachName;
            }
            if (typeof loaded.balance === "number") {
              window.Game.saldo = loaded.balance;
            }
          }
        } else {
          // fallback: expõe em window.gameState diretamente
          window.gameState = obj.gameState;
        }
      } catch (e) {
        console.error("[LOAD] Erro ao restaurar gameState:", e);
      }
    }

    console.log("%c[LOAD] Jogo carregado do navegador.", "color:#14b814");
    return true;
  } catch (e) {
    console.error("Erro ao carregar jogo:", e);
    return false;
  }
}

/* =======================================================
   Exportar save como arquivo JSON para download
   =======================================================*/
function exportarSaveComoJSON() {
  try {
    const objeto = buildSaveObject();
    if (!objeto) {
      alert("Não foi possível montar os dados de save.");
      return;
    }

    const jsonStr = JSON.stringify(objeto, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "vale-futebol-manager-2026-save.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("%c[SAVE] Arquivo JSON de save gerado.", "color:#0EA5E9");
  } catch (e) {
    console.error("Erro ao exportar save para JSON:", e);
    alert("Erro ao exportar save para JSON.");
  }
}

/* =======================================================
   Importar save a partir de um arquivo JSON (upload)
   =======================================================*/
function importarSaveDeArquivo(file, onSuccess, onError) {
  if (!file) {
    if (onError) onError(new Error("Nenhum arquivo selecionado."));
    return;
  }

  const reader = new FileReader();

  reader.onload = (ev) => {
    try {
      const texto = ev.target.result;
      const obj = JSON.parse(texto);

      if (!obj || typeof obj !== "object") {
        throw new Error("Arquivo JSON inválido.");
      }

      if (obj.version && obj.version !== SAVE_VERSION) {
        console.warn(
          "[LOAD] Versão de save diferente. Esperado:",
          SAVE_VERSION,
          "Encontrado:",
          obj.version
        );
      }

      // Restaura meta
      if (obj.meta && typeof window.Game === "object") {
        Object.assign(window.Game, obj.meta);
      }

      // Restaura gameState se existir
      if (obj.gameState) {
        try {
          localStorage.setItem(GAMESTATE_KEY, JSON.stringify(obj.gameState));
          if (typeof loadGameState === "function") {
            loadGameState();
          } else {
            window.gameState = obj.gameState;
          }
        } catch (e) {
          console.error("[LOAD] Erro ao restaurar gameState a partir do arquivo:", e);
        }
      }

      // Regrava o save completo na chave principal também
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(obj));
      } catch (e) {
        console.error("[LOAD] Erro ao gravar save importado no LocalStorage:", e);
      }

      console.log("%c[LOAD] Save importado com sucesso a partir de arquivo JSON.", "color:#14b814");
      if (onSuccess) onSuccess();
    } catch (e) {
      console.error("Erro ao importar save JSON:", e);
      if (onError) onError(e);
    }
  };

  reader.onerror = () => {
    const err = reader.error || new Error("Erro ao ler arquivo de save.");
    console.error(err);
    if (onError) onError(err);
  };

  reader.readAsText(file, "utf-8");
}

/* =======================================================
   Resetar e iniciar nova carreira (apenas meta simples)
   =======================================================*/
function novaCarreira(timeId) {
  window.Game = window.Game || {};
  Game.teamId = timeId;
  Game.rodada = 1;
  Game.saldo = 50;
  Game.formacao = "4-3-3";
  Game.estilo = "equilibrado";

  Game.titulares = {};
  Game.reservas = [];
  if (typeof carregarElencoDoTime === "function") {
    Game.elenco = carregarElencoDoTime(timeId);
  }

  salvarJogo();
}

/* =======================================================
   Apagar save (LocalStorage)
   =======================================================*/
function deletarCarreira() {
  localStorage.removeItem(SAVE_KEY);
  console.warn("%c[SAVE] Carreira apagada.", "color:#ff3333");
}

/* =======================================================
   NAMESPACE GLOBAL Save – API usada pelo main.js
   =======================================================*/
window.Save = {
  /**
   * Salva imediatamente a carreira atual no LocalStorage principal.
   */
  salvar() {
    salvarJogo();
  },

  /**
   * Carrega do LocalStorage.
   * @param {boolean} checkOnly - se true, apenas verifica existência.
   * @returns {boolean} true se há save (ou foi carregado), false caso contrário.
   */
  carregar(checkOnly) {
    return carregarJogo(checkOnly);
  },

  /**
   * Exporta o save atual para um arquivo JSON baixável.
   */
  exportarJSON() {
    exportarSaveComoJSON();
  },

  /**
   * Importa um save a partir de um File (input type="file").
   */
  importarDeArquivo(file, onSuccess, onError) {
    importarSaveDeArquivo(file, onSuccess, onError);
  },

  /**
   * Deleta a carreira atual (apenas do navegador).
   */
  deletar() {
    deletarCarreira();
    try {
      localStorage.removeItem(GAMESTATE_KEY);
    } catch (e) {
      console.warn("[SAVE] Erro ao remover gameState ao deletar carreira:", e);
    }
  },

  /**
   * Inicia um "novo jogo": apaga qualquer save anterior (meta + gameState).
   * Usado pelo botão INICIAR CARREIRA na capa.
   */
  novoJogo() {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(GAMESTATE_KEY);
      console.log("[SAVE] Novo jogo iniciado, saves antigos apagados.");
    } catch (e) {
      console.error("[SAVE] Erro ao limpar dados para novo jogo:", e);
    }
  },
};
