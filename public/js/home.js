let itens = []              // lista filtrada (renderizada)
let itensOriginais = []     // lista completa sem filtro
let itensDestaque = []
let itensSecundarios = []
let paginaAtual = 1
const itensPorPagina = 10
let destaquesSwiper = null
let modelosSwiper = null

carregarAnunciosMisturados()

/* ================================
   UTIL
================================ */

function formatarPreco(valor) {
    const numero = Number(valor)
    if (!numero || isNaN(numero)) return "Consulte"
    return numero.toLocaleString('pt-BR')
}


/* ================================
   BUSCA + MISTURA DAS APIS
================================ */

async function carregarAnunciosMisturados() {
    try {
        const [respParticular, respRevenda] = await Promise.all([
            fetch('/api/particular-ativos-home'),
            fetch('/api/anuncios-revenda-ativos')
        ])

        if (!respParticular.ok || !respRevenda.ok) {
            throw new Error("Erro ao buscar anúncios")
        }

        const revendas = await respRevenda.json()
        const particulares = await respParticular.json()


        const particularesFormatados = particulares.map(item => ({
    ...item,
    tipo_anunciante: "particular",
    tipo_carro: item.tipo_carro || item.tipo_automovel || item.tipo
}))

const revendasFormatadas = revendas.map(item => ({
    ...item,
    tipo_anunciante: "revenda",
    nome: item.nome,
    tipo_carro: item.tipo_carro || item.tipo_automovel || item.tipo
}))

        itensOriginais = misturarIntercalado(particularesFormatados, revendasFormatadas)
        itensDestaque = itensOriginais.filter(item => Number(item.destaque) === 1)
        itensSecundarios = montarModelosMaisBuscados(itensOriginais)
        itens = [...itensOriginais]

        preencherSelectUnico("filtroTipo", itensOriginais.map(i => i.tipo_automovel || i.tipo))
        preencherSelectUnico("filtroMarca", itensOriginais.map(i => i.marca))
        preencherSelectUnico("filtroModelo", itensOriginais.map(i => i.versao || i.modelo))

        paginaAtual = 1
        renderizarHome()
        renderizarPaginacao()
        preencherCidadesSelectFilter()
        preencherRevendasSelectFilter()
        aplicarFiltroTipoCarro()

    } catch (erro) {
        console.error(erro)
        document.getElementById("container-card-primary").innerHTML =
            "<p class='text-center text-danger w-100'>Erro ao carregar anúncios</p>"
    }
}

/* ================================
   MISTURA ALEATÓRIA INTERCALADA
================================ */

function misturarIntercalado(arr1, arr2) {
    const resultado = []
    const a = [...arr1]
    const b = [...arr2]

    while (a.length || b.length) {
        const usarA = Math.random() > 0.5

        if ((usarA && a.length) || !b.length) {
            resultado.push(a.splice(Math.floor(Math.random() * a.length), 1)[0])
        } else if (b.length) {
            resultado.push(b.splice(Math.floor(Math.random() * b.length), 1)[0])
        }
    }

    return resultado
}

/* ================================
   FILTROS
================================ */

function aplicarFiltroBusca(texto) {
    const termo = texto.toLowerCase().trim()

    if (!termo) {
        itens = [...itensOriginais]
    } else {
        itens = itensOriginais.filter(item => {
            return (
                (item.marca || "").toLowerCase().includes(termo) ||
                (item.versao || "").toLowerCase().includes(termo) ||
                (item.descricao || "").toLowerCase().includes(termo) ||
                (item.combustivel || "").toLowerCase().includes(termo) ||
                (item.cidade || "").toLowerCase().includes(termo)
            )
        })
    }

    paginaAtual = 1
    renderizarCards("container-card-primary")
    renderizarPaginacao()
}

function aplicarFiltroCidade(cidadeTexto) {
    const termo = cidadeTexto.toLowerCase().trim()

    if (!termo) {
        itens = [...itensOriginais]
    } else {
        itens = itensOriginais.filter(item =>
            (item.cidade || "").toLowerCase().includes(termo)
        )
    }

    paginaAtual = 1
    renderizarCards("container-card-primary")
    renderizarPaginacao()
}

function aplicarFiltroAvancado() {

    const tipo = document.getElementById("filtroTipo")?.value.toLowerCase() || ""
    const marca = document.getElementById("filtroMarca")?.value.toLowerCase() || ""
    const modelo = document.getElementById("filtroModelo")?.value.toLowerCase() || ""

    const buscaMarcaModelo =
        document.getElementById("barraBuscaMarcaModelo")?.value.toLowerCase() || ""

    const anoMin = Number(document.getElementById("filtroAnoMin")?.value) || 0
    const anoMax = Number(document.getElementById("filtroAnoMax")?.value) || Infinity
    const precoMin = Number(document.getElementById("filtroPrecoMin")?.value) || 0
    const precoMax = Number(document.getElementById("filtroPrecoMax")?.value) || Infinity

    itens = itensOriginais.filter(item => {

        const ano = Number(item.ano_modelo) || 0
        const preco = Number(item.preco) || 0

        const matchTipo =
            !tipo || (item.tipo_automovel || item.tipo || "").toLowerCase() === tipo

        const matchMarca =
            !marca || (item.marca || "").toLowerCase() === marca

        const matchModelo =
            !modelo || (item.versao || item.modelo || "").toLowerCase() === modelo

        const matchBuscaMarcaModelo =
            !buscaMarcaModelo ||
            (item.marca || "").toLowerCase().includes(buscaMarcaModelo) ||
            (item.modelo || item.versao || "").toLowerCase().includes(buscaMarcaModelo)

        const matchAno =
            ano >= anoMin && ano <= anoMax

        const matchPreco =
            preco <= precoMax && preco >= precoMin

        return matchTipo && matchMarca && matchModelo && matchAno && matchPreco && matchBuscaMarcaModelo
    })

    paginaAtual = 1
    renderizarCards("container-card-primary")
    renderizarPaginacao()
}

document.getElementById("barraBuscaMarcaModelo").addEventListener("input", aplicarFiltroAvancado)

/* Zerar filtro */
/* document.getElementById("btnZerarFiltro").addEventListener("click", () => {

    // limpar selects
    document.getElementById("filtroMarca").value = ""
    document.getElementById("filtroModelo").value = ""
    document.getElementById("filtroAnoMin").value = "A partir"
    document.getElementById("filtroAnoMax").value = "Até"
    document.getElementById("filtroPrecoMin").value = "A Partir"
    document.getElementById("filtroPrecoMax").value = "Até"
    document.getElementById("barraBuscaMarcaModelo").value =""

    // voltar categoria para carro (ou a primeira)
    const botoesTipo = document.querySelectorAll(".categorias button")

    botoesTipo.forEach((btn, i) => {
        btn.classList.remove("active")
        if (i === 0) btn.classList.add("active")
    })

    // restaurar lista original
    itens = [...itensOriginais]

    paginaAtual = 1
    renderizarCards("container-card-primary")
    renderizarPaginacao()

}) */

function aplicarFiltroRevenda() {

    const cidade = document.getElementById("selectCidadeFilter")?.value.toLowerCase() || ""
    const nomeRevenda = document.getElementById("selectRevendaFilter")?.value.toLowerCase() || ""

    itens = itensOriginais.filter(item => {

        const matchCidade =
            !cidade || (item.cidade || "").toLowerCase() === cidade

        const matchNome =
            !nomeRevenda ||
            (item.nome || "").toLowerCase().includes(nomeRevenda)

        return matchCidade && matchNome
    })

    paginaAtual = 1
    renderizarCards("container-card-primary")
    renderizarPaginacao()
}

/* ================================
   RENDERIZAÇÃO DOS CARDS
================================ */

function renderizarCards(containerId = "container-card-primary", lista = itens) {

    const containers = [document.getElementById(containerId)].filter(Boolean)

    containers.forEach(container => container.innerHTML = "")

    if (!lista.length) {
        containers.forEach(container => {
            container.innerHTML = containerId === "container-card-primary"
                ? "<p class='text-center w-100'>Nenhum veículo em destaque no momento</p>"
                : "<p class='text-center w-100'>Nenhum anúncio encontrado</p>"
        })
        if (containerId === "container-card-primary" && destaquesSwiper) {
            destaquesSwiper.destroy(true, true)
            destaquesSwiper = null
        }
        return
    }

    const inicio = (paginaAtual - 1) * itensPorPagina
    const fim = inicio + itensPorPagina
    const paginaItens = lista.slice(inicio, fim)

    paginaItens.forEach(item => {
        containers.forEach(container => {
            const slide = document.createElement("div")
            slide.className = containerId === "container-card-primary" ? "swiper-slide" : ""
            slide.appendChild(criarCardAnuncio(item))
            container.appendChild(slide)
        })
    })

    if (containerId === "container-card-primary") {
        iniciarDestaquesSwiper(paginaItens.length)
    }
}

function renderizarHome() {
    renderizarCards("container-card-primary", itensDestaque)
    renderizarVeiculosSecundarios()
}

function criarCardAnuncio(item) {
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
                ${formatarPreco(item.preco)}
                <span class="text-dark"> | ${item.ano_modelo || ''}</span>
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

    return wrapper
}

function renderizarVeiculosSecundarios() {
    const container = document.getElementById("container-card-secundary")
    if (!container) return

    container.innerHTML = ""

    const lista = itensSecundarios.length ? itensSecundarios : montarModelosMaisBuscados(itensOriginais)

    if (!lista.length) {
        container.innerHTML = "<p class='text-center text-muted w-100'>Nenhum modelo disponível no momento</p>"
        return
    }

    lista.forEach(item => {
        const slide = document.createElement("div")
        slide.className = "swiper-slide"
        const link = document.createElement("a")
        link.href = `/comprar?busca=${encodeURIComponent(`${item.marca || ""} ${item.modelo || ""}`.trim())}`
        link.className = "home-model-card"

        link.innerHTML = `
            <span class="home-model-info">
                <span class="home-model-brand">${item.marca || "Modelo"}</span>
                <span class="home-model-name">${item.modelo || item.versao || "Veículo"}</span>
                <span class="home-model-meta">${item.total > 1 ? `${item.total} ofertas` : "Ver ofertas"}</span>
            </span>
            <img
                src="${item.imagem ? `/uploads/anuncios/${item.imagem}` : '/img/sem-foto.jpg'}"
                alt="${item.marca || ''} ${item.modelo || item.versao || ''}"
                onerror="this.src='/img/sem-foto.jpg'"
            >
        `

        slide.appendChild(link)
        container.appendChild(slide)
    })

    iniciarModelosSwiper(lista.length)
}

function iniciarDestaquesSwiper(totalSlides) {
    if (destaquesSwiper) {
        destaquesSwiper.destroy(true, true)
        destaquesSwiper = null
    }

    if (!document.getElementById("destaquesSwiper") || typeof Swiper === "undefined") return

    destaquesSwiper = new Swiper("#destaquesSwiper", {
        slidesPerView: "auto",
        spaceBetween: 18,
        speed: 550,
        grabCursor: true,
        watchOverflow: true,
        autoplay: totalSlides > 3 ? {
            delay: 4200,
            disableOnInteraction: false
        } : false,
        navigation: {
            nextEl: ".destaque-next",
            prevEl: ".destaque-prev"
        },
        pagination: {
            el: ".destaque-pagination",
            clickable: true
        },
        breakpoints: {
            0: { slidesPerView: 1.1, spaceBetween: 12 },
            576: { slidesPerView: 2.1, spaceBetween: 14 },
            992: { slidesPerView: "auto", spaceBetween: 18 }
        }
    })
}

function iniciarModelosSwiper(totalSlides) {
    if (modelosSwiper) {
        modelosSwiper.destroy(true, true)
        modelosSwiper = null
    }

    if (!document.getElementById("modelosSwiper") || typeof Swiper === "undefined") return

    modelosSwiper = new Swiper("#modelosSwiper", {
        slidesPerView: "auto",
        spaceBetween: 18,
        speed: 550,
        grabCursor: true,
        watchOverflow: true,
        autoplay: totalSlides > 3 ? {
            delay: 4600,
            disableOnInteraction: false
        } : false,
        navigation: {
            nextEl: ".modelos-next",
            prevEl: ".modelos-prev"
        },
        pagination: {
            el: ".modelos-pagination",
            clickable: true
        },
        breakpoints: {
            0: { slidesPerView: 1.08, spaceBetween: 12 },
            576: { slidesPerView: 2.1, spaceBetween: 14 },
            992: { slidesPerView: "auto", spaceBetween: 18 }
        }
    })
}

function montarModelosMaisBuscados(lista) {
    const mapa = new Map()

    lista
        .filter(item => Number(item.destaque) !== 1)
        .forEach(item => {
            const marca = (item.marca || "").trim()
            const modelo = (item.versao || item.modelo || "").trim()
            if (!marca && !modelo) return

            const chave = `${marca}|${modelo}`.toLowerCase()
            const existente = mapa.get(chave)

            if (existente) {
                existente.total += 1
                if (!existente.imagem && item.imagem) existente.imagem = item.imagem
                return
            }

            mapa.set(chave, {
                marca,
                modelo,
                imagem: item.imagem,
                total: 1
            })
        })

    return [...mapa.values()]
        .sort((a, b) => b.total - a.total)
        .slice(0, 12)
}

function preencherSelectUnico(selectId, lista) {
    const select = document.getElementById(selectId)
    if (!select) return

    const valoresUnicos = [...new Set(lista.filter(Boolean))].sort()

    select.innerHTML = `<option value="">Selecione</option>`

    valoresUnicos.forEach(valor => {
        const option = document.createElement("option")
        option.value = valor
        option.textContent = valor
        select.appendChild(option)
    })
}

function preencherRevendasSelectFilter() {
    const select = document.getElementById("selectRevendaFilter")
    if (!select) return

    const nomeRevenda = itensOriginais

        .filter(item => item.tipo_anunciante === "revenda")
        .map(item => item.nome)
        .filter(Boolean)


    const unicas = [...new Set(nomeRevenda)].sort()

    select.innerHTML = `<option value="">Filtre por Revendas</option>`


    unicas.forEach(nome => {
        const option = document.createElement("option")
        option.value = nome
        option.textContent = nome
        select.appendChild(option)
    })
}

function preencherCidadesSelectFilter() {
    const select = document.getElementById("selectCidadeFilter")
    if (!select) return

    const cidades = itensOriginais

        .map(item => item.cidade)
        .filter(Boolean)

    const estados = itensOriginais

        .map(item => item.estado)
        .filter(Boolean)


    const unicas = [
        ...new Set(
            itensOriginais
                .map(item => `${item.cidade} - ${item.estado}`)
                .filter(item => item && item !== " - ")
        )
    ].sort()

    select.innerHTML = `<option value="">Filtre por cidades</option>`


    unicas.forEach(item => {
        const [cidade, estado] = item.split(" - ")

        const option = document.createElement("option")
        option.value = cidade // 🔥 só a cidade
        option.textContent = item // 👀 cidade - estado (visual)

        select.appendChild(option)
    })
}

function filtrarPorCarroceria(tipoCarroceria) {
    if (!tipoCarroceria) return
    window.location.href = `/carros?carroceria=${encodeURIComponent(tipoCarroceria)}`
}

function filtrarPorMarca(marca) {
    if (!marca) return
    window.location.href = `/carros?marca=${encodeURIComponent(marca)}`
}


/* ================================
   PAGINAÇÃO
================================ */

function renderizarPaginacao() {
    const totalPaginas = Math.ceil(itens.length / itensPorPagina)
    const ul = document.getElementById("paginacao")
    if (!ul) return

    ul.innerHTML = ""
    if (totalPaginas <= 1) return

    ul.innerHTML += `
        <li class="page-item ${paginaAtual === 1 ? 'disabled' : ''}">
            <button class="page-link" onclick="mudarPagina(${paginaAtual - 1})">
                Anterior
            </button>
        </li>
    `

    for (let i = 1; i <= totalPaginas; i++) {
        ul.innerHTML += `
            <li class="page-item ${i === paginaAtual ? 'active' : ''}">
                <button class="page-link" onclick="mudarPagina(${i})">${i}</button>
            </li>
        `
    }

    ul.innerHTML += `
        <li class="page-item ${paginaAtual === totalPaginas ? 'disabled' : ''}">
            <button class="page-link" onclick="mudarPagina(${paginaAtual + 1})">
                Próximo
            </button>
        </li>
    `
}

function mudarPagina(pagina) {
    const totalPaginas = Math.ceil(itens.length / itensPorPagina)
    if (pagina < 1 || pagina > totalPaginas) return

    paginaAtual = pagina
    renderizarCards("container-card-primary")
    window.scrollTo({ top: 0, behavior: "smooth" })
}


/* ================================
   EVENTOS DO FILTRO
================================ */

document.addEventListener("DOMContentLoaded", () => {

    const inputBusca = document.getElementById("buscaRapidaInput")
    const botaoBusca = document.getElementById("btnBuscaRapida")

    if (inputBusca && botaoBusca) {
        botaoBusca.addEventListener("click", () => {
            aplicarFiltroBusca(inputBusca.value)
        })

        inputBusca.addEventListener("keyup", (e) => {
            if (e.key === "Enter") {
                aplicarFiltroBusca(inputBusca.value)
            }
        })
    }

    const inputCidade = document.getElementById("buscaCidadeInput")
    const botaoCidade = document.getElementById("btnBuscaCidade")

    if (inputCidade && botaoCidade) {
        botaoCidade.addEventListener("click", () => {
            aplicarFiltroCidade(inputCidade.value)
        })

        inputCidade.addEventListener("keyup", (e) => {
            if (e.key === "Enter") {
                aplicarFiltroCidade(inputCidade.value)
            }
        })
    }

    const btnFiltroAvancado = document.getElementById("btnFiltroAvancado")

    if (btnFiltroAvancado) {
        btnFiltroAvancado.addEventListener("click", aplicarFiltroAvancado)
    }

    const selectRevendaFilter = document.getElementById("selectRevendaFilter")

    if (selectRevendaFilter) {
        selectRevendaFilter.addEventListener("change", () => {
            aplicarFiltroRevenda()
        })
    }

    const selectCidadeFilter = document.getElementById("selectCidadeFilter")

    if (selectCidadeFilter) {
        selectCidadeFilter.addEventListener("change", () => {
            aplicarFiltroRevenda()

            if (typeof atualizarSliderPorCidade === 'function') {
                atualizarSliderPorCidade(selectCidadeFilter.value)
            }
        })
    }

    document.querySelectorAll(".carroceria-item").forEach(el => {
        el.style.cursor = "pointer"

        el.addEventListener("click", () => {
            const tipo = el.dataset.carroceria
            filtrarPorCarroceria(tipo)
        })
    })

    document.querySelectorAll(".marca-item").forEach(el => {
        el.style.cursor = "pointer"

        el.addEventListener("click", () => {
            const marca = el.dataset.marca
            filtrarPorMarca(marca)
        })
    })

})
