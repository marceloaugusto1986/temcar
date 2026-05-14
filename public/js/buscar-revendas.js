/* =========================
   ESTADO GLOBAL
========================== */
let todasRevendas = [];
let revendasFiltradas = [];

let paginaAtual = 1;
const ITENS_POR_PAGINA = 9;

/* =========================
   ELEMENTOS DOM
========================== */
const cardsContainer = document.getElementById("cards-container");
const filtroForm = document.getElementById("filtro-form");
const selectRevenda = document.getElementById("select-revenda");
const selectCidadeRevenda = document.getElementById("select-cidadeRevenda");
const inputBusca = document.querySelector(".input_cidades");

const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const pageInfo = document.getElementById("page-info");

/* =========================
   API
========================== */
async function carregarRevendas() {
    try {
        const response = await fetch("/api/revendas-ativas");

        if (!response.ok) throw new Error("Erro ao carregar");

        todasRevendas = await response.json();

        preencherSelectRevenda();
        preencherSelectCidadeRevenda();
        aplicarFiltros();

    } catch (error) {
        console.error(error);
        cardsContainer.innerHTML = "<p>Erro ao carregar revendas.</p>";
    }
}

/* =========================
   FILTROS
========================== */
function preencherSelectRevenda() {
    selectRevenda.innerHTML = `<option value="">Busque pelo nome</option>`;

    const nomeRevenda = [...new Set(todasRevendas.map(r => r.nome))].sort();

    nomeRevenda.forEach(nome => {
        selectRevenda.innerHTML += `<option value="${nome}">${nome}</option>`;
    });
}

function preencherSelectCidadeRevenda() {
    selectCidadeRevenda.innerHTML = `<option value="">Filtre por cidade</option>`;

    const cidadeRevenda = [
        ...new Set(todasRevendas.map(r => `${r.cidade} - ${r.estado}`))
    ].sort();

    cidadeRevenda.forEach(cidade => {
        // 🔥 valor só cidade, texto cidade + estado
        const [cidadeNome] = cidade.split(" - ");

        selectCidadeRevenda.innerHTML += `
            <option value="${cidadeNome}">${cidade}</option>
        `;
    });
}

function aplicarFiltros() {
    const nome = selectRevenda.value.toLowerCase();
    const cidade = selectCidadeRevenda.value.toLowerCase(); // ✅ corrigido

    revendasFiltradas = todasRevendas.filter(r => {
        const matchNome = !nome || r.nome.toLowerCase() === nome;
        const matchCidade = !cidade || r.cidade.toLowerCase() === cidade;

        return matchNome && matchCidade;
    });

    paginaAtual = 1;
    renderizarPagina();
}


/* =========================
   PAGINAÇÃO
========================== */
function obterPaginaAtual() {
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const fim = inicio + ITENS_POR_PAGINA;
    return revendasFiltradas.slice(inicio, fim);
}

function renderizarPagina() {
    cardsContainer.innerHTML = "";

    const pagina = obterPaginaAtual();

    if (!pagina.length) {
        cardsContainer.innerHTML = "<p>Nenhuma revenda encontrada.</p>";
        atualizarPaginacao();
        return;
    }

    pagina.forEach(r => cardsContainer.appendChild(criarCard(r)));
    atualizarPaginacao();
}

function atualizarPaginacao() {
    const totalPaginas = Math.ceil(revendasFiltradas.length / ITENS_POR_PAGINA) || 1;

    pageInfo.textContent = `Página ${paginaAtual} de ${totalPaginas}`;

    prevBtn.disabled = paginaAtual === 1;
    nextBtn.disabled = paginaAtual === totalPaginas;
}

prevBtn.addEventListener("click", () => {
    paginaAtual--;
    renderizarPagina();
});

nextBtn.addEventListener("click", () => {
    paginaAtual++;
    renderizarPagina();
});

/* =========================
   CARD
========================== */
function criarCard(r) {
    const card = document.createElement("div");
    card.className = "revenda-card";

    card.innerHTML = `
        <img class="revenda-logo" src="${r.logo}" alt="Logo ${r.nome}">
        <div class="revenda-info">
            <h3>${r.nome}</h3>
            <div class="local">${r.cidade} - ${r.estado}</div>
            <button class="btn active btn-info ver-estoque"
                style="background:#C90B0C;border:1px solid #C90B0C;color:#fff">
                Ver Estoque
            </button>
        </div>
    `;

    card.querySelector(".ver-estoque").addEventListener("click", () => {
        window.location.href = `/revenda/${r.id}`;
    });

    return card;
}

/* =========================
   EVENTOS
========================== */
/* filtroForm.addEventListener("submit", e => {
    e.preventDefault();
    aplicarFiltros();
}); */

/* =========================
   INIT
========================== */
carregarRevendas();
