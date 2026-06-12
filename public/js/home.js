let itens = []              // lista filtrada (renderizada)
let itensOriginais = []     // lista de destaques sem filtro
let todosItensOriginais = [] // lista completa para secoes auxiliares
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
    return `R$ ${numero.toLocaleString('pt-BR')}`
}

function formatarKm(valor) {
    if (valor === null || valor === undefined || valor === "") return ""
    const numero = Number(valor)
    if (isNaN(numero)) return ""
    return `${numero.toLocaleString("pt-BR")} km`
}

function montarDetalhesPrincipais(item) {
    return [
        item.motorizacao,
        item.portas ? `${item.portas}P` : "",
        item.cambio
    ].filter(Boolean).join(" ")
}

function montarDetalhesSecundarios(item) {
    return [
        item.combustivel,
        formatarKm(item.km)
    ].filter(Boolean).join(" | ")
}

function montarLocalizacao(item) {
    const cidadeEstado = [item.cidade, item.estado].filter(Boolean).join(" - ")
    return item.bairro ? `${item.bairro}, ${cidadeEstado}` : cidadeEstado
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

function montarUrlVenda(item) {
    const marcaModelo = criarSlugVenda([item.marca, item.versao || item.modelo].filter(Boolean).join(" ")) || "veiculo"
    const cidade = criarSlugVenda(item.cidade) || "cidade"
    const estado = criarSlugVenda(item.estado) || "estado"

    return `/venda/${marcaModelo}/${cidade}/${estado}`
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

        todosItensOriginais = misturarIntercalado(particularesFormatados, revendasFormatadas)
        itensDestaque = todosItensOriginais.filter(item => Number(item.destaque) === 1)
        itensSecundarios = montarModelosMaisBuscados(todosItensOriginais)
        itensOriginais = [...itensDestaque]
        itens = [...itensDestaque]

        preencherSelectUnico("filtroTipo", todosItensOriginais.map(i => i.tipo_automovel || i.tipo_carro || i.tipo))
        preencherSelectUnico("filtroMarca", todosItensOriginais.map(i => i.marca))
        preencherSelectUnico("filtroModelo", todosItensOriginais.map(i => i.versao || i.modelo))

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

function obterBaseFiltro(temFiltro) {
    return temFiltro ? todosItensOriginais : itensOriginais
}

function normalizarTipoHome(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
}

function obterTipoCategoriaAtiva() {
    return normalizarTipoHome(document.querySelector(".categorias button.active")?.dataset.tipo || "")
}

function itemEhDaCategoriaAtiva(item) {
    const tipoAtivo = obterTipoCategoriaAtiva()
    if (!tipoAtivo) return true
    return normalizarTipoHome(item.tipo_carro || item.tipo_automovel || item.tipo) === tipoAtivo
}

function aplicarFiltroBusca(texto) {
    const termo = texto.toLowerCase().trim()
    const base = obterBaseFiltro(Boolean(termo))

    if (!termo) {
        itens = [...itensOriginais]
    } else {
        itens = base.filter(item => {
            const matchBusca =
                (item.marca || "").toLowerCase().includes(termo) ||
                (item.versao || "").toLowerCase().includes(termo) ||
                (item.descricao || "").toLowerCase().includes(termo) ||
                (item.combustivel || "").toLowerCase().includes(termo) ||
                (item.cidade || "").toLowerCase().includes(termo)

            return itemEhDaCategoriaAtiva(item) && matchBusca
        })
    }

    paginaAtual = 1
    renderizarCards("container-card-primary")
    renderizarPaginacao()
}

function aplicarFiltroCidade(cidadeTexto) {
    const termo = cidadeTexto.toLowerCase().trim()
    const base = obterBaseFiltro(Boolean(termo))

    if (!termo) {
        itens = [...itensOriginais]
    } else {
        itens = base.filter(item =>
            itemEhDaCategoriaAtiva(item) &&
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
    const temFiltro =
        Boolean(tipo || marca || modelo || buscaMarcaModelo) ||
        anoMin > 0 ||
        anoMax !== Infinity ||
        precoMin > 0 ||
        precoMax !== Infinity
    const base = obterBaseFiltro(temFiltro)

    itens = base.filter(item => {

        const ano = Number(item.ano_modelo) || 0
        const preco = Number(item.preco) || 0

        const matchTipo =
            !tipo || (item.tipo_automovel || item.tipo_carro || item.tipo || "").toLowerCase() === tipo

        const matchCategoria =
            itemEhDaCategoriaAtiva(item)

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

        return matchCategoria && matchTipo && matchMarca && matchModelo && matchAno && matchPreco && matchBuscaMarcaModelo
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
    const base = obterBaseFiltro(Boolean(cidade || nomeRevenda))

    itens = base.filter(item => {

        const matchCidade =
            !cidade || cidadeEstaNoAnuncio(item, cidade)

        const matchNome =
            !nomeRevenda ||
            (item.nome || "").toLowerCase().includes(nomeRevenda)

        return itemEhDaCategoriaAtiva(item) && matchCidade && matchNome
    })

    paginaAtual = 1
    renderizarCards("container-card-primary")
    renderizarPaginacao()
}

function obterCidadesAtendimento(item) {
    if (!item || !item.cidades_atendimento) return []

    if (Array.isArray(item.cidades_atendimento)) return item.cidades_atendimento

    try {
        return JSON.parse(item.cidades_atendimento) || []
    } catch (error) {
        return []
    }
}

function cidadeEstaNoAnuncio(item, cidade) {
    if ((item.cidade || "").toLowerCase() === cidade) return true

    return obterCidadesAtendimento(item).some(cidadeAtendimento =>
        (cidadeAtendimento.cidade || "").toLowerCase() === cidade
    )
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
    renderizarCards("container-card-primary")
    renderizarVeiculosSecundarios()
}

function criarCardAnuncio(item) {
    const wrapper = document.createElement("div")
    const detalhesPrincipais = montarDetalhesPrincipais(item)
    const detalhesSecundarios = montarDetalhesSecundarios(item)
    const localizacao = montarLocalizacao(item)

    wrapper.innerHTML = `
        <div class="card shadow-sm vehicle-card position-relative"
             style="cursor: pointer; border-radius: 6px; overflow: hidden;"
             onclick="window.location.href='${montarUrlVenda(item)}'">

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
              style="height:182px;object-fit:cover;"
              onerror="this.src='/img/sem-foto.jpg'"
            >

            <div class="card-body d-flex flex-column" style="padding:14px 16px 12px;">
              <h5 class="fw-bold text-uppercase mb-1" style="font-size:1rem; line-height:1.2;">
                <span style="color:#1f2328;">${item.marca || ''}</span>
                <span style="color:#C90B0C;"> ${item.versao || ''}</span>
              </h5>

              <p class="mb-2" style="color:#666; font-size:.88rem; line-height:1.25; font-weight:600;">
                ${detalhesPrincipais || "&nbsp;"}
              </p>

              <div class="d-flex align-items-baseline mb-1" style="gap:6px;">
                <strong style="color:#C90B0C; font-size:1.18rem; line-height:1;">
                  ${formatarPreco(item.preco)}
                </strong>
                <strong style="color:#2b2f36; font-size:1.05rem;">
                  ${item.ano_modelo ? `| ${item.ano_modelo}` : ""}
                </strong>
              </div>

              <p class="mb-2" style="color:#666; font-size:.84rem; line-height:1.25; font-weight:600;">
                ${detalhesSecundarios || "&nbsp;"}
              </p>

              <p class="small fw-bold mb-1 d-flex align-items-center gap-1 mt-auto" style="font-size:.83rem;">
                ${item.tipo_anunciante === "particular"
            ? `<i class="bi bi-person-fill"></i> Particular`
            : `<i class="bi bi-building"></i> ${item.nome || "Revenda"}`
        }
              </p>

              <p class="small mb-0 text-truncate" style="min-width:0; color:#3f4650; font-size:.88rem;">
                <i class="bi bi-geo-alt-fill" style="color:#C90B0C;"></i>
                ${localizacao}
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

    const lista = itensSecundarios.length ? itensSecundarios : montarModelosMaisBuscados(todosItensOriginais)

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
        spaceBetween: 12,
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
            0: { slidesPerView: 1, spaceBetween: 12, centeredSlides: true },
            576: { slidesPerView: 2, spaceBetween: 14, centeredSlides: false },
            992: { slidesPerView: 4, spaceBetween: 18, centeredSlides: false }
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

    const revendasUnicas = new Map()
    todosItensOriginais
        .filter(item => item.tipo_anunciante === "revenda" && item.nome)
        .forEach(item => {
            if (!revendasUnicas.has(item.nome)) revendasUnicas.set(item.nome, item)
        })

    select.innerHTML = `<option value="">Revendas e Concessionárias</option>`

    ;[...revendasUnicas.values()]
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
        .forEach(item => {
            const option = document.createElement("option")
            const segmentos = [
                criarSlugVenda(item.nome),
                criarSlugVenda(item.bairro),
                criarSlugVenda(item.cidade),
                criarSlugVenda(item.estado)
            ].filter(Boolean).join('/')
            option.value = `/revenda/${segmentos}`
            option.textContent = item.nome
            select.appendChild(option)
        })
}

function preencherCidadesSelectFilter() {
    const select = document.getElementById("selectCidadeFilter")
    if (!select) return

    const unicas = [
        ...new Set(
            todosItensOriginais
                .flatMap(item => [
                    { cidade: item.cidade, estado: item.estado },
                    ...obterCidadesAtendimento(item)
                ])
                .filter(item => item.cidade && item.estado)
                .map(item => `${item.cidade} - ${item.estado}`)
        )
    ].sort()

    select.innerHTML = `<option value="">Carros por Cidade</option>`

    unicas.forEach(item => {
        const [cidade, uf] = item.split(" - ")
        const option = document.createElement("option")
        option.value = `${cidade}|${uf}` // cidade|estado para navegação
        option.textContent = item // cidade - estado (visual)
        select.appendChild(option)
    })
}

function filtrarPorCarroceria(tipoCarroceria) {
    if (!tipoCarroceria) return
    const slug = tipoCarroceria.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    window.location.href = `/carros/carroceria/${slug}`
}

function filtrarPorMarca(marca) {
    if (!marca) return
    const slug = marca.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    window.location.href = `/carros/${slug}`
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
            const url = selectRevendaFilter.value
            if (url) {
                window.location.href = url
            }
        })
    }

    const selectCidadeFilter = document.getElementById("selectCidadeFilter")

    if (selectCidadeFilter) {
        selectCidadeFilter.addEventListener("change", () => {
            const value = selectCidadeFilter.value
            if (!value) return

            const [cidadeNome, uf] = value.split('|')
            const cidadeSlug = criarSlugVenda(cidadeNome)
            const ufSlug = (uf || '').toLowerCase().trim()
            const tipoAtivo = obterTipoCategoriaAtiva()

            let tipo = 'carros'
            if (tipoAtivo === 'moto') tipo = 'motos'
            else if (tipoAtivo === 'utilitario') tipo = 'utilitarios'

            window.location.href = `/${tipo}/${cidadeSlug}/${ufSlug}`
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
