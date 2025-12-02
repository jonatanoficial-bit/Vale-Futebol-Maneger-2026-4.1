/* ============================================================
   ENGINE – TÁTICAS
   Controla titulares, reservas, posições e substituições
   ============================================================ */

/**
 * Módulo de táticas responsável por escalar titulares, reservas e salvar
 * a formação atual.  Esta implementação adiciona lógica de fallback
 * para inicializar o elenco e os titulares a partir do banco de dados
 * quando ainda não existe gameState.elenco/titulares.  Também oferece
 * suporte a múltiplas formações e expõe métodos para atualizar a
 * formação e salvar a tática.
 */
window.Tactics = {
    /** Lista de formações predefinidas.  Cada formação é um array
     *  contendo objetos com a posição esperada e as coordenadas
     *  relativas (x,y) no campo tático.  Sinta‑se à vontade para
     *  adicionar novas formações aqui.  */
    FORMATIONS: {
        '4-3-3': [
            { pos: 'GOL', x: 50, y: 90 },
            { pos: 'LD',  x: 20, y: 75 },
            { pos: 'ZAG', x: 40, y: 70 },
            { pos: 'ZAG', x: 60, y: 70 },
            { pos: 'LE',  x: 80, y: 75 },
            { pos: 'VOL', x: 30, y: 55 },
            { pos: 'MEI', x: 50, y: 50 },
            { pos: 'MEI', x: 70, y: 55 },
            { pos: 'ATA', x: 25, y: 25 },
            { pos: 'ATA', x: 50, y: 20 },
            { pos: 'ATA', x: 75, y: 25 }
        ],
        '4-4-2': [
            { pos: 'GOL', x: 50, y: 90 },
            { pos: 'LD',  x: 20, y: 75 },
            { pos: 'ZAG', x: 40, y: 70 },
            { pos: 'ZAG', x: 60, y: 70 },
            { pos: 'LE',  x: 80, y: 75 },
            { pos: 'VOL', x: 25, y: 55 },
            { pos: 'MEI', x: 40, y: 50 },
            { pos: 'MEI', x: 60, y: 50 },
            { pos: 'VOL', x: 75, y: 55 },
            { pos: 'ATA', x: 40, y: 25 },
            { pos: 'ATA', x: 60, y: 25 }
        ],
        '3-5-2': [
            { pos: 'GOL', x: 50, y: 90 },
            { pos: 'ZAG', x: 30, y: 75 },
            { pos: 'ZAG', x: 50, y: 75 },
            { pos: 'ZAG', x: 70, y: 75 },
            { pos: 'VOL', x: 20, y: 55 },
            { pos: 'MEI', x: 35, y: 50 },
            { pos: 'MEI', x: 50, y: 45 },
            { pos: 'MEI', x: 65, y: 50 },
            { pos: 'VOL', x: 80, y: 55 },
            { pos: 'ATA', x: 40, y: 25 },
            { pos: 'ATA', x: 60, y: 25 }
        ],
        '4-5-1': [
            { pos: 'GOL', x: 50, y: 90 },
            { pos: 'LD',  x: 20, y: 75 },
            { pos: 'ZAG', x: 40, y: 70 },
            { pos: 'ZAG', x: 60, y: 70 },
            { pos: 'LE',  x: 80, y: 75 },
            { pos: 'VOL', x: 20, y: 55 },
            { pos: 'MEI', x: 35, y: 50 },
            { pos: 'MEI', x: 50, y: 45 },
            { pos: 'MEI', x: 65, y: 50 },
            { pos: 'VOL', x: 80, y: 55 },
            { pos: 'ATA', x: 50, y: 25 }
        ]
    },

    /**
     * Garante que o gameState tenha as propriedades elenco e titulares
     * devidamente preenchidas.  Se ainda não existir um elenco, ele
     * será carregado a partir do banco de dados com base no time
     * atualmente controlado (Game.teamId).  Os titulares são
     * gerados com base na formação atual (Game.formacao ou
     * '4-3-3' por padrão) e posicionam os jogadores em campo
     * utilizando a lista FORMATIONS.  */
    ensureElencoETitulares() {
        if (!window.gameState) window.gameState = {};
        const gs = window.gameState;
        // determina qual time usar
        const teamId = (window.Game && Game.teamId) || gs.currentTeamId || gs.controlledTeamId || null;
        if (!teamId) return;

        // monta elenco se ainda não existir ou se pertencer a outro time
        // Verifica também se o prefixo dos IDs dos jogadores atuais
        // corresponde ao teamId. Se não corresponder (por exemplo,
        // time anterior era FLA e agora é MIR), recarrega.
        let precisaRecarregarElenco = false;
        if (!Array.isArray(gs.elenco) || !gs.elenco.length) {
            precisaRecarregarElenco = true;
        } else if (gs.elenco && gs.elenco.length > 0) {
            const firstId = gs.elenco[0].id || '';
            const prefix = firstId.split('_')[0] || '';
            if (prefix !== teamId) {
                // jogador da lista não pertence ao time atual
                precisaRecarregarElenco = true;
            }
        }

        if (precisaRecarregarElenco) {
            let elenco = [];
            if (window.Database && typeof Database.carregarElencoDoTime === 'function') {
                const lista = Database.carregarElencoDoTime(teamId) || [];
                elenco = lista.map(p => {
                    const id = p.id;
                    const nome = p.name || p.nome || p.playerName || '';
                    const posicao = p.position || p.posicao || p.role || '';
                    const ovr = p.overall || p.ovr || p.rating || 70;
                    // somente o nome do arquivo de face (sem path)
                    const foto = `${p.id}.png`;
                    return { id, nome, posicao, ovr, foto };
                });
            }
            gs.elenco = elenco;
            // ao trocar de elenco, limpa titulares para forçar recalculo
            gs.titulares = [];
        }

        // monta titulares se não existir ou se estiver inconsistente
        if (!Array.isArray(gs.titulares) || gs.titulares.length !== 11) {
            const formacao = (window.Game && Game.formacao) || '4-3-3';
            const template = this.FORMATIONS[formacao] || this.FORMATIONS['4-3-3'];
            const elenco = gs.elenco || [];
            const used = new Set();
            const titulares = [];
            template.forEach(slot => {
                // procura jogador com a posição exata que ainda não foi utilizado
                let idx = elenco.findIndex((j, i) => !used.has(i) && j.posicao === slot.pos);
                // se não achar, pega o próximo disponível
                if (idx < 0) {
                    idx = elenco.findIndex((_, i) => !used.has(i));
                }
                if (idx >= 0) {
                    used.add(idx);
                    titulares.push({ id: elenco[idx].id, posicao: slot.pos, x: slot.x, y: slot.y });
                }
            });
            gs.titulares = titulares;
        }
    },

    /**
     * Retorna titulares formatados com todos os dados do jogador e
     * posições/coordenações para renderização no campo tático.  O
     * método chama ensureElencoETitulares() para garantir que as
     * estruturas estejam preenchidas antes de formatar os dados.  */
    formatTitulares() {
        this.ensureElencoETitulares();
        const gs = window.gameState;
        return gs.titulares.map(slot => {
            const jog = gs.elenco.find(j => j.id === slot.id);
            return {
                id: jog.id,
                nome: jog.nome,
                pos: jog.posicao,
                ovr: jog.ovr,
                foto: jog.foto,
                posicao: slot.posicao,
                x: slot.x,
                y: slot.y
            };
        });
    },

    /**
     * Retorna todos titulares + reservas em formato padronizado.  Os
     * reservas são definidos como todos os jogadores do elenco que
     * não estão entre os titulares atuais.  */
    getEscalacaoCompleta() {
        this.ensureElencoETitulares();
        const gs = window.gameState;
        const titularesFormatados = this.formatTitulares();
        // ids dos titulares
        const titularIds = new Set(gs.titulares.map(t => t.id));
        const reservas = gs.elenco.filter(j => !titularIds.has(j.id));
        return { titulares: titularesFormatados, reservas };
    },

    /**
     * Atualiza a formação atual e recalcula as posições dos titulares.
     * Se uma formação desconhecida for passada, ela será ignorada.
     */
    atualizarFormacao(novaFormacao) {
        if (!novaFormacao || !this.FORMATIONS[novaFormacao]) return;
        if (!window.Game) window.Game = {};
        Game.formacao = novaFormacao;
        // força regeneração dos titulares com a nova formação
        if (window.gameState && Array.isArray(window.gameState.titulares)) {
            // limpar titulares para forçar rebuild na próxima chamada
            window.gameState.titulares = [];
        }
        this.ensureElencoETitulares();
    },

    /**
     * Troca titular <-> reserva.  Atualiza a estrutura gameState.titulares
     * substituindo o jogador da posição informada pelo reserva selecionado.
     */
    trocar(reservaId, posicaoTitular) {
        this.ensureElencoETitulares();
        const gs = window.gameState;
        const reserva = gs.elenco.find(j => j.id === reservaId);
        const titularSlot = gs.titulares.find(t => t.posicao === posicaoTitular);
        if (!reserva || !titularSlot) return;
        titularSlot.id = reservaId;
    },

    /**
     * Salva a tática atual no armazenamento.  Tenta utilizar o
     * sistema de salvamento do jogo, mas se ele não estiver
     * disponível escreve diretamente no localStorage.  */
    salvarTatica() {
        // força garantia de estrutura antes de salvar
        this.ensureElencoETitulares();
        try {
            // preferencialmente usa salvarJogo() ou Save.salvar()
            if (typeof salvarJogo === 'function') {
                salvarJogo();
            } else if (window.Save && typeof Save.salvar === 'function') {
                Save.salvar();
            } else {
                // fallback: salva diretamente no localStorage
                const raw = JSON.stringify(window.gameState);
                localStorage.setItem('vfm-save', raw);
            }
            console.log('[Tactics] Tática salva com sucesso');
        } catch (e) {
            console.warn('[Tactics] Falha ao salvar tática:', e);
        }
    }
};
