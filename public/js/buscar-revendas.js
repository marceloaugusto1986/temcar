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

/* =========================
   HELPERS
========================== */
function normalizar(texto) {
    return (texto || "")
        .toString()
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
}

function slugify(texto) {
    return normalizar(texto)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function capitalize(texto) {
    const minusculas = new Set(["da", "de", "do", "das", "dos", "e", "a", "o", "em", "no", "na"]);
    return (texto || "")
        .replace(/-/g, " ")
        .split(" ")
        .map((word, i) => {
            if (!word) return word;
            const lower = word.toLowerCase();
            return (i === 0 || !minusculas.has(lower))
                ? lower.charAt(0).toUpperCase() + lower.slice(1)
                : lower;
        })
        .join(" ");
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
    } catch {
        return [];
    }
}

function revendaAtendeCidade(revenda, cidadeSlug, ufSlug) {
    const principal =
        slugify(revenda.cidade) === cidadeSlug &&
        normalizar(revenda.estado) === ufSlug;
    if (principal) return true;
    return obterCidadesAtendimento(revenda).some(item =>
        slugify(item.cidade) === cidadeSlug && normalizar(item.estado) === ufSlug
    );
}

function revendaAtendeBairro(revenda, bairroSlug, cidadeSlug, ufSlug) {
    const principal =
        slugify(revenda.bairro) === bairroSlug &&
        slugify(revenda.cidade) === cidadeSlug &&
        normalizar(revenda.estado) === ufSlug;
    if (principal) return true;
    return obterCidadesAtendimento(revenda).some(item =>
        slugify(item.bairro) === bairroSlug &&
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
        if (bairroSlug) return revendaAtendeBairro(revenda, bairroSlug, cidadeSlug, ufSlug);
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
    if (hero) hero.innerHTML = texto;
}

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
        atualizarTitulos();
        aplicarFiltros();
    } catch (error) {
        console.error(error);
        cardsContainer.innerHTML = "<p class='text-center text-danger'>Erro ao carregar revendas.</p>";
    }
}

/* =========================
   FILTROS
========================== */
function preencherSelectRevenda() {
    selectRevenda.innerHTML = `<option value="">Busque pelo nome</option>`;
    [...new Set(todasRevendas.map(r => r.nome))].sort().forEach(nome => {
        const opt = document.createElement("option");
        opt.value = nome;
        opt.textContent = nome;
        selectRevenda.appendChild(opt);
    });
}

function preencherSelectCidadeRevenda() {
    selectCidadeRevenda.innerHTML = `<option value="">Filtre por cidade</option>`;
    const cidades = [
        ...new Set(
            todasRevendas.flatMap(r => [
                `${r.cidade} - ${r.estado}`,
                ...obterCidadesAtendimento(r).map(item => `${item.cidade} - ${item.estado}`)
            ]).filter(item => item && !item.startsWith(" - "))
        )
    ].sort();

    cidades.forEach(item => {
        const [cidadeNome] = item.split(" - ");
        const opt = document.createElement("option");
        opt.value = cidadeNome;
        opt.textContent = item;
        selectCidadeRevenda.appendChild(opt);
    });
}

function aplicarFiltros() {
    const nome = normalizar(selectRevenda.value);
    const cidade = normalizar(selectCidadeRevenda.value);

    // Quando nenhuma cidade está selecionada no dropdown, aplica o filtro da URL (contexto)
    const base = cidade ? todasRevendas : filtrarPorContexto(todasRevendas);

    revendasFiltradas = base.filter(r => {
        const matchNome = !nome || normalizar(r.nome).includes(nome);
        const matchCidade = !cidade ||
            normalizar(r.cidade).includes(cidade) ||
            obterCidadesAtendimento(r).some(item => normalizar(item.cidade).includes(cidade));
        return matchNome && matchCidade;
    });

    paginaAtual = 1;
    renderizarPagina();
}

/* =========================
   PAGINAÇÃO
========================== */
function renderizarPaginacao() {
    const totalPaginas = Math.ceil(revendasFiltradas.length / ITENS_POR_PAGINA);
    const ul = document.getElementById("paginacao");
    if (!ul) return;
    ul.innerHTML = "";
    if (totalPaginas === 0) return;

    ul.innerHTML += `<li class="page-item ${paginaAtual === 1 ? 'disabled' : ''}">
        <button class="page-link" onclick="mudarPagina(${paginaAtual - 1})">Anterior</button>
    </li>`;

    const inicio = Math.max(1, paginaAtual - 2);
    const fim = Math.min(totalPaginas, paginaAtual + 2);

    if (inicio > 1) {
        ul.innerHTML += `<li class="page-item"><button class="page-link" onclick="mudarPagina(1)">1</button></li>`;
        if (inicio > 2) ul.innerHTML += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
    }

    for (let i = inicio; i <= fim; i++) {
        ul.innerHTML += `<li class="page-item ${i === paginaAtual ? 'active' : ''}">
            <button class="page-link" onclick="mudarPagina(${i})">${i}</button>
        </li>`;
    }

    if (fim < totalPaginas) {
        if (fim < totalPaginas - 1) ul.innerHTML += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
        ul.innerHTML += `<li class="page-item"><button class="page-link" onclick="mudarPagina(${totalPaginas})">${totalPaginas}</button></li>`;
    }

    ul.innerHTML += `<li class="page-item ${paginaAtual === totalPaginas ? 'disabled' : ''}">
        <button class="page-link" onclick="mudarPagina(${paginaAtual + 1})">Próximo</button>
    </li>`;
}

function mudarPagina(pagina) {
    const totalPaginas = Math.ceil(revendasFiltradas.length / ITENS_POR_PAGINA);
    if (pagina < 1 || pagina > totalPaginas) return;
    paginaAtual = pagina;
    renderizarPagina();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =========================
   RENDERIZAÇÃO
========================== */
function renderizarPagina() {
    cardsContainer.innerHTML = "";

    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const pagina = revendasFiltradas.slice(inicio, inicio + ITENS_POR_PAGINA);

    if (!pagina.length) {
        const cidade = obterCidadeFiltro();
        const uf = obterUfFiltro();
        const bairro = obterBairroFiltro();

        let textoTitulo = "Revendas de Carros";
        if (bairro && cidade) textoTitulo = `Revendas de Carros em <strong>${bairro}, ${cidade} - ${uf}</strong>`;
        else if (cidade) textoTitulo = `Revendas de Carros em <strong>${cidade} - ${uf}</strong>`;

        document.getElementById("titulo-revendas")?.classList.add("d-none");

        cardsContainer.innerHTML = `
            <div class="cidade-empty-state" data-nosnippet>
                <div class="cidade-empty-icon"><i class="bi bi-buildings"></i></div>
                <p class="cidade-empty-title">${textoTitulo}</p>
                <p class="cidade-empty-promo">
                    <strong>Atenção Revendas</strong><br>
                    Aproveite nossa promoção de lançamento e anuncie seus veículos gratuitamente até agosto de 2026.
                </p>
                <div class="cidade-empty-actions">
                    <a class="btn btn-danger" href="/vender">Anunciar grátis</a>
                </div>
            </div>`;

        renderizarPaginacao();
        return;
    }

    pagina.forEach(r => cardsContainer.appendChild(criarCard(r)));
    renderizarPaginacao();
}

/* =========================
   CARD
========================== */
function criarCard(r) {
    const card = document.createElement("div");
    card.className = "revenda-card";
    card.onclick = () => { window.location.href = r.url || `/revenda/${r.id}`; };

    const logoHtml = r.logo
        ? `<img class="revenda-logo" src="${r.logo}" alt="${r.nome}" onerror="this.style.display='none'">`
        : "";

    card.innerHTML = `
        ${logoHtml}
        <div class="revenda-info">
            <h3>${r.nome}</h3>
            <p class="local">
                <i class="bi bi-geo-alt-fill" style="color:#C90B0C;"></i>
                ${r.bairro ? `${r.bairro}, ` : ""}${r.cidade} - ${r.estado}
            </p>
            <button class="ver-estoque" type="button">Ver Estoque</button>
        </div>`;

    card.querySelector(".ver-estoque").addEventListener("click", (e) => {
        e.stopPropagation();
        window.location.href = r.url || `/revenda/${r.id}`;
    });

    return card;
}

/* =========================
   SUBMIT DO FORM
========================== */
filtroForm.addEventListener("submit", (e) => {
    e.preventDefault();
    aplicarFiltros();
});

/* =========================
   INIT
========================== */
carregarRevendas();
