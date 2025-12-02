/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/cup.js – Gestão da Copa do Brasil

   Esta implementação adiciona um torneio mata‑mata ao jogo base.
   A Copa do Brasil reúne todos os clubes das Séries A e B e os coloca
   em confrontos eliminatórios de ida e volta. As partidas são distribuídas
   ao longo da temporada, com datas definidas a partir de 1º de maio.
   Cada duelo possui dois jogos: a primeira partida e a segunda partida
   com mando de campo invertido. Ao final das duas partidas, o vencedor
   é decidido pelo número total de pontos e, em caso de igualdade,
   pelo saldo de gols. Persistindo o empate, a classificação é definida
   em disputa de pênaltis.

   O estado da Copa é armazenado em gameState.cup. O formato é o seguinte:
     gameState.cup = {
       year: 2026,
       rounds: [
         { matches: [ { homeId, awayId, legs: [ { date, goalsHome, goalsAway } ], winnerId } ] },
         ...
       ],
       schedule: [ { round, matchIndex, legIndex, date, played } ],
       currentRound: 0,
       finished: false,
       championTeamId: null
     }

   A cada chamada de League.playNextRoundForUserTeam() ou League.processarRodadaComJogoDoUsuario(),
   a função Cup.simulateUntil() deve ser chamada com a data corrente da
   temporada. Ela simula todas as partidas da Copa agendadas até essa data.
   Quando a competição termina, uma mensagem com troféu é exibida ao usuário.
   Para reiniciar a Copa no início de uma nova temporada, chame Cup.startNewCup().
=======================================================*/

(function () {
  console.log("%c[CUP] cup.js carregado", "color:#dc2626; font-weight:bold;");

  // Garante que gameState e o estado da Copa existam e retorna o estado
  function ensureCupState() {
    if (!window.gameState) window.gameState = {};
    if (!gameState.cup) {
      gameState.cup = {
        year: gameState.seasonYear || new Date().getFullYear(),
        rounds: [],
        schedule: [],
        currentRound: 0,
        finished: false,
        championTeamId: null,
      };
    }
    return gameState.cup;
  }

  // Embaralha uma array in-place (Fisher–Yates)
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Calcula a força de um time como média dos 11 melhores jogadores
  function teamStrength(teamId) {
    try {
      const elenco = (window.Database?.players || players).filter(
        (p) => p.teamId === teamId
      );
      if (!elenco || !elenco.length) return 70;
      const ordenado = [...elenco].sort(
        (a, b) => (b.overall || 70) - (a.overall || 70)
      );
      const titulares = ordenado.slice(0, 11);
      const soma = titulares.reduce(
        (acc, p) => acc + (p.overall || 70),
        0
      );
      return soma / titulares.length;
    } catch (e) {
      console.warn('[CUP] teamStrength erro:', e);
      return 70;
    }
  }

  // Gera gols aleatórios com base em média
  function randGoals(base) {
    const r = Math.random();
    let g = 0;
    if (r < 0.2) g = 0;
    else if (r < 0.5) g = 1;
    else if (r < 0.75) g = 2;
    else if (r < 0.93) g = 3;
    else g = 4;
    if (base > 2.3 && Math.random() < 0.35) g += 1;
    if (base < 1.0 && Math.random() < 0.4 && g > 0) g -= 1;
    if (g < 0) g = 0;
    return g;
  }

  // Simula uma perna da partida (ida ou volta)
  function simulateLeg(homeId, awayId) {
    const strH = teamStrength(homeId);
    const strA = teamStrength(awayId);
    const diff = (strH - strA) / 10;
    const base = 1.6;
    const baseH = Math.max(0.5, base + diff * 0.7);
    const baseA = Math.max(0.5, base - diff * 0.7);
    const gH = randGoals(baseH);
    const gA = randGoals(baseA);
    return { goalsHome: gH, goalsAway: gA };
  }

  // Cria o bracket inicial da Copa e agenda partidas
  function startNewCup() {
    const cup = ensureCupState();
    cup.year = gameState.seasonYear || new Date().getFullYear();
    cup.rounds = [];
    cup.schedule = [];
    cup.currentRound = 0;
    cup.finished = false;
    cup.championTeamId = null;
    const list = (window.Database?.teams || teams).map((t) => t.id);
    const participants = shuffle([...list]);
    let roundParticipants = participants;
    const schedule = [];
    const rounds = [];
    let baseDate = new Date(cup.year, 4, 1);
    const intervalBetweenRounds = 14;
    let roundIndex = 0;
    while (roundParticipants.length > 1) {
      const matches = [];
      const nextParticipants = [];
      const dataIda = new Date(baseDate.getTime());
      const dataVolta = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      for (let i = 0; i < roundParticipants.length; i += 2) {
        const home = roundParticipants[i];
        const away = roundParticipants[i + 1];
        if (!away) {
          matches.push({ type: 'bye', homeId: home, winnerId: home });
          nextParticipants.push(home);
        } else {
          const match = {
            homeId: home,
            awayId: away,
            legs: [
              { homeId: home, awayId: away, goalsHome: null, goalsAway: null, date: dataIda.toISOString().slice(0, 10), played: false },
              { homeId: away, awayId: home, goalsHome: null, goalsAway: null, date: dataVolta.toISOString().slice(0, 10), played: false }
            ],
            winnerId: null
          };
          matches.push(match);
          nextParticipants.push(null);
        }
      }
      rounds.push({ matches });
      matches.forEach((m, matchIndex) => {
        if (m.type !== 'bye') {
          m.legs.forEach((leg, legIndex) => {
            schedule.push({ round: roundIndex, matchIndex, legIndex, date: leg.date, played: false });
          });
        }
      });
      baseDate = new Date(baseDate.getTime() + intervalBetweenRounds * 24 * 60 * 60 * 1000);
      roundParticipants = nextParticipants;
      roundIndex++;
    }
    cup.rounds = rounds;
    cup.schedule = schedule;
    cup.currentRound = 0;
    try {
      if (typeof League?.saveGameState === 'function') {
        League.saveGameState();
      }
    } catch (e) {
      console.warn('[CUP] Não foi possível salvar estado após startNewCup:', e);
    }
    return cup;
  }

  // Simula confrontos até a data informada e define campeão quando acabar
  function simulateUntil(dateIso) {
    const cup = ensureCupState();
    if (cup.finished) return;
    if (!dateIso) return;
    const currentTime = new Date(dateIso).getTime();
    for (const item of cup.schedule) {
      if (item.played) continue;
      const matchDate = new Date(item.date).getTime();
      if (matchDate > currentTime) continue;
      const rnd = cup.rounds[item.round];
      if (!rnd) continue;
      const m = rnd.matches[item.matchIndex];
      if (!m || m.type === 'bye') {
        item.played = true;
        continue;
      }
      const leg = m.legs[item.legIndex];
      if (!leg || leg.played) {
        item.played = true;
        continue;
      }
      const res = simulateLeg(leg.homeId, leg.awayId);
      leg.goalsHome = res.goalsHome;
      leg.goalsAway = res.goalsAway;
      leg.played = true;
      item.played = true;
      if (m.legs.every((l) => l.played)) {
        let ptsHome = 0;
        let ptsAway = 0;
        let golsHomeTotal = 0;
        let golsAwayTotal = 0;
        m.legs.forEach((l) => {
          if (l.homeId === m.homeId) {
            golsHomeTotal += l.goalsHome;
            golsAwayTotal += l.goalsAway;
          } else {
            golsHomeTotal += l.goalsAway;
            golsAwayTotal += l.goalsHome;
          }
          if (l.goalsHome > l.goalsAway) {
            const vencedorId = l.homeId;
            if (vencedorId === m.homeId) ptsHome += 3;
            else ptsAway += 3;
          } else if (l.goalsHome < l.goalsAway) {
            const vencedorId = l.awayId;
            if (vencedorId === m.homeId) ptsHome += 3;
            else ptsAway += 3;
          } else {
            ptsHome += 1;
            ptsAway += 1;
          }
        });
        let winnerId = null;
        if (ptsHome > ptsAway) {
          winnerId = m.homeId;
        } else if (ptsHome < ptsAway) {
          winnerId = m.awayId;
        } else {
          if (golsHomeTotal > golsAwayTotal) {
            winnerId = m.homeId;
          } else if (golsHomeTotal < golsAwayTotal) {
            winnerId = m.awayId;
          } else {
            winnerId = Math.random() < 0.5 ? m.homeId : m.awayId;
          }
        }
        m.winnerId = winnerId;
        const nextRound = cup.rounds[item.round + 1];
        if (nextRound) {
          const idx = rnd.matches.findIndex((mm) => mm === m);
          let offset = 0;
          for (let k = 0; k < rnd.matches.length; k++) {
            if (rnd.matches[k] === m) break;
            offset++;
          }
          const nextMatch = nextRound.matches[Math.floor(offset / 2)];
          if (nextMatch) {
            const pos = offset % 2;
            if (nextMatch.type !== 'bye') {
              if (pos === 0) {
                nextMatch.homeId = winnerId;
                if (nextMatch.legs && nextMatch.legs.length === 2) {
                  nextMatch.legs[0].homeId = winnerId;
                  nextMatch.legs[1].awayId = winnerId;
                }
              } else {
                nextMatch.awayId = winnerId;
                if (nextMatch.legs && nextMatch.legs.length === 2) {
                  nextMatch.legs[0].awayId = winnerId;
                  nextMatch.legs[1].homeId = winnerId;
                }
              }
            }
          }
        } else {
          cup.finished = true;
          cup.championTeamId = winnerId;
          const premio = 8;
          try {
            if (window.gameState && winnerId) {
              if (gameState.currentTeamId === winnerId) {
                if (gameState.balance != null) gameState.balance += premio;
                if (window.Game) Game.saldo = +(Game.saldo + premio).toFixed(1);
              }
            }
          } catch (e) {
            console.warn('[CUP] Erro ao conceder prêmio ao campeão:', e);
          }
          let championName = winnerId;
          const t = (window.Database?.teams || teams).find((tt) => tt.id === winnerId);
          if (t && t.name) championName = t.name;
          const titulo = `Copa do Brasil ${cup.year}`;
          const mensagem = `O campeão da Copa do Brasil ${cup.year} é ${championName}! Parabéns!`;
          setTimeout(() => {
            if (window.UI && typeof UI.showChampionModal === 'function') {
              UI.showChampionModal(titulo, mensagem, 'assets/geral/trophy_copa_do_brasil.png');
            } else {
              alert(mensagem);
            }
          }, 300);
        }
      }
    }
    try {
      if (typeof League?.saveGameState === 'function') {
        League.saveGameState();
      }
    } catch (e) {
      console.warn('[CUP] Erro ao salvar após simulateUntil:', e);
    }
  }

  // Expondo API global
  window.Cup = {
    ensureCupState,
    startNewCup,
    simulateUntil,
  };
})();