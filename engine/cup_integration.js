/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/cup_integration.js – Integração da Copa do Brasil

   Este módulo intercepta funções chave do módulo League para
   sincronizar a Copa do Brasil com a temporada. Em vez de alterar
   diretamente o código da liga (facilitando manutenção), aqui
   criamos wrappers das funções startNewCareer() e
   playNextRoundForUserTeam() para iniciar a Copa e
   simular partidas até a data atual.
=======================================================*/

(function () {
  console.log('%c[CUP-INTEGRATION] cup_integration.js carregado', 'color:#be185d;');
  function waitForModules() {
    if (window.League && window.Cup) {
      integrate();
    } else {
      setTimeout(waitForModules, 50);
    }
  }
  function integrate() {
    try {
      const origStartNewCareer = League.startNewCareer;
      League.startNewCareer = function (teamId) {
        const result = origStartNewCareer ? origStartNewCareer.call(League, teamId) : null;
        try {
          if (typeof Cup.startNewCup === 'function') {
            Cup.startNewCup();
          }
        } catch (e) {
          console.warn('[CUP-INTEGRATION] Erro ao iniciar Copa na nova carreira:', e);
        }
        return result;
      };
      const origPlayNextRound = League.playNextRoundForUserTeam;
      League.playNextRoundForUserTeam = function () {
        try {
          const team = League.getCurrentTeam ? League.getCurrentTeam() : null;
          const division = team?.division || 'A';
          const round = League.getCurrentRound ? League.getCurrentRound(division) : 1;
          let dataAtual = null;
          if (window.Calendar && typeof Calendar.getCalendarioPorDivisao === 'function') {
            const calendario = Calendar.getCalendarioPorDivisao(division);
            if (calendario && calendario.length) {
              const idx = Math.max(round - 1, 0);
              const item = calendario[idx];
              dataAtual = item?.date;
            }
          }
          if (dataAtual) {
            Cup.simulateUntil(dataAtual);
          }
        } catch (e) {
          console.warn('[CUP-INTEGRATION] Erro ao simular Copa antes da rodada:', e);
        }
        const retorno = origPlayNextRound ? origPlayNextRound.call(League) : null;
        try {
          const team2 = League.getCurrentTeam ? League.getCurrentTeam() : null;
          const division2 = team2?.division || 'A';
          const round2 = League.getCurrentRound ? League.getCurrentRound(division2) : 1;
          let dataProx = null;
          if (window.Calendar && typeof Calendar.getCalendarioPorDivisao === 'function') {
            const calendario = Calendar.getCalendarioPorDivisao(division2);
            if (calendario && calendario.length) {
              const idx2 = Math.max(round2 - 2, 0);
              const item2 = calendario[idx2];
              dataProx = item2?.date;
            }
          }
          if (dataProx) {
            Cup.simulateUntil(dataProx);
          }
        } catch (e) {
          console.warn('[CUP-INTEGRATION] Erro ao simular Copa após a rodada:', e);
        }
        return retorno;
      };
    } catch (err) {
      console.warn('[CUP-INTEGRATION] Falha ao integrar com League:', err);
    }
  }
  waitForModules();
})();