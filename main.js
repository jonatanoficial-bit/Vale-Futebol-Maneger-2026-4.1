/* =======================================================
   VALE FUTEBOL MANAGER 2026
   main.js — Inicialização do jogo e navegação de telas
   Versão revisada – 100% funcional
   =======================================================*/

console.log(
  "%c[MAIN] Vale Futebol Manager 2026 carregado",
  "color:#C7A029; font-size:16px; font-weight:bold"
);

/* =======================================================
   FUNÇÃO GLOBAL DE TROCA DE TELAS
   =======================================================*/
function mostrarTela(id) {
  document.querySelectorAll(".tela").forEach((t) => {
    t.classList.remove("ativa");
  });

  const alvo = document.getElementById(id);
  if (alvo) {
    alvo.classList.add("ativa");
  } else {
    console.error("[MAIN] Tela não encontrada:", id);
  }
}

/* =======================================================
   ESTADO GLOBAL SIMPLES (apenas info básica)
   =======================================================*/
window.Game = {
  coachName: "",
  teamId: "",
  rodada: 1,
  saldo: 10,
  formacao: "4-3-3",
  estilo: "equilibrado",
  /**
   * Callback chamado quando o elenco do usuário for modificado
   * via contratações ou vendas.  Este método mantém a
   * estrutura `gameState.elenco` (usada pela engine de
   * táticas) sincronizada com os jogadores cadastrados em
   * `Database.players` e a propriedade `Game.teamId`.
   *
   * Ele converte os objetos de jogador completos do banco de
   * dados em uma forma simplificada compatível com
   * `Tactics.ensureElencoETitulares()` – contendo as
   * propriedades `id`, `nome`, `posicao`, `ovr` e `foto`.  O
   * campo `foto` utiliza somente o nome do arquivo da face para
   * manter compatibilidade com o carregamento das imagens.  Após
   * reconstruir a lista, a função zera a lista de titulares para
   * que seja recalculada na próxima abertura da tela de táticas.
   */
  onElencoAtualizado: function () {
    try {
      if (!window.gameState) return;
      const teamId = this.teamId;
      if (!teamId) return;
      // obtém todos jogadores do banco cuja teamId corresponda ao time do usuário
      const fonte = (window.Database && Array.isArray(Database.players)) ? Database.players : (typeof players !== 'undefined' ? players : []);
      const elencoAtual = fonte.filter(p => p.teamId === teamId);
      const elencoSimplificado = elencoAtual.map(p => {
        // nome do jogador
        const nome = p.name || p.nome || p.playerName || 'Jogador';
        // posição principal
        const posicao = (p.position || p.posicao || p.role || '').toUpperCase();
        // overall / rating
        const ovr = p.overall != null ? p.overall : (p.ovr != null ? p.ovr : (p.rating != null ? p.rating : 70));
        // extrai apenas o nome do arquivo de face (sem caminho)
        let foto = '';
        if (p.face) {
          const parts = p.face.split('/');
          foto = parts[parts.length - 1];
        } else if (p.id) {
          foto = `${p.id}.png`;
        }
        return { id: p.id, nome, posicao, ovr, foto };
      });
      // atualiza gameState.elenco e zera titulares para forçar recalculo
      window.gameState.elenco = elencoSimplificado;
      // limpa lista de titulares para que seja reconstruída com nova formação
      if (Array.isArray(window.gameState.titulares)) {
        window.gameState.titulares = [];
      }
    } catch (e) {
      console.warn('[Game] Falha ao atualizar elenco após compra/venda:', e);
    }
  }
};

/* =======================================================
   INICIALIZAÇÃO
   =======================================================*/
window.addEventListener("load", () => {
  console.log("[MAIN] window.load -> iniciar configuração de botões");

  const btnContinuar = document.getElementById("btn-continuar");
  if (btnContinuar) {
    // esconde por padrão
    btnContinuar.style.display = "none";
  }

  // se houver save, mostra botão CONTINUAR
  if (window.Save && typeof Save.carregar === "function") {
    const save = Save.carregar(true); // modo "somente verificar", se existir na sua save.js
    if (save) {
      console.log("[MAIN] Save encontrado, exibindo CONTINUAR CARREIRA");
      if (btnContinuar) btnContinuar.style.display = "block";
    }
  }

  configurarBotoes();
});

/* =======================================================
   CONFIGURAÇÃO DOS BOTÕES DA CAPA
   =======================================================*/
function configurarBotoes() {
  const btnIniciar = document.getElementById("btn-iniciar");
  const btnContinuar = document.getElementById("btn-continuar");
  const btnCarregarJSON = document.getElementById("btn-carregar-json");
  const inputSaveJSON = document.getElementById("input-save-json");

  if (btnIniciar) {
    btnIniciar.onclick = () => {
      console.log("[MAIN] Nova carreira…");

      // limpa save antigo, se existir
      if (window.Save && typeof Save.novoJogo === "function") {
        Save.novoJogo();
      }

      // vai para escolha de time
      mostrarTela("tela-escolha-time");

      // preenche lista de times (fallback)
      if (typeof preencherListaTimesBasico === "function") {
        setTimeout(preencherListaTimesBasico, 50);
      } else {
        console.warn(
          "[MAIN] preencherListaTimesBasico() não definido – ver ui/ui.js"
        );
      }
    };
  }

  if (btnContinuar) {
    btnContinuar.onclick = () => {
      console.log("[MAIN] Continuar carreira…");

      if (window.Save && typeof Save.carregar === "function") {
        Save.carregar();
      }

      carregarLobby();
      mostrarTela("tela-lobby");
    };
  }

  // Botão para carregar carreira via arquivo JSON
  if (btnCarregarJSON && inputSaveJSON) {
    btnCarregarJSON.onclick = () => {
      inputSaveJSON.value = "";
      inputSaveJSON.click();
    };

    inputSaveJSON.onchange = (ev) => {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;

      if (window.Save && typeof Save.importarDeArquivo === "function") {
        Save.importarDeArquivo(
          file,
          () => {
            alert("Carreira carregada com sucesso!");
            carregarLobby();
            mostrarTela("tela-lobby");
          },
          (err) => {
            console.error("[MAIN] Erro ao importar save JSON:", err);
            alert(
              "Não foi possível carregar o arquivo de carreira. " +
                "Verifique se ele foi gerado pelo próprio jogo."
            );
          }
        );
      } else {
        alert("Sistema de salvamento não está disponível.");
      }
    };
  }
}

/* =======================================================
   SELEÇÃO DE TIME (usado pelo grid de escudos)
   =======================================================*/
function selecionarTimeBasico(teamId) {
  console.log("[MAIN] Time selecionado:", teamId);

  const nome = prompt("Nome do treinador:", "Técnico") || "Técnico";

  Game.teamId = teamId;
  Game.coachName = nome;

  if (typeof resetGameStateForNewCareer === "function") {
    resetGameStateForNewCareer(teamId, nome);
  }

  carregarLobby();
  mostrarTela("tela-lobby");

  if (window.Save && typeof Save.salvar === "function") {
    Save.salvar();
  }
}

/* =======================================================
   PREENCHER LISTA DE TIMES (FALLBACK)
   =======================================================*/
function preencherListaTimesBasico() {
  console.log("[MAIN] preenchendo lista de times (fallback)…");

  const container = document.getElementById("lista-times");
  if (!container) {
    console.error("[MAIN] #lista-times não encontrado.");
    return;
  }

  const fonteTeams =
    (window.Database && Database.teams) ||
    window.teams ||
    [];

  if (!fonteTeams.length) {
    console.error("[MAIN] Nenhum time encontrado no Database.teams");
    container.innerHTML = "<p>Nenhum time cadastrado.</p>";
    return;
  }

  container.innerHTML = "";

  fonteTeams.forEach((team) => {
    const card = document.createElement("button");
    card.className = "time-card";
    card.innerHTML = `
      <img class="time-card-logo" src="assets/logos/${team.id}.png" alt="${team.name}">
      <span class="time-card-nome">${team.name}</span>
    `;
    card.onclick = () => selecionarTimeBasico(team.id);
    container.appendChild(card);
  });
}

/* =======================================================
   ATUALIZAÇÃO DO LOBBY
   =======================================================*/
function carregarLobby() {
  console.log("[MAIN] carregarLobby()");

  const gs = window.gameState || {}; // definido em save.js

  if (!gs.selectedTeamId && !Game.teamId) {
    console.warn("[MAIN] Nenhum time selecionado para o lobby.");
    return;
  }

  const teamId = gs.selectedTeamId || Game.teamId;
  const team = getTeamById(teamId);

  if (!team) {
    console.error("[MAIN] Time inválido no lobby:", teamId);
    return;
  }

  Game.teamId = teamId;

  const lobbyNome = document.getElementById("lobby-nome-time");
  const lobbySaldo = document.getElementById("lobby-saldo");
  const lobbyTemp = document.getElementById("lobby-temporada");
  const lobbyLogo = document.getElementById("lobby-logo");

  if (lobbyNome) lobbyNome.textContent = team.name;
  if (lobbySaldo)
    lobbySaldo.textContent = "Saldo: " + (gs.balance ?? Game.saldo) + " mi";
  if (lobbyTemp)
    lobbyTemp.textContent = "Temporada: " + (gs.seasonYear ?? 2025);

  if (lobbyLogo) {
    lobbyLogo.src = `assets/logos/${team.id}.png`;
    lobbyLogo.alt = team.name;
    lobbyLogo.onerror = () => {
      console.warn("[MAIN] Escudo não encontrado para:", team.id);
      lobbyLogo.style.display = "none";
    };
  }
}

/* =======================================================
   NAVEGAÇÃO CENTRALIZADA (SOBRESCREVE UI ANTIGO)
   =======================================================*/
window.UI = Object.assign(window.UI || {}, {
  // -------- Telas básicas --------
  voltarParaCapa() {
    console.log("[UI] voltarParaCapa()");
    mostrarTela("tela-capa");
  },

  voltarLobby() {
    console.log("[UI] voltarLobby()");
    carregarLobby();
    mostrarTela("tela-lobby");
  },

  // -------- Jogo / Partida --------
  abrirProximoJogo() {
    console.log("[UI] abrirProximoJogo()");
    if (window.League && typeof League.prepararProximoJogo === "function") {
      League.prepararProximoJogo();
    }
    mostrarTela("tela-partida");
  },

  // -------- Tabelas --------
  abrirClassificacao() {
    console.log("[UI] abrirClassificacao()");
    if (window.LeagueUI && typeof LeagueUI.renderStandings === "function") {
      LeagueUI.renderStandings();
    }
    mostrarTela("tela-classificacao");
  },

  // -------- Elenco --------
  abrirElenco() {
    console.log("[UI] abrirElenco()");
    if (window.TeamUI && typeof TeamUI.renderSquad === "function") {
      TeamUI.renderSquad();
    }
    mostrarTela("tela-elenco");
  },

  // -------- Mercado --------
  abrirMercado() {
    console.log("[UI] abrirMercado()");
    if (window.MarketUI && typeof MarketUI.render === "function") {
      MarketUI.render();
    }
    mostrarTela("tela-mercado");
  },

  // -------- Táticas --------
  abrirTaticas() {
    console.log("[UI] abrirTaticas()");
    if (window.TacticsUI && typeof TacticsUI.render === "function") {
      TacticsUI.render();
    }
    mostrarTela("tela-taticas");
  },

  // -------- Calendário --------
  abrirCalendario() {
    console.log("[UI] abrirCalendario()");
    if (window.CalendarUI && typeof CalendarUI.renderSeason === "function") {
      CalendarUI.renderSeason();
    }
    mostrarTela("tela-calendario");
  },

  // -------- Salvamento manual --------
  salvarCarreira() {
    console.log("[UI] salvarCarreira()");
    if (window.Save && typeof Save.exportarJSON === "function") {
      Save.exportarJSON();
    } else if (typeof salvarJogo === "function") {
      salvarJogo();
      alert("Carreira salva no navegador.");
    } else {
      alert("Sistema de salvamento não está disponível.");
    }
  },
});

console.log("[MAIN] Navegação UI sobrescrita com sucesso.");
