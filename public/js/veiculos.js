// ===============================
// ESTADO GLOBAL
// ===============================

let listaVeiculos = []
let paginaAtual = 1
const limitePorPagina = 12

const tipoMap = { carros: 'Carro', motos: 'Moto', utilitarios: 'Utilitário' }

// ===============================
// UTIL
// ===============================

function formatarValor(valor) {
    const numero = Number(valor)
    if (!numero || isNaN(numero)) return "Consulte"
    return numero.toLocaleString("pt-BR")
}

function capitalize(texto) {
    return (texto || "").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())
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

function escaparHtml(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
}

function obterLocalizacaoEmptyState() {
    const filtro = window.FILTRO || {}

    if (filtro.cidade) {
        const cidade = obterCidadeFiltro()
        const uf = obterUfFiltro()
        return {
            titulo: uf ? `${cidade}, ${uf}` : cidade,
            texto: uf ? `${cidade} - ${uf}` : cidade,
            preposicao: "em"
        }
    }

    return {
        titulo: "Brasil",
        texto: "Brasil",
        preposicao: "no"
    }
}

function obterTipoEmptyState() {
    const filtro = window.FILTRO || {}
    const isMoto = filtro.tipo === "motos"
    const isUtilitario = filtro.tipo === "utilitarios"

    return {
        nome: isMoto ? "moto" : isUtilitario ? "utilitário" : "carro",
        artigo: isMoto ? "sua" : "seu",
        chamada: isMoto ? "Venda sua moto" : isUtilitario ? "Venda seu utilitário" : "Venda seu carro",
        icon: isMoto ? "bi-bicycle" : isUtilitario ? "bi-truck" : "bi-car-front-fill"
    }
}

// ===============================
// CAPTURAR FILTRO DA URL
// Suporta:
//   /veiculos/:estado/:cidade/:bairro  ← NOVO
//   /carros, /motos                    ← existentes
//   ?marca=X, ?carroceria=X, ?busca=X  ← existentes
// ===============================

async function carregarVeiculos() {
    try {
        const filtro = window.FILTRO || {}
        const query = new URLSearchParams(window.location.search)
        const params = new URLSearchParams()

        if (filtro.tipo && tipoMap[filtro.tipo]) {
            params.set('tipo', tipoMap[filtro.tipo])
        }

        if (filtro.cidade) params.set('cidade', filtro.cidade)
        if (filtro.uf) params.set('uf', filtro.uf)
        if (filtro.bairro) params.set('bairro', filtro.bairro)   // ← NOVO

        if (query.get('marca')) params.set('marca', query.get('marca'))
        if (query.get('carroceria')) params.set('carroceria', query.get('carroceria'))
        if (query.get('busca')) params.set('busca', query.get('busca'))

        const resp = await fetch(`/api/veiculos?${params.toString()}`)
        if (!resp.ok) throw new Error("Erro ao buscar veículos")

        listaVeiculos = await resp.json()

        atualizarTitulos()
        paginaAtual = 1
        renderizarLista()
        renderizarPaginacao()

    } catch (erro) {
        console.error(erro)
        document.getElementById("container-card-primary").innerHTML =
            "<p class='text-danger text-center'>Erro ao carregar veículos</p>"
    } finally {
        const loading = document.getElementById("loading")
        if (loading) loading.style.display = "none"
    }
}

// ===============================
// TÍTULOS
// ===============================

function atualizarTitulos() {
    const filtro = window.FILTRO || {}
    const query = new URLSearchParams(window.location.search)
    const tipoNome = capitalize(filtro.tipo || "veículos")
    const tituloPagina = document.getElementById("titulo-pagina")
    const subtitulo = document.getElementById("subtitulo-pagina")
    const tituloResultados = document.getElementById("titulo-resultados")
    const totalEl = document.getElementById("total-resultados")

    let titulo = `${tipoNome} à Venda`
    let sub = `Encontre os melhores ${(filtro.tipo || "veículos")} no TEMCAR`

    if (filtro.bairro) {
        // ← NOVO: título com bairro
        titulo = `${tipoNome} em ${obterBairroFiltro()}, ${obterCidadeFiltro()} - ${obterUfFiltro()}`
        sub = `Ofertas de ${(filtro.tipo || "veículos")} no seu bairro`
    } else if (filtro.cidade) {
        titulo = `${tipoNome} em ${obterCidadeFiltro()} - ${obterUfFiltro()}`
        sub = `Ofertas de ${(filtro.tipo || "veículos")} na sua cidade`
    } else if (query.get('marca')) {
        titulo = `${tipoNome} ${query.get('marca')} à Venda`
        sub = `Ofertas da marca ${query.get('marca')} no TEMCAR`
    } else if (query.get('carroceria')) {
        titulo = `${tipoNome} por Carroceria: ${capitalize(query.get('carroceria'))}`
        sub = `Encontre veículos do tipo ${capitalize(query.get('carroceria'))}`
    } else if (query.get('busca')) {
        titulo = `Resultado para ${query.get('busca')}`
        sub = `Veículos encontrados para sua busca`
    }

    if (tituloPagina) tituloPagina.textContent = titulo
    if (subtitulo) subtitulo.textContent = sub
    if (tituloResultados) tituloResultados.textContent = `${listaVeiculos.length} ${(filtro.tipo || "veículos")} encontrados`
    if (totalEl) totalEl.textContent = ""
}

// ===============================
// RENDERIZAÇÃO DOS CARDS
// ===============================

function renderizarLista() {
    const container = document.getElementById("container-card-primary")
    container.innerHTML = ""

    if (!listaVeiculos.length) {
        renderizarSemResultados(container)
        return
    }

    const inicio = (paginaAtual - 1) * limitePorPagina
    const fim = inicio + limitePorPagina
    const pagina = listaVeiculos.slice(inicio, fim)

    pagina.forEach(item => {
        const col = document.createElement("div")
        col.className = "col-12 col-sm-6 col-md-4 col-lg-3"

        col.innerHTML = `
            <div class="card shadow-sm h-100 position-relative"
                 style="cursor: pointer"
                 onclick="window.location.href='/venda?id=${item.id}'">

                ${item.destaque == 1 ? `
                    <span style="
                        position:absolute;top:10px;left:10px;
                        background:#ffc107;color:#000;
                        padding:5px 10px;border-radius:6px;
                        font-size:12px;font-weight:bold;z-index:10;">
                        ⭐ Destaque
                    </span>` : ''}

                <img
                  src="${item.imagem ? '/uploads/anuncios/' + item.imagem : '/img/sem-foto.jpg'}"
                  class="card-img-top"
                  style="height:200px;object-fit:cover;"
                  onerror="this.src='/img/sem-foto.jpg'"
                  alt="${item.marca || ''} ${item.versao || ''}"
                >

                <div class="card-body">
                  <h5 class="fw-bold mb-1" style="font-size:0.95rem;">
                    <span style="color:#000;">${item.marca || ''}</span>
                    <span style="color:#C90B0C;"> ${item.versao || ''}</span>
                  </h5>

                  <p class="small text-secondary mb-1 descricao-card">
                    ${item.descricao || ''}
                  </p>

                  <p class="mb-1 small text-secondary">
                    ${item.motorizacao || ''} ${item.combustivel || ''}
                  </p>

                  <p class="fw-bold mb-1" style="color:#C90B0C;">
                    R$ ${formatarValor(item.preco)}
                    <span class="text-dark"> | ${item.ano_modelo || ''}</span>
                  </p>

                  <p class="small fw-bold mb-1 d-flex align-items-center gap-1">
                    ${item.tipo_anunciante === "particular"
                ? '<i class="bi bi-person-fill"></i> Particular'
                : '<i class="bi bi-building"></i> ' + (item.nome || "Revenda")
            }
                  </p>

                  <p class="small mb-0">
                    <i class="bi bi-geo-alt-fill" style="color:#C90B0C;"></i>
                    ${item.cidade || ''} - ${item.estado || ''}
                    ${item.bairro ? ' · ' + item.bairro : ''}
                  </p>
                </div>
            </div>
        `

        container.appendChild(col)
    })
}

function renderizarSemResultados(container) {
    const tituloResultados = document.getElementById("titulo-resultados")
    const localizacao = obterLocalizacaoEmptyState()
    const tipo = obterTipoEmptyState()

    if (tituloResultados) tituloResultados.textContent = ""

    container.innerHTML = `
        <div class="col-12">
            <h2 class="veiculos-empty-heading">${escaparHtml(localizacao.titulo)}</h2>

            <div class="veiculos-empty-state">
                <div class="veiculos-empty-icon">
                    <i class="bi ${tipo.icon}"></i>
                </div>

                <p class="veiculos-empty-title">
                    ${tipo.chamada} ${localizacao.preposicao}
                    <strong>${escaparHtml(localizacao.texto)}</strong>
                </p>

                <p class="veiculos-empty-promo">
                    <strong>Atenção Particulares e Revendas</strong><br>
                    Aproveite nossa promoção de lançamento e anuncie ${tipo.artigo} ${tipo.nome} gratuitamente até agosto de 2026.
                </p>

                <div class="veiculos-empty-actions">
                    <a class="btn btn-danger" href="/vender">
                        Anunciar grátis
                    </a>
                </div>
            </div>
        </div>
    `
}

// ===============================
// PAGINAÇÃO
// ===============================

function renderizarPaginacao() {
    const totalPaginas = Math.ceil(listaVeiculos.length / limitePorPagina)
    const paginacao = document.getElementById("paginacao")

    if (!paginacao) return
    paginacao.innerHTML = ""
    if (totalPaginas <= 1) return

    paginacao.innerHTML += `
        <li class="page-item ${paginaAtual === 1 ? "disabled" : ""}">
            <button class="page-link" onclick="mudarPagina(${paginaAtual - 1})">Anterior</button>
        </li>
    `

    const inicio = Math.max(1, paginaAtual - 2)
    const fim = Math.min(totalPaginas, paginaAtual + 2)

    for (let i = inicio; i <= fim; i++) {
        paginacao.innerHTML += `
            <li class="page-item ${i === paginaAtual ? "active" : ""}">
                <button class="page-link" onclick="mudarPagina(${i})">${i}</button>
            </li>
        `
    }

    paginacao.innerHTML += `
        <li class="page-item ${paginaAtual === totalPaginas ? "disabled" : ""}">
            <button class="page-link" onclick="mudarPagina(${paginaAtual + 1})">Próximo</button>
        </li>
    `
}

function mudarPagina(pagina) {
    const totalPaginas = Math.ceil(listaVeiculos.length / limitePorPagina)
    if (pagina < 1 || pagina > totalPaginas) return
    paginaAtual = pagina
    renderizarLista()
    renderizarPaginacao()
    window.scrollTo({ top: 0, behavior: "smooth" })
}

// ===============================
// BANNER SLIDER
// ===============================

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

// ===============================
// INIT
// ===============================

document.addEventListener("DOMContentLoaded", () => {
    carregarBanners()
    carregarVeiculos()
})
