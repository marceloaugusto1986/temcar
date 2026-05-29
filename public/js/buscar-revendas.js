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

const selectRevenda =
    document.getElementById("select-revenda");

const selectCidadeRevenda =
    document.getElementById("select-cidadeRevenda");

const prevBtn =
    document.getElementById("prev-btn");

const nextBtn =
    document.getElementById("next-btn");

const pageInfo =
    document.getElementById("page-info");

/* =========================
   HELPERS
========================== */
function normalizar(texto) {

    return (texto || "")
        .toString()
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

/* =========================
   API
========================== */
async function carregarRevendas() {

    try {

        const response =
            await fetch("/api/revendas-ativas");

        if (!response.ok) {
            throw new Error("Erro ao carregar");
        }

        todasRevendas =
            await response.json();

        preencherSelectRevenda();
        preencherSelectCidadeRevenda();

        aplicarFiltros();

    } catch (error) {

        console.error(error);

        cardsContainer.innerHTML =
            "<p>Erro ao carregar revendas.</p>";
    }
}

/* =========================
   FILTROS
========================== */
function preencherSelectRevenda() {

    selectRevenda.innerHTML =
        `<option value="">Busque pelo nome</option>`;

    const nomes = [
        ...new Set(
            todasRevendas.map(r => r.nome)
        )
    ].sort();

    nomes.forEach(nome => {

        const option =
            document.createElement("option");

        option.value = nome;
        option.textContent = nome;

        selectRevenda.appendChild(option);
    });
}

function preencherSelectCidadeRevenda() {

    selectCidadeRevenda.innerHTML =
        `<option value="">Filtre por cidade</option>`;

    const cidades = [
        ...new Set(
            todasRevendas.map(
                r => `${r.cidade} - ${r.estado}`
            )
        )
    ].sort();

    cidades.forEach(item => {

        const [cidadeNome] =
            item.split(" - ");

        const option =
            document.createElement("option");

        option.value = cidadeNome;
        option.textContent = item;

        selectCidadeRevenda.appendChild(option);
    });
}

function aplicarFiltros() {

    const nome =
        normalizar(selectRevenda.value);

    const cidade =
        normalizar(selectCidadeRevenda.value);

    revendasFiltradas =
        todasRevendas.filter(r => {

            const matchNome =
                !nome ||
                normalizar(r.nome)
                    .includes(nome);

            const matchCidade =
                !cidade ||
                normalizar(r.cidade)
                    .includes(cidade);

            return (
                matchNome &&
                matchCidade
            );
        });

    paginaAtual = 1;

    renderizarPagina();
}

/* =========================
   PAGINAÇÃO
========================== */
function obterPaginaAtual() {

    const inicio =
        (paginaAtual - 1)
        *
        ITENS_POR_PAGINA;

    const fim =
        inicio + ITENS_POR_PAGINA;

    return revendasFiltradas.slice(inicio, fim);
}

function renderizarPagina() {

    cardsContainer.innerHTML = "";

    const pagina =
        obterPaginaAtual();

    if (!pagina.length) {

        cardsContainer.innerHTML =
            "<p>Nenhuma revenda encontrada.</p>";

        atualizarPaginacao();

        return;
    }

    pagina.forEach(r => {

        cardsContainer.appendChild(
            criarCard(r)
        );
    });

    atualizarPaginacao();
}

function atualizarPaginacao() {

    const totalPaginas =
        Math.ceil(
            revendasFiltradas.length
            /
            ITENS_POR_PAGINA
        ) || 1;

    pageInfo.textContent =
        `Página ${paginaAtual} de ${totalPaginas}`;

    prevBtn.disabled =
        paginaAtual === 1;

    nextBtn.disabled =
        paginaAtual === totalPaginas;
}

prevBtn.addEventListener("click", () => {

    if (paginaAtual > 1) {
        paginaAtual--;
        renderizarPagina();
    }
});

nextBtn.addEventListener("click", () => {

    const totalPaginas =
        Math.ceil(
            revendasFiltradas.length
            /
            ITENS_POR_PAGINA
        );

    if (paginaAtual < totalPaginas) {
        paginaAtual++;
        renderizarPagina();
    }
});

/* =========================
   CARD
========================== */
function criarCard(r) {

    const card =
        document.createElement("div");

    card.className =
        "revenda-card";

    card.innerHTML = `
        <img class="revenda-logo" src="${r.logo}" alt="${r.nome}">

        <div class="revenda-info">

            <h3>${r.nome}</h3>

            <div class="local">
                ${r.cidade} - ${r.estado}
            </div>

            <button class="ver-estoque" type="button">
                Ver Estoque
            </button>

        </div>
    `;

    card.querySelector(".ver-estoque")
        .addEventListener("click", () => {
            window.location.href = `/revenda/${r.id}`;
        });

    return card;
}

/* =========================
   SUBMIT DO FORM (AQUI ESTÁ A CORREÇÃO)
========================== */
filtroForm.addEventListener("submit", (e) => {

    e.preventDefault(); // impede reload

    aplicarFiltros();   // dispara filtro igual "change"
});

/* =========================
   INIT
========================== */
carregarRevendas();
