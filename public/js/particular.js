/* ================================
   ESTADO GLOBAL
================================ */

let anunciosOriginais = []
let anunciosFiltrados = []
let itens = []

const itensPorPagina = 7
let paginaAtual = 1

/* ================================
   UTIL
================================ */

function ordenarComDestaque(lista) {
    const shuffle = arr => arr.sort(() => Math.random() - 0.5)
    return [
        ...shuffle(lista.filter(v => v.destaque == 1)),
        ...shuffle(lista.filter(v => v.destaque != 1))
    ]
}

function obterListaAtual() {
    return anunciosFiltrados
}

function criarSlugVenda(texto) {
    return (texto || "")
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
}

function obterAcessorios(acessorios) {
    if (!acessorios) return []
    if (Array.isArray(acessorios)) return acessorios
    if (typeof acessorios === "object") return Object.values(acessorios).flat().filter(Boolean)

    try {
        const parsed = JSON.parse(acessorios)
        if (Array.isArray(parsed)) return parsed
        if (parsed && typeof parsed === "object") return Object.values(parsed).flat().filter(Boolean)
    } catch (erro) {
        return String(acessorios)
            .split(",")
            .map(item => item.trim())
            .filter(Boolean)
    }

    return []
}

function capitalize(texto) {
    const minusculas = new Set(["da", "de", "do", "das", "dos", "e", "a", "o", "em", "no", "na"])
    return (texto || "")
        .replace(/-/g, " ")
        .split(" ")
        .map((word, i) => {
            if (!word) return word
            const lower = word.toLowerCase()
            return (i === 0 || !minusculas.has(lower))
                ? lower.charAt(0).toUpperCase() + lower.slice(1)
                : lower
        })
        .join(" ")
}

function obterCidadeFiltro() {
    const filtro = window.FILTRO || {}
    return filtro.cidadeNome || capitalize(filtro.cidade)
}

function obterBairroFiltro() {
    const filtro = window.FILTRO || {}
    return filtro.bairroNome || capitalize(filtro.bairro)
}

function obterUfFiltro() {
    const filtro = window.FILTRO || {}
    return (filtro.ufNome || filtro.uf || "").toUpperCase()
}

function filtrarPorContexto(lista) {
    const filtro = window.FILTRO || {}
    const cidadeSlug = filtro.cidade || ""
    const uf = (filtro.uf || "").toLowerCase()
    const bairroSlug = filtro.bairro || ""

    return lista.filter(item => {
        if (cidadeSlug && criarSlugVenda(item.cidade) !== cidadeSlug) return false
        if (uf && String(item.estado || "").toLowerCase() !== uf) return false
        if (bairroSlug && criarSlugVenda(item.bairro) !== bairroSlug) return false
        return true
    })
}

function atualizarTituloParticular() {
    const titulo = document.getElementById("titulo-particular")
    const total = document.getElementById("total-particular")
    const tituloBanner = document.getElementById("titulo-pagina")
    const subtituloBanner = document.getElementById("subtitulo-pagina")
    const filtro = window.FILTRO || {}
    const seo = window.SEO_PAGINA || {}

    let texto = "Veículos de Particulares"
    let sub = "Encontre veículos de particulares no TEMCAR"

    if (filtro.bairro) {
        texto = `Veículos de Particulares em ${obterBairroFiltro()}, ${obterCidadeFiltro()} - ${obterUfFiltro()}`
        sub = "Veículos de particulares no seu bairro"
    } else if (filtro.cidade) {
        texto = `Veículos de Particulares em ${obterCidadeFiltro()} - ${obterUfFiltro()}`
        sub = "Veículos de particulares na sua cidade"
    }

    // Sem carros anunciados no contexto da página: usa "Carros" no lugar de
    // "veículos" na faixa do topo e oculta a coluna lateral de filtros.
    const semCarros = anunciosOriginais.length === 0
    if (semCarros) {
        texto = texto.replace(/Veículos/g, "Carros").replace(/veículos/g, "carros")
        sub = sub.replace(/Veículos/g, "Carros").replace(/veículos/g, "carros")
    }
    document.getElementById("sidebar")?.classList.toggle("d-none", semCarros)
    document.querySelector(".btn-abrir-filtro")?.closest(".d-lg-none")?.classList.toggle("d-none", semCarros)

    // A tarja usa o meta title cadastrado no SEO (sem o sufixo do site).
    const seoTitulo = String(seo.titulo || "").replace(/\s*\|\s*TEMCAR\s*$/i, "").trim()
    let bannerTexto = seoTitulo || texto
    if (semCarros) bannerTexto = bannerTexto.replace(/Veículos/g, "Carros").replace(/veículos/g, "carros")

    // Sem anúncios: o contexto já aparece na tarja do topo, então não
    // repetimos o título acima do box central.
    if (titulo) titulo.textContent = semCarros ? "" : texto
    if (total) total.textContent = semCarros ? "" : `${anunciosFiltrados.length} anúncio(s)`
    if (tituloBanner) tituloBanner.textContent = bannerTexto
    if (subtituloBanner) subtituloBanner.textContent = sub
}

// montarUrlVenda, formatarPreco, formatarKm, montarDetalhesPrincipais/Secundarios,
// montarLocalizacao e criarCardAnuncio vêm de /js/reutilizavel/card-anuncio.js

/* ================================
   CARREGAR ANÚNCIOS
================================ */

async function carregarAnuncios() {
    console.log("🔄 Carregando anúncios...")
    try {
        const response = await fetch(`/api/particular-ativos-home`)
        if (!response.ok) throw new Error("Erro ao carregar anúncios")
        const data = await response.json()
        console.log("📦 Dados recebidos:", data)

        anunciosOriginais = ordenarComDestaque(filtrarPorContexto(data))
        anunciosFiltrados = [...anunciosOriginais]

        montarFiltrosDinamicos()
        atualizarLista()

        console.log("✅ Anúncios armazenados:", anunciosFiltrados.length)
    } catch (erro) {
        console.error("Erro ao carregar anúncios:", erro)
        const container = document.getElementById("listaCards")
        if (container) container.innerHTML = "<p class='text-center'>Erro ao carregar anúncios</p>"
    }
}

/* ================================
   MONTAR FILTROS DINÂMICOS
================================ */

function montarFiltrosDinamicos() {
    console.log("⚙️ Montando filtros dinâmicos");

    // Marcas, modelos, versões, etc.
    const marcas = [...new Set(anunciosOriginais.map(a => a.marca).filter(Boolean))];
    const modelos = [...new Set(anunciosOriginais.map(a => a.modelo || a.versao).filter(Boolean))];
    const cambios = [...new Set(anunciosOriginais.map(a => a.cambio).filter(Boolean))];
    const combustiveis = [...new Set(anunciosOriginais.map(a => a.combustivel).filter(Boolean))];
    const carrocerias = [...new Set(anunciosOriginais.map(a => a.carroceria).filter(Boolean))];
    const anos = [...new Set(anunciosOriginais.map(a => a.ano_modelo).filter(Boolean))].sort((a, b) => a - b);

    // Cores
    const cores = [...new Set(anunciosOriginais.map(a => a.cor).filter(Boolean))];

    // Opcionais / Acessórios
    const todosAcessorios = anunciosOriginais
        .map(a => obterAcessorios(a.acessorios))
        .flat();
    const opcionais = [...new Set(todosAcessorios.filter(Boolean))];

    // Preencher selects
    preencherSelect("filtroModelo", modelos);
    //preencherSelect("filtroVersao", versoes);
    preencherSelect("filtroCambio", cambios);
    preencherSelect("filtroCombustivel", combustiveis);
    preencherSelect("filtroCarroceria", carrocerias);
    preencherSelect("filtroAnoMin", anos);
    preencherSelect("filtroAnoMax", anos);

    // Preencher checkboxes
    preencherListaMarcas(marcas);
    preencherListaCores(cores);
    preencherListaOpcionais(opcionais);
}

function preencherListaCores(cores) {
    const container = document.getElementById("filtroCores");
    if (!container) return;
    container.innerHTML = "";
    cores.forEach(cor => {
        container.innerHTML += `
            <div class="mb-3">
                <label>
                    <input type="checkbox" value="${cor.toLowerCase()}"> ${cor}
                </label>
            </div>
        `;
    });
}

function preencherListaOpcionais(opcionais) {
    const container = document.getElementById("filtroOpcionais");
    if (!container) return;
    container.innerHTML = "";
    opcionais.forEach(opcional => {
        container.innerHTML += `
            <div class="mb-3">
                <label>
                    <input type="checkbox" value="${opcional}"> ${opcional}
                </label>
            </div>
        `;
    });
}

function preencherSelect(id, valores) {
    const select = document.getElementById(id)
    if (!select) return
    select.innerHTML = `<option value="">Todos</option>`
    valores.forEach(v => select.innerHTML += `<option value="${v}">${v}</option>`)
}

function preencherListaMarcas(marcas) {
    console.log("Preenchendo marcas:", marcas);
    const container = document.getElementById("filtroMarcas");
    if (!container) {
        console.warn("Container de marcas não encontrado!");
        return;
    }
    container.innerHTML = "";
    marcas.forEach(marca => {
        container.innerHTML += `<label><input type="checkbox" value="${marca}"> ${marca}</label><br>`;
    });
}


/* ================================
   APLICAR FILTROS
================================ */

function aplicarFiltros() {
    console.log("🧪 Aplicando filtros...");

    const filtros = {
        busca: document.getElementById("filtroBusca")?.value.toLowerCase().trim() || "",
        local: document.getElementById("filtroLocal")?.value.toLowerCase().trim() || "",
        modelo: document.getElementById("filtroModelo")?.value || "",
        versao: document.getElementById("filtroVersao")?.value || "",
        anoMin: Number(document.getElementById("filtroAnoMin")?.value) || 0,
        anoMax: Number(document.getElementById("filtroAnoMax")?.value) || Infinity,
        precoMin: Number(document.getElementById("filtroPrecoMin")?.value) || 0,
        precoMax: Number(document.getElementById("filtroPrecoMax")?.value) || Infinity,
        kmMin: Number(document.getElementById("filtroKmMin")?.value) || 0,
        kmMax: Number(document.getElementById("filtroKmMax")?.value) || Infinity,
        cambio: document.getElementById("filtroCambio")?.value || "",
        combustivel: document.getElementById("filtroCombustivel")?.value || "",
        carroceria: document.getElementById("filtroCarroceria")?.value || "",
        marcasSelecionadas: [...document.querySelectorAll("#filtroMarcas input:checked")].map(el => el.value),
        coresSelecionadas: [...document.querySelectorAll("#filtroCores input:checked")].map(el => el.value),
        opcionaisSelecionados: [...document.querySelectorAll("#filtroOpcionais input:checked")].map(el => el.value),
        blindagemCom: document.getElementById("filtroBlindado")?.checked || false,
        blindagemSem: document.getElementById("filtroNaoBlindado")?.checked || false,
        estadoNovo: document.getElementById("filtroNovo")?.checked || false,
        estadoUsado: document.getElementById("filtroUsado")?.checked || false
    }

    console.log("📝 Filtros capturados:", filtros);

    anunciosFiltrados = anunciosOriginais.filter(item => {
        const acessorios = obterAcessorios(item.acessorios)
        const temBlindagem = acessorios.includes("blindado")

        if (filtros.busca && !(`${item.marca} ${item.versao}`.toLowerCase().includes(filtros.busca))) return false
        if (filtros.modelo && (item.modelo || item.versao) !== filtros.modelo) return false
        if (filtros.versao && item.versao !== filtros.versao) return false
        if (item.ano_modelo < filtros.anoMin || item.ano_modelo > filtros.anoMax) return false
        if (item.preco < filtros.precoMin || item.preco > filtros.precoMax) return false
        if (item.km < filtros.kmMin || item.km > filtros.kmMax) return false
        if (filtros.cambio && item.cambio !== filtros.cambio) return false
        if (filtros.combustivel && item.combustivel !== filtros.combustivel) return false
        if (filtros.carroceria && item.carroceria !== filtros.carroceria) return false
        if (filtros.marcasSelecionadas.length && !filtros.marcasSelecionadas.includes(item.marca)) return false
        if (filtros.coresSelecionadas.length && !filtros.coresSelecionadas.includes((item.cor || "").toLowerCase())) return false
        if (filtros.local) {
            const cidade = (item.cidade || "").toLowerCase()
            const estado = (item.estado || "").toLowerCase()
            const bairro = (item.bairro || "").toLowerCase()
            if (!cidade.includes(filtros.local) && !estado.includes(filtros.local) && !bairro.includes(filtros.local)) return false
        }
        if (filtros.opcionaisSelecionados.length && !filtros.opcionaisSelecionados.every(o => acessorios.includes(o))) return false
        if (filtros.blindagemCom && !temBlindagem) return false
        if (filtros.blindagemSem && temBlindagem) return false
        if (filtros.estadoNovo && item.condicao !== "novo") return false
        if (filtros.estadoUsado && item.condicao !== "usado") return false

        return true
    })

    console.log("✅ Resultado após filtro:", anunciosFiltrados.length);

    paginaAtual = 1
    atualizarLista()
}

/* ================================
   LIMPAR FILTROS
================================ */

function limparFiltros() {
    document.querySelectorAll(".barra_lateral input, .barra_lateral select").forEach(el => {
        if (el.type === "checkbox" || el.type === "radio") el.checked = false
        else el.value = ""
    })

    anunciosFiltrados = [...anunciosOriginais]
    paginaAtual = 1
    atualizarLista()
}

/* ================================
   ATUALIZAR LISTA
================================ */

function atualizarLista() {
    itens = anunciosFiltrados.map(a => ({
        titulo: `${a.marca || ''} ${a.versao || ''}`.trim(),
        preco: Number(a.preco),
        imagem: a.imagem,
        id: a.id,
        ano: a.ano_modelo,
        descricao: a.descricao,
        motorizacao: a.motorizacao,
        portas: a.portas,
        km: a.km,
        cidade: a.cidade,
        estado: a.estado,
        bairro: a.bairro,
        marca: a.marca,
        modelo: a.modelo,
        versao: a.versao,
        cambio: a.cambio,
        combustivel: a.combustivel,
        carroceria: a.carroceria,
        cor: a.cor,
        condicao: a.condicao,
        acessorios: a.acessorios,
        destaque: a.destaque,
        tipo_anunciante: "particular",
    }))
    renderizarCards()
    renderizarPaginacao()
    atualizarTituloParticular()
}

/* ================================
   RENDERIZAÇÃO CARDS
================================ */

// Texto institucional/SEO exibido quando a página não tem anúncios.
// localHtml já vem com preposição + <strong>local</strong> (ex.: "em <strong>Vitória - ES</strong>").
function conteudoSeoEmptyState(localHtml) {
    return `
        <p>Se você está procurando carros usados ou carros seminovos ${localHtml}, o TEMCAR reúne anúncios de veículos de particulares, revendas e concessionárias em um só lugar para facilitar a sua busca.</p>
        <p>Em nossa plataforma você encontra uma grande variedade de veículos à venda, incluindo hatchs, sedãs, SUVs, picapes, utilitários e carros de diversas marcas e modelos, com opções para diferentes perfis e faixas de preço. Utilize os filtros de pesquisa para localizar o carro ideal por marca, modelo, ano, combustível, câmbio, quilometragem e valor.</p>
        <p>O TEMCAR foi desenvolvido para tornar a compra e a venda de veículos mais simples e seguras. Compare diferentes ofertas, analise as características de cada anúncio e encontre o veículo que melhor atende às suas necessidades. Seja para adquirir o primeiro veículo, trocar de automóvel ou encontrar uma oportunidade de negócio, você terá acesso a anúncios atualizados e organizados.</p>
        <p>Confira abaixo os carros usados e seminovos à venda ${localHtml} e descubra excelentes oportunidades para comprar seu próximo veículo com praticidade. No TEMCAR você encontra anúncios de automóveis em diversas cidades do Brasil, conectando compradores e vendedores em um ambiente completo para quem procura comprar ou vender carros.</p>
    `
}

function renderizarSemResultados(container) {
    const cidade = obterCidadeFiltro()
    const uf = obterUfFiltro()
    const bairro = obterBairroFiltro()

    let localHtml = "no <strong>Brasil</strong>"
    if (bairro && cidade) localHtml = `em <strong>${bairro}, ${cidade} - ${uf}</strong>`
    else if (cidade) localHtml = `em <strong>${cidade} - ${uf}</strong>`

    document.getElementById("titulo-particular")?.closest("div")?.classList.add("d-none")

    container.innerHTML = `
        <div class="w-100" style="flex: 0 0 100%; max-width: 100%;">
            <div class="cidade-empty-state">
                <div class="cidade-empty-icon">
                    <i class="bi bi-person-fill"></i>
                </div>
                <div class="cidade-empty-seo">${conteudoSeoEmptyState(localHtml)}</div>
                <div class="cidade-empty-actions" style="margin-bottom: 22px;">
                    <a class="btn btn-danger" href="/comprar">Ver veículos disponíveis</a>
                </div>
                <p class="cidade-empty-promo">
                    <strong>Atenção Particulares</strong><br>
                    Aproveite nossa promoção de lançamento e anuncie seu veículo gratuitamente.
                </p>
                <div class="cidade-empty-actions">
                    <a class="btn btn-danger" href="/vender">Anunciar grátis</a>
                </div>
            </div>
        </div>
    `
}

function renderizarCards() {
    const container = document.getElementById("listaCards")
    container.innerHTML = ""
    if (!itens.length) {
        // Quando não há anúncios, o próprio estado vazio já exibe o texto SEO.
        renderizarSeoRodape(false)
        renderizarSemResultados(container)
        return
    }
    const inicio = (paginaAtual - 1) * itensPorPagina
    const fim = inicio + itensPorPagina
    const paginaItens = itens.slice(inicio, fim)
    paginaItens.forEach(item => {
        const col = document.createElement("div")
        col.className = "col"
        col.appendChild(criarCardAnuncio(item))
        container.appendChild(col)
    })

    // Com anúncios na página, o texto SEO vai visível abaixo da listagem.
    renderizarSeoRodape(true)
}

// Texto SEO abaixo da listagem quando a página tem anúncios (visível e indexável).
function renderizarSeoRodape(temAnuncios) {
    const rodape = document.getElementById("seo-rodape")
    if (!rodape) return

    if (!temAnuncios) {
        rodape.innerHTML = ""
        return
    }

    const cidade = obterCidadeFiltro()
    const uf = obterUfFiltro()
    const bairro = obterBairroFiltro()

    let prep = "no"
    let local = "Brasil"
    let localHtml = "no <strong>Brasil</strong>"
    if (bairro && cidade) {
        prep = "em"; local = `${bairro}, ${cidade} - ${uf}`; localHtml = `em <strong>${local}</strong>`
    } else if (cidade) {
        prep = "em"; local = `${cidade} - ${uf}`; localHtml = `em <strong>${local}</strong>`
    }

    rodape.innerHTML = `
        <h2 class="seo-rodape-titulo">Comprar carros de particulares ${prep} ${local}</h2>
        <div class="cidade-empty-seo">
            ${conteudoSeoEmptyState(localHtml)}
        </div>
        <div class="cidade-empty-actions" style="margin-top: 16px;">
            <a class="btn btn-danger" href="/comprar">Veja veículos relacionados</a>
        </div>
    `
}

/* ================================
   PAGINAÇÃO
================================ */

function renderizarPaginacao() {
    const totalPaginas = Math.ceil(itens.length / itensPorPagina)
    const ul = document.getElementById("paginacao")
    if (!ul) return
    ul.innerHTML = ""
    if (totalPaginas === 0) return

    ul.innerHTML += `<li class="page-item ${paginaAtual === 1 ? 'disabled' : ''}">
        <button class="page-link" onclick="mudarPagina(${paginaAtual - 1})">Anterior</button>
    </li>`

    const inicio = Math.max(1, paginaAtual - 2)
    const fim = Math.min(totalPaginas, paginaAtual + 2)

    if (inicio > 1) {
        ul.innerHTML += `<li class="page-item"><button class="page-link" onclick="mudarPagina(1)">1</button></li>`
        if (inicio > 2) ul.innerHTML += `<li class="page-item disabled"><span class="page-link">…</span></li>`
    }

    for (let i = inicio; i <= fim; i++) {
        ul.innerHTML += `<li class="page-item ${i === paginaAtual ? 'active' : ''}">
            <button class="page-link" onclick="mudarPagina(${i})">${i}</button>
        </li>`
    }

    if (fim < totalPaginas) {
        if (fim < totalPaginas - 1) ul.innerHTML += `<li class="page-item disabled"><span class="page-link">…</span></li>`
        ul.innerHTML += `<li class="page-item"><button class="page-link" onclick="mudarPagina(${totalPaginas})">${totalPaginas}</button></li>`
    }

    ul.innerHTML += `<li class="page-item ${paginaAtual === totalPaginas ? 'disabled' : ''}">
        <button class="page-link" onclick="mudarPagina(${paginaAtual + 1})">Próximo</button>
    </li>`
}

function mudarPagina(pagina) {
    const totalPaginas = Math.ceil(itens.length / itensPorPagina)
    if (pagina < 1 || pagina > totalPaginas) return
    paginaAtual = pagina
    renderizarCards()
    renderizarPaginacao()
    window.scrollTo({ top: 0, behavior: "smooth" })
}

/* ================================
   BANNER SLIDER
================================ */

async function carregarBanners() {
    try {
        const resp = await fetch('/api/banners')
        if (!resp.ok) return
        const banners = await resp.json()
        if (!banners.length) return

        const wrapper = document.getElementById("bannerWrapper")
        const slider = document.getElementById("bannerSlider")
        const fallback = document.getElementById("bannerFallback")

        banners.forEach(b => {
            const slide = document.createElement("div")
            slide.className = "swiper-slide"
            if (b.link) {
                slide.innerHTML = `<a href="${b.link}"><img src="/uploads/banners/${b.imagem}" alt="${b.titulo || ''}" onerror="this.parentElement.parentElement.remove()"></a>`
            } else {
                slide.innerHTML = `<img src="/uploads/banners/${b.imagem}" alt="${b.titulo || ''}" onerror="this.parentElement.remove()">`
            }
            wrapper.appendChild(slide)
        })

        slider.classList.remove("d-none")
        if (fallback) fallback.classList.add("d-none")

        new Swiper("#bannerSlider", {
            loop: banners.length > 1,
            centeredSlides: true,
            slidesPerView: 1.3,
            spaceBetween: 15,
            speed: 800,
            autoplay: { delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true },
            navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
            breakpoints: { 768: { slidesPerView: 1.5 } }
        })
    } catch (e) {
        console.error("Erro ao carregar banners:", e)
    }
}

/* ================================
   SIDEBAR
================================ */

function toggleFiltro() {
    document.getElementById("sidebar")?.classList.toggle("ativa")
    document.getElementById("overlay")?.classList.toggle("ativo")
}

/* ================================
   INIT
================================ */

document.addEventListener("DOMContentLoaded", () => {
    carregarBanners()
    carregarAnuncios()
});
