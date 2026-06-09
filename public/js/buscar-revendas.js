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

function slugify(texto) {
    return normalizar(texto)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function capitalize(texto) {
    return (texto || "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function obterCidadeFiltro() {
    const filtro = window.FILTRO || {};
    return filtro.cidadeNome || capitalize(filtro.cidade);
}

function obterBairroFiltro() {
    const filtro = window.FILTRO || {};
    return filtro.bairroNome || capitalize(filtro.bairro);
}

function obterUfFiltro() {
    const filtro = window.FILTRO || {};
    return (filtro.ufNome || filtro.uf || "").toUpperCase();
}

function obterCidadesAtendimento(revenda) {
    if (!revenda.cidades_atendimento) return [];
    if (Array.isArray(revenda.cidades_atendimento)) return revenda.cidades_atendimento;

    try {
        const parsed = JSON.parse(revenda.cidades_atendimento);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function revendaAtendeCidade(revenda, cidadeSlug, ufSlug) {
    const cidadePrincipalOk =
        slugify(revenda.cidade) === cidadeSlug &&
        normalizar(revenda.estado) === ufSlug;

    if (cidadePrincipalOk) return true;

    return obterCidadesAtendimento(revenda).some(item =>
        slugify(item.cidade) === cidadeSlug &&
        normalizar(item.estado) === ufSlug
    );
}

function filtrarPorContexto(lista) {
    const filtro = window.FILTRO || {};
    const cidadeSlug = filtro.cidade || "";
    const ufSlug = normalizar(filtro.uf);
    const bairroSlug = filtro.bairro || "";

    return lista.filter(revenda => {
        if (bairroSlug) {
            if (slugify(revenda.bairro) !== bairroSlug) return false;
            if (slugify(revenda.cidade) !== cidadeSlug) return false;
            if (normalizar(revenda.estado) !== ufSlug) return false;
            return true;
        }

        if (cidadeSlug && !revendaAtendeCidade(revenda, cidadeSlug, ufSlug)) return false;
        return true;
    });
}

function atualizarTitulos() {
    const filtro = window.FILTRO || {};
    const titulo = document.getElementById("titulo-revendas");
    const hero = document.getElementById("titulo-revendas-hero");

    let texto = "Revendas Parceiras";

    if (filtro.bairro) {
        texto = `Revendas em ${obterBairroFiltro()}, ${obterCidadeFiltro()} - ${obterUfFiltro()}`;
    } else if (filtro.cidade) {
        texto = `Revendas em ${obterCidadeFiltro()} - ${obterUfFiltro()}`;
    }

    if (titulo) titulo.textContent = texto;
    if (hero) hero.textContent = texto;
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
            filtrarPorContexto(await response.json());

        preencherSelectRevenda();
        preencherSelectCidadeRevenda();
        atualizarTitulos();

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
            todasRevendas.flatMap(r => [
                `${r.cidade} - ${r.estado}`,
                ...obterCidadesAtendimento(r).map(item => `${item.cidade} - ${item.estado}`)
            ])
            .filter(item => item && !item.startsWith(" - "))
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
                    .includes(cidade) ||
                obterCidadesAtendimento(r).some(item =>
                    normalizar(item.cidade).includes(cidade)
                );

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

    const logoHtml = r.logo
        ? `<img class="revenda-logo" src="${r.logo}" alt="${r.nome}">`
        : "";

    card.innerHTML = `
        ${logoHtml}

        <div class="revenda-info">

            <h3>${r.nome}</h3>

            <div class="local">
                ${r.bairro ? `${r.bairro}, ` : ""}${r.cidade} - ${r.estado}
            </div>

            <button class="ver-estoque" type="button">
                Ver Estoque
            </button>

        </div>
    `;

    card.querySelector(".ver-estoque")
        .addEventListener("click", () => {
            window.location.href = r.url || `/revenda/${r.id}`;
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
