/* ============================================================
   TACTICS UI – Vale Futebol Manager 2026
   Controle da tela de TÁTICAS, campo e banco de reservas
   ============================================================ */

let reservaSelecionadaId = null;

/* ============================================================
   INICIALIZAÇÃO DA TELA
   ============================================================ */
window.TacticsUI = {
    init() {
        // Botão para voltar ao lobby
        const btnVoltar = document.getElementById("btn-voltar-lobby");
        if (btnVoltar) {
            btnVoltar.onclick = () => mostrarTela("tela-lobby");
        }

        // Botão para salvar tática
        const btnSalvar = document.getElementById("btn-salvar-tatica");
        if (btnSalvar) {
            btnSalvar.onclick = () => {
                if (typeof Tactics.salvarTatica === "function") {
                    Tactics.salvarTatica();
                    alert("Tática salva!");
                }
            };
        }

        // Configura seletor de formações
        const selFormacao = document.getElementById("select-formacao");
        if (selFormacao) {
            // Preenche opções somente se ainda não houver nenhuma
            if (!selFormacao.options || selFormacao.options.length === 0) {
                const forms = Tactics.FORMATIONS || {};
                Object.keys(forms).forEach(key => {
                    const opt = document.createElement('option');
                    opt.value = key;
                    opt.textContent = key;
                    selFormacao.appendChild(opt);
                });
            }
            // Seleciona a formação atual
            if (window.Game && Game.formacao) {
                selFormacao.value = Game.formacao;
            }
            // Atualiza quando mudar
            selFormacao.onchange = () => {
                const nova = selFormacao.value;
                if (typeof Tactics.atualizarFormacao === 'function') {
                    Tactics.atualizarFormacao(nova);
                    // Atualiza explicitamente o valor do select para
                    // refletir a nova formação. Caso contrário o
                    // elemento <select> pode continuar mostrando a
                    // formação antiga, confundindo o usuário.
                    selFormacao.value = nova;
                    this.renderPainel();
                }
            };
        }

        // Configura seletor de estilo de jogo (ofensivo/equilibrado/defensivo)
        const selEstilo = document.getElementById("select-estilo");
        if (selEstilo) {
            // Define valor inicial
            if (window.Game && Game.estilo) {
                selEstilo.value = Game.estilo;
            }
            selEstilo.onchange = () => {
                if (window.Game) {
                    Game.estilo = selEstilo.value;
                }
            };
        }

        this.renderPainel();
    },

    /* ========================================================
       Atualiza o campo e reservas
       ======================================================== */
    renderPainel() {
        if (!window.Tactics || typeof Tactics.getEscalacaoCompleta !== "function") {
            console.error("Engine Tactics não encontrada.");
            return;
        }

        const dados = Tactics.getEscalacaoCompleta();
        renderCampoTatico(dados.titulares);
        renderReservas(dados.reservas);
    }
    ,
    /**
     * Método genérico de renderização chamado pela UI principal.
     * Apenas aciona o init(), que configura os botões e redesenha
     * o painel tático se necessário.
     */
    render() {
        this.init();
    }
};

/* ============================================================
   DESENHA O CAMPO E OS 11 TITULARES
   ============================================================ */
function renderCampoTatico(titulares) {
    const campoEl = document.getElementById("campo-tatico");
    if (!campoEl) return;

    campoEl.innerHTML = "";

    titulares.forEach(slot => {
        const slotEl = document.createElement("div");
        slotEl.className = "slot-jogador";
        slotEl.style.left = slot.x + "%";
        slotEl.style.top = slot.y + "%";

        const card = document.createElement("div");
        card.className = "slot-card";
        card.dataset.posicao = slot.posicao;
        card.dataset.playerId = slot.id;

        // Foto
        const img = document.createElement("img");
        img.src = `assets/face/${slot.foto}`;
        img.alt = slot.nome;
        img.onerror = () => img.style.display = "none";
        card.appendChild(img);

        // Nome
        const nomeDiv = document.createElement("div");
        nomeDiv.className = "slot-nome";
        nomeDiv.textContent = slot.nome;
        card.appendChild(nomeDiv);

        // Posição e OVR
        const infoDiv = document.createElement("div");
        infoDiv.className = "slot-info";
        infoDiv.textContent = `${slot.pos} · OVR ${slot.ovr}`;
        card.appendChild(infoDiv);

        // CLICAR NO TITULAR → troca com reserva
        card.addEventListener("click", () => {
            if (!reservaSelecionadaId) return;

            Tactics.trocar(reservaSelecionadaId, slot.posicao);
            reservaSelecionadaId = null;

            TacticsUI.renderPainel();
        });

        slotEl.appendChild(card);
        campoEl.appendChild(slotEl);
    });
}

/* ============================================================
   RENDERIZA O BANCO DE RESERVAS
   ============================================================ */
function renderReservas(reservas) {
    const lista = document.getElementById("banco-reservas");
    if (!lista) return;

    lista.innerHTML = "";

    reservas.forEach(jog => {
        const card = document.createElement("div");
        card.className = "reserva-card";
        card.dataset.playerId = jog.id;

        // Foto
        const img = document.createElement("img");
        img.src = `assets/face/${jog.foto}`;
        img.alt = jog.nome;
        img.onerror = () => img.style.display = "none";
        card.appendChild(img);

        // Nome
        const nome = document.createElement("div");
        nome.className = "reserva-nome";
        nome.textContent = jog.nome;
        card.appendChild(nome);

        // Informações de posição e overall
        const info = document.createElement("div");
        info.className = "reserva-info";
        /*
         * Alguns objetos de jogador no elenco usam a propriedade
         * "posicao" em vez de "pos" para armazenar a posição
         * de origem.  Quando este campo existe utilize-o para
         * exibir o texto; caso contrário recorra a "pos".  Isso
         * evita aparecer "undefined" no painel de reservas.
         */
        const posicao = (jog.posicao || jog.pos || "").toUpperCase();
        info.textContent = `${posicao} · OVR ${jog.ovr}`;
        card.appendChild(info);

        // Selecionar reserva
        card.addEventListener("click", () => {
            reservaSelecionadaId = jog.id;

            document.querySelectorAll(".reserva-card")
                .forEach(el => el.classList.remove("reserva-selecionada"));

            card.classList.add("reserva-selecionada");
        });

        lista.appendChild(card);
    });
}
