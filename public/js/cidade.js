// ===============================
// ESTADO GLOBAL
// ===============================

let listaAnuncios = []
let listaFiltrada = []
let paginaAtualCidade = 1
const limitePorPagina = 10
let cidadeAtual = null
let cidadeBannerSwiper = null

// ===============================
// UTIL
// ===============================

function criarSlug(texto) {
    return (texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
}

function formatarValor(valor) {
    const numero = Number(valor)
    if (!numero || isNaN(numero)) return "Consulte"
    return numero.toLocaleString("pt-BR")
}

// ===============================
// CAPTURAR SLUG E UF DA URL
// URL: /cidade/:slug/:uf
// ===============================

function obterSlugAtual() {
    const partes = window.location.pathname.split("/")
    // partes = ["", "cidade", "slug", "uf"]
    return partes[2] || ""
}

function obterUfAtual() {
    const partes = window.location.pathname.split("/")
    return partes[3] || ""
}

function formatarNomeCidade(slug) {
    return slug
        .replace(/-/g, " ")
        .replace(/\b\w/g, letra => letra.toUpperCase())
}

function obterNomeCidadeAtual() {
    return cidadeAtual ? cidadeAtual.nome : formatarNomeCidade(obterSlugAtual())
}

function obterEstadoAtual() {
    return cidadeAtual ? cidadeAtual.estado : (listaFiltrada[0]?.estado || obterUfAtual().toUpperCase())
}

function escaparHtml(texto) {
    return String(texto || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
}

function obterUrlBannerCidade(imagem) {
    if (!imagem) return ""
    if (imagem.startsWith("/")) return imagem
    return `/uploads/anuncios/${imagem}`
}

// ===============================
// BUSCAR + FILTRAR ANÚNCIOS
// ===============================

async function carregarAnunciosDaCidade() {
    try {
        const slug = obterSlugAtual()

        const [respParticular, respRevenda] = await Promise.all([
            fetch("/api/particular-ativos-home"),
            fetch("/api/anuncios-revenda-ativos")
        ])

        if (!respParticular.ok || !respRevenda.ok) {
            throw new Error("Erro ao buscar anúncios")
        }

        const particulares = await respParticular.json()
        const revendas = await respRevenda.json()

        // normalizar dados
        const listaParticular = particulares.map(item => ({
            ...item,
            tipoAnunciante: "particular"
        }))

        const listaRevenda = revendas.map(item => ({
            ...item,
            tipoAnunciante: "revenda"
        }))

        // juntar tudo
        listaAnuncios = [...listaParticular, ...listaRevenda]

        // filtrar pela cidade do slug E pelo estado (UF)
        const uf = obterUfAtual()
        listaFiltrada = listaAnuncios.filter(item => {
            const cidadeItem = (item.cidade || "").split("-")[0].trim()
            const slugItem = criarSlug(cidadeItem)
            const estadoItem = (item.estado || "").toLowerCase()
            return slugItem === slug && (!uf || estadoItem === uf)
        })

        atualizarTituloCidade()

        paginaAtualCidade = 1
        renderizarLista()
        renderizarPaginacaoCidade()

    } catch (erro) {
        console.error(erro)
        document.getElementById("container-card-primary").innerHTML =
            "<p class='text-danger text-center'>Erro ao carregar anúncios</p>"
    }
}

// ===============================
// TÍTULO DA PÁGINA
// ===============================

function atualizarTituloCidade() {
    const titulo = document.getElementById("titulo-cidade")

    if (!titulo) return

    const nomeCidade = obterNomeCidadeAtual()
    const estado = obterEstadoAtual()

    if (!listaFiltrada.length) {
        titulo.textContent = `Nenhum anúncio encontrado em ${nomeCidade}, ${estado}`
        return
    }

    titulo.textContent = `Veículos em ${nomeCidade} - ${estado}`
}

// ===============================
// RENDERIZAÇÃO DOS CARDS
// ===============================

function renderizarLista() {
    const container = document.getElementById("container-card-primary")
    container.innerHTML = ""

    if (!listaFiltrada.length) {
        renderizarCidadeSemAnuncios(container)
        return
    }

    container.classList.remove("overflow-visible")
    container.classList.add("overflow-auto")

    const inicio = (paginaAtualCidade - 1) * limitePorPagina
    const fim = inicio + limitePorPagina
    const pagina = listaFiltrada.slice(inicio, fim)

    pagina.forEach(item => {
        const wrapper = document.createElement("div")

        wrapper.innerHTML = `
            <div class="card shadow-sm vehicle-card position-relative"
                 style="width: 280px; cursor: pointer"
                 onclick="window.location.href='/venda?id=${item.id}'">

                ${item.destaque == 1 ? `
                    <span style="
                        position:absolute;
                        top:10px;
                        left:10px;
                        background:#ffc107;
                        color:#000;
                        padding:5px 10px;
                        border-radius:6px;
                        font-size:12px;
                        font-weight:bold;
                        z-index:10;
                    ">
                        ⭐ Destaque
                    </span>
                ` : ''}

                <img
                  src="${item.imagem ? `/uploads/anuncios/${item.imagem}` : '/img/sem-foto.jpg'}"
                  class="card-img-top vehicle-img"
                  onerror="this.src='/img/sem-foto.jpg'"
                >

                <div class="card-body">

                  <h5 class="fw-bold">
                    <span style="color:#000;">${item.marca || ''}</span>
                    <span style="color:#C90B0C;"> ${item.versao || ''}</span>
                  </h5>

                  <p class="small text-secondary mb-1 descricao-card">
                    ${item.descricao || ''}
                  </p>

                  <p class="mb-1 text-secondary">
                    ${item.motorizacao || ''} ${item.combustivel || ''}
                  </p>

                  <p class="fw-bold" style="color:#C90B0C;">
                    ${formatarValor(item.preco)}
                    <span class="text-dark"> | ${item.ano_modelo}</span>
                  </p>

                  <p class="fw-bold d-flex align-items-center gap-2">
                    ${item.tipo_anunciante === "particular"
                        ? `<i class="bi bi-person-fill"></i> Particular`
                        : `<i class="bi bi-building"></i> ${item.nome || "Revenda"}`
                    }
                  </p>

                  <p>
                    <i class="bi bi-geo-alt-fill" style="color:#C90B0C;"></i>
                    ${item.cidade || ''} - ${item.estado || ''}
                  </p>

                </div>
            </div>
        `

        container.appendChild(wrapper)
    })
}

function renderizarCidadeSemAnuncios(container) {
    const nomeCidade = escaparHtml(obterNomeCidadeAtual())
    const estado = escaparHtml(obterEstadoAtual())

    container.classList.remove("overflow-auto")
    container.classList.add("overflow-visible")

    container.innerHTML = `
        <div class="cidade-empty-state">
            <div class="cidade-empty-icon">
                <i class="bi bi-car-front-fill"></i>
            </div>

            <p class="cidade-empty-title">
                Ainda não temos nenhum anúncio cadastrado em
                <strong>${nomeCidade}${estado ? ` - ${estado}` : ""}</strong>
                no momento.
            </p>

            <p class="cidade-empty-promo">
                <strong>Atenção Particulares e Revendas</strong><br>
                Aproveite nossa promoção de lançamento e anuncie seu carro gratuitamente até agosto de 2026.
            </p>

            <div class="cidade-empty-actions">
                <a class="btn btn-danger" href="/anunciar">
                    Anunciar grátis
                </a>
                <a class="btn btn-outline-danger" href="/vender">
                    Ver planos
                </a>
            </div>
        </div>
    `
}

// ===============================
// PAGINAÇÃO
// ===============================

function renderizarPaginacaoCidade() {
    const totalPaginas = Math.ceil(listaFiltrada.length / limitePorPagina)
    const paginacao = document.getElementById("paginacao")

    if (!paginacao) return

    paginacao.innerHTML = ""

    if (totalPaginas <= 1) return

    // anterior
    paginacao.innerHTML += `
        <li class="page-item ${paginaAtualCidade === 1 ? "disabled" : ""}">
            <button class="page-link" onclick="mudarPaginaCidade(${paginaAtualCidade - 1})">
                Anterior
            </button>
        </li>
    `

    // números
    for (let i = 1; i <= totalPaginas; i++) {
        paginacao.innerHTML += `
            <li class="page-item ${i === paginaAtualCidade ? "active" : ""}">
                <button class="page-link" onclick="mudarPaginaCidade(${i})">${i}</button>
            </li>
        `
    }

    // próximo
    paginacao.innerHTML += `
        <li class="page-item ${paginaAtualCidade === totalPaginas ? "disabled" : ""}">
            <button class="page-link" onclick="mudarPaginaCidade(${paginaAtualCidade + 1})">
                Próximo
            </button>
        </li>
    `
}

function mudarPaginaCidade(pagina) {
    const totalPaginas = Math.ceil(listaFiltrada.length / limitePorPagina)

    if (pagina < 1 || pagina > totalPaginas) return

    paginaAtualCidade = pagina
    renderizarLista()

    window.scrollTo({ top: 0, behavior: "smooth" })
}

// ===============================
// CARREGAR DADOS DA CIDADE (banner, imagem)
// ===============================

async function carregarDadosCidade() {
    try {
        const slug = obterSlugAtual()

        const res = await fetch("/api/cidades")
        const cidades = await res.json()

        const uf = obterUfAtual()
        const cidade = cidades.find(c => criarSlug(c.nome) === slug && c.estado.toLowerCase() === uf)

        if (!cidade) return

        cidadeAtual = cidade

        const elNome = document.getElementById("cidade-nome")
        const elEstado = document.getElementById("cidade-estado")

        if (elNome) elNome.textContent = cidade.nome
        if (elEstado) elEstado.textContent = cidade.estado

        await carregarBannersCidade()

    } catch (erro) {
        console.error("Erro ao carregar dados da cidade:", erro)
        renderizarBannerFallback()
    }
}

async function carregarBannersCidade() {
    const wrapper = document.getElementById("cidadeBannerWrapper")
    if (!wrapper) return

    try {
        const slug = obterSlugAtual()
        const uf = obterUfAtual()
        const res = await fetch(`/api/cidades/${encodeURIComponent(slug)}/${encodeURIComponent(uf)}/banners`)

        if (!res.ok) {
            renderizarBannerFallback()
            return
        }

        const banners = await res.json()
        const imagens = banners
            .map(banner => obterUrlBannerCidade(banner.imagem))
            .filter(Boolean)

        if (!imagens.length) {
            renderizarBannerFallback()
            return
        }

        wrapper.innerHTML = imagens.map((src, index) => `
            <div class="swiper-slide">
                <img
                    src="${escaparHtml(src)}"
                    class="cidade-banner-img"
                    alt="Banner de ${escaparHtml(obterNomeCidadeAtual())}${index > 0 ? ` ${index + 1}` : ""}"
                    loading="${index === 0 ? "eager" : "lazy"}"
                    onerror="this.closest('.swiper-slide').remove()"
                >
            </div>
        `).join("")

        iniciarSliderCidade(imagens.length)

    } catch (erro) {
        console.error("Erro ao carregar banners da cidade:", erro)
        renderizarBannerFallback()
    }
}

function iniciarSliderCidade(totalBanners) {
    if (cidadeBannerSwiper) {
        cidadeBannerSwiper.destroy(true, true)
        cidadeBannerSwiper = null
    }

    cidadeBannerSwiper = new Swiper("#cidadeBannerSlider", {
        loop: totalBanners > 1,
        speed: 900,
        effect: "fade",
        fadeEffect: {
            crossFade: true
        },
        autoplay: totalBanners > 1 ? {
            delay: 4000,
            disableOnInteraction: false
        } : false,
        pagination: {
            el: "#cidadeBannerSlider .swiper-pagination",
            clickable: true
        },
        navigation: {
            nextEl: "#cidadeBannerSlider .swiper-button-next",
            prevEl: "#cidadeBannerSlider .swiper-button-prev"
        }
    })
}

function renderizarBannerFallback() {
    const wrapper = document.getElementById("cidadeBannerWrapper")
    if (!wrapper) return

    wrapper.innerHTML = `
        <div class="swiper-slide">
            <div class="cidade-banner-fallback"></div>
        </div>
    `

    iniciarSliderCidade(1)
}

// ===============================
// INIT
// ===============================

document.addEventListener("DOMContentLoaded", async () => {
    await carregarDadosCidade()
    carregarAnunciosDaCidade()
})
