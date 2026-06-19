// ===============================
// ESTADO GLOBAL
// ===============================

let listaVeiculos = []
let listaVeiculosOriginal = []
let paginaAtual = 1
const limitePorPagina = 12
let bannerSwiperInstancia = null

const tipoMap = {
    carros: 'Carro',
    carro: 'Carro',
    Carro: 'Carro',
    motos: 'Moto',
    moto: 'Moto',
    Moto: 'Moto',
    utilitarios: 'Utilitário',
    utilitario: 'Utilitário',
    Utilitário: 'Utilitário',
    Utilitario: 'Utilitário'
}

// ===============================
// UTIL
// ===============================

function ordenarComDestaque(lista) {
    const shuffle = arr => arr.sort(() => Math.random() - 0.5)
    return [
        ...shuffle(lista.filter(v => v.destaque == 1)),
        ...shuffle(lista.filter(v => v.destaque != 1))
    ]
}

function formatarValor(valor) {
    const numero = Number(valor)
    if (!numero || isNaN(numero)) return "Consulte"
    return numero.toLocaleString("pt-BR")
}

function formatarKm(valor) {
    if (valor === null || valor === undefined || valor === "") return ""
    const numero = Number(valor)
    if (isNaN(numero)) return ""
    return `${numero.toLocaleString("pt-BR")} km`
}

function formatarPreco(valor) {
    const preco = formatarValor(valor)
    return preco === "Consulte" ? preco : `R$ ${preco}`
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
    const cidadeEstado = [item.cidade, item.estado].filter(Boolean).join(", ")
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

function slugify(texto) {
    return (texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
}

function valorFiltroLocal(chaveSlug, chaveNome, queryKey) {
    const filtro = window.FILTRO || {}
    const query = new URLSearchParams(window.location.search)
    return filtro[chaveNome] || filtro[chaveSlug] || query.get(queryKey) || ""
}

function obterCidadeFiltro() {
    const filtro = window.FILTRO || {}
    const query = new URLSearchParams(window.location.search)
    return filtro.cidadeNome || capitalize(filtro.cidade || query.get('cidade'))
}

function obterBairroFiltro() {
    const filtro = window.FILTRO || {}
    const query = new URLSearchParams(window.location.search)
    return filtro.bairroNome || capitalize(filtro.bairro || query.get('bairro'))
}

function obterUfFiltro() {
    const filtro = window.FILTRO || {}
    const query = new URLSearchParams(window.location.search)
    return (filtro.ufNome || filtro.uf || query.get('uf') || query.get('estado') || "").toUpperCase()
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

    const query = new URLSearchParams(window.location.search)
    const cidadeFiltro = filtro.cidade || query.get('cidade')
    const ufFiltro = filtro.uf || query.get('uf') || query.get('estado')

    if (cidadeFiltro) {
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

function obterTextoSeoEmptyState(localizacao, tipo) {
    const seo = window.SEO_PAGINA || {}
    const dados = seo.dados_contexto || {}
    const filtro = window.FILTRO || {}
    const query = new URLSearchParams(window.location.search)
    const temFiltroLocal = Boolean(
        filtro.bairro ||
        filtro.cidade ||
        filtro.uf ||
        query.get("bairro") ||
        query.get("cidade") ||
        query.get("uf") ||
        query.get("estado")
    )
    const template = String(seo.descricao_template || "")
    const marcadorCidade = "#cidade"
    const indiceCidade = template.indexOf(marcadorCidade)

    if (indiceCidade < 0) {
        return `${tipo.chamada} ${localizacao.preposicao} <strong>${escaparHtml(localizacao.texto)}</strong>`
    }

    const trechoAntesCidade = template.slice(0, indiceCidade)
    const cidade = temFiltroLocal ? (dados.cidade || obterCidadeFiltro() || localizacao.texto) : "Brasil"
    const estado = temFiltroLocal ? (dados.estado || obterUfFiltro()) : ""
    const bairro = temFiltroLocal ? (dados.bairro || obterBairroFiltro()) : ""
    const tipoSeo = dados.tipo || tipo.nome

    const textoAntes = trechoAntesCidade
        .replaceAll("#estado", estado)
        .replaceAll("#bairro", bairro)
        .replaceAll("#veiculo", tipoSeo)
        .replaceAll("#tipo", tipoSeo)
        .replace(/\s+/g, " ")
        .trim()

    const local = estado ? `${cidade} - ${estado}` : cidade
    const separador = textoAntes ? " " : ""

    return `${escaparHtml(textoAntes)}${separador}<strong>${escaparHtml(local)}</strong>`
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

        const tipoSelecionado = filtro.tipo || query.get('tipo') || ""
        const cidadeSelecionada = valorFiltroLocal('cidade', 'cidadeNome', 'cidade')
        const bairroSelecionado = valorFiltroLocal('bairro', 'bairroNome', 'bairro')
        const ufSelecionada = filtro.ufNome || filtro.uf || query.get('uf') || query.get('estado') || ""

        if (tipoSelecionado && tipoMap[tipoSelecionado]) {
            params.set('tipo', tipoMap[tipoSelecionado])
        }

        if (cidadeSelecionada) params.set('cidade', cidadeSelecionada)
        if (ufSelecionada) params.set('uf', ufSelecionada)
        if (bairroSelecionado) params.set('bairro', bairroSelecionado)

        const marcaParam = filtro.marcaNome || filtro.marca || query.get('marca') || query.get('marcas')
        if (marcaParam) params.set('marca', marcaParam)
        const carroceriaParam = filtro.carroceriaNome || filtro.carroceria || query.get('carroceria')
        if (carroceriaParam) params.set('carroceria', carroceriaParam)
        const buscaParam = filtro.modeloNome || filtro.modelo || query.get('busca')
        if (buscaParam) params.set('busca', buscaParam)

        const resp = await fetch(`/api/veiculos?${params.toString()}`)
        if (!resp.ok) throw new Error("Erro ao buscar veículos")

        listaVeiculos = await resp.json()
        listaVeiculosOriginal = ordenarComDestaque([...listaVeiculos])
        listaVeiculos = [...listaVeiculosOriginal]

        controlarVisibilidadeSidebar(listaVeiculosOriginal.length)
        montarFiltrosDinamicos()
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
    const tipoNomeDisplay = { carros: 'Carros', motos: 'Motos', utilitarios: 'Carros Utilitários' }
    const tipoNome = tipoNomeDisplay[filtro.tipo] || capitalize(filtro.tipo || "veículos")
    const tituloPagina = document.getElementById("titulo-pagina")
    const subtitulo = document.getElementById("subtitulo-pagina")
    const tituloResultados = document.getElementById("titulo-resultados")
    const totalEl = document.getElementById("total-resultados")
    const marcaTermo = query.get('marca') || query.get('marcas')
    const carroceriaTermo = query.get('carroceria')
    const termo = [marcaTermo, carroceriaTermo ? capitalize(carroceriaTermo) : ""].filter(Boolean).join(" ")
    const temCidade = filtro.cidade || query.get('cidade')
    const temBairro = filtro.bairro || query.get('bairro')
    const temUf = filtro.uf || query.get('uf') || query.get('estado')

    let titulo = `${tipoNome} à Venda`
    let sub = `Encontre os melhores ${(filtro.tipo || "veículos")} no TEMCAR`

    if (termo && temBairro) {
        titulo = `${tipoNome} ${termo} em ${obterBairroFiltro()}, ${obterCidadeFiltro()} - ${obterUfFiltro()}`
        sub = `Ofertas de ${termo} no seu bairro`
    } else if (termo && temCidade) {
        titulo = `${tipoNome} ${termo} em ${obterCidadeFiltro()} - ${obterUfFiltro()}`
        sub = `Ofertas de ${termo} na sua cidade`
    } else if (termo && temUf) {
        titulo = `${tipoNome} ${termo} em ${obterUfFiltro()}`
        sub = `Ofertas de ${termo} no seu estado`
    } else if (termo) {
        titulo = `${tipoNome} ${termo} à Venda`
        sub = `Ofertas de ${termo} no TEMCAR`
    } else if (temBairro) {
        titulo = `${tipoNome} em ${obterBairroFiltro()}, ${obterCidadeFiltro()} - ${obterUfFiltro()}`
        sub = `Ofertas de ${(filtro.tipo || "veículos")} no seu bairro`
    } else if (temCidade) {
        titulo = `${tipoNome} em ${obterCidadeFiltro()} - ${obterUfFiltro()}`
        sub = `Ofertas de ${(filtro.tipo || "veículos")} na sua cidade`
    } else if (temUf) {
        titulo = `${tipoNome} em ${obterUfFiltro()}`
        sub = `Ofertas de ${(filtro.tipo || "veículos")} no seu estado`
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
        col.className = "col-12 col-sm-6 col-lg-4 col-xl-3"
        const detalhesPrincipais = montarDetalhesPrincipais(item)
        const detalhesSecundarios = montarDetalhesSecundarios(item)
        const localizacao = montarLocalizacao(item)

        col.innerHTML = `
            <div class="card shadow-sm h-100 position-relative"
                 style="cursor: pointer; border-radius: 6px; overflow: hidden;"
                 onclick="window.location.href='${montarUrlVenda(item)}'">

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
                  style="height:182px;object-fit:cover;"
                  onerror="this.src='/img/sem-foto.jpg'"
                  alt="${item.marca || ''} ${item.versao || ''}"
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
                ? '<i class="bi bi-person-fill"></i> Particular'
                : '<i class="bi bi-building"></i> ' + (item.nome || "Revenda")
            }
                  </p>

                  <p class="small mb-0 text-truncate" style="min-width:0; color:#3f4650; font-size:.88rem;">
                    <i class="bi bi-geo-alt-fill" style="color:#C90B0C;"></i>
                    ${localizacao}
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
    const textoTitulo = obterTextoSeoEmptyState(localizacao, tipo)

    if (tituloResultados) tituloResultados.textContent = ""

    container.innerHTML = `
        <div class="col-12">
            <h2 class="veiculos-empty-heading">${escaparHtml(localizacao.titulo)}</h2>

            <div class="veiculos-empty-state">
                <div class="veiculos-empty-icon">
                    <i class="bi ${tipo.icon}"></i>
                </div>

                <p class="veiculos-empty-title">
                    ${textoTitulo}
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
    if (totalPaginas === 0) return

    paginacao.innerHTML += `
        <li class="page-item ${paginaAtual === 1 ? "disabled" : ""}">
            <button class="page-link" onclick="mudarPagina(${paginaAtual - 1})">Anterior</button>
        </li>
    `

    const inicio = Math.max(1, paginaAtual - 2)
    const fim = Math.min(totalPaginas, paginaAtual + 2)

    if (inicio > 1) {
        paginacao.innerHTML += `<li class="page-item"><button class="page-link" onclick="mudarPagina(1)">1</button></li>`
        if (inicio > 2) paginacao.innerHTML += `<li class="page-item disabled"><span class="page-link">…</span></li>`
    }

    for (let i = inicio; i <= fim; i++) {
        paginacao.innerHTML += `
            <li class="page-item ${i === paginaAtual ? "active" : ""}">
                <button class="page-link" onclick="mudarPagina(${i})">${i}</button>
            </li>
        `
    }

    if (fim < totalPaginas) {
        if (fim < totalPaginas - 1) paginacao.innerHTML += `<li class="page-item disabled"><span class="page-link">…</span></li>`
        paginacao.innerHTML += `<li class="page-item"><button class="page-link" onclick="mudarPagina(${totalPaginas})">${totalPaginas}</button></li>`
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
// SIDEBAR — FILTROS DINÂMICOS
// ===============================

function obterAcessoriosVeiculo(acessorios) {
    if (!acessorios) return []
    if (Array.isArray(acessorios)) return acessorios
    if (typeof acessorios === "object") return Object.values(acessorios).flat().filter(Boolean)
    try {
        const parsed = JSON.parse(acessorios)
        if (Array.isArray(parsed)) return parsed
        if (parsed && typeof parsed === "object") return Object.values(parsed).flat().filter(Boolean)
    } catch (e) {
        return String(acessorios).split(",").map(i => i.trim()).filter(Boolean)
    }
    return []
}

function preencherSelectVeiculos(id, valores) {
    const select = document.getElementById(id)
    if (!select) return
    const primeiraOpcao = select.options[0]
    select.innerHTML = ""
    if (primeiraOpcao) select.appendChild(primeiraOpcao)
    valores.forEach(v => {
        const opt = document.createElement("option")
        opt.value = v
        opt.textContent = v
        select.appendChild(opt)
    })
}

function montarFiltrosDinamicos() {
    const lista = listaVeiculosOriginal

    const marcas = [...new Set(lista.map(a => a.marca).filter(Boolean))].sort()
    const modelos = [...new Set(lista.map(a => a.modelo || a.versao).filter(Boolean))].sort()
    const cambios = [...new Set(lista.map(a => a.cambio).filter(Boolean))].sort()
    const combustiveis = [...new Set(lista.map(a => a.combustivel).filter(Boolean))].sort()
    const carrocerias = [...new Set(lista.map(a => a.carroceria).filter(Boolean))].sort()
    const anos = [...new Set(lista.map(a => a.ano_modelo).filter(Boolean))].sort((a, b) => a - b)

    preencherSelectVeiculos("filtroModelo", modelos)
    preencherSelectVeiculos("filtroCambio", cambios)
    preencherSelectVeiculos("filtroCombustivel", combustiveis)
    preencherSelectVeiculos("filtroCarroceria", carrocerias)
    preencherSelectVeiculos("filtroAnoMin", anos)
    preencherSelectVeiculos("filtroAnoMax", anos)

    const container = document.getElementById("filtroMarcas")
    if (container) {
        const filtro = window.FILTRO || {}
        const marcaAtiva = (filtro.marcaNome || "").toLowerCase()
        container.innerHTML = ""
        marcas.forEach(marca => {
            const checado = marcaAtiva && marca.toLowerCase() === marcaAtiva ? " checked" : ""
            container.innerHTML += `<label><input type="checkbox" value="${marca}"${checado}> ${marca}</label><br>`
        })
    }
}

function aplicarFiltros() {
    const busca = document.getElementById("filtroBusca")?.value.toLowerCase().trim() || ""
    const local = document.getElementById("filtroLocal")?.value.toLowerCase().trim() || ""
    const modelo = document.getElementById("filtroModelo")?.value || ""
    const anoMin = Number(document.getElementById("filtroAnoMin")?.value) || 0
    const anoMax = Number(document.getElementById("filtroAnoMax")?.value) || Infinity
    const precoMin = Number(document.getElementById("filtroPrecoMin")?.value) || 0
    const precoMax = Number(document.getElementById("filtroPrecoMax")?.value) || Infinity
    const kmMin = Number(document.getElementById("filtroKmMin")?.value) || 0
    const kmMax = Number(document.getElementById("filtroKmMax")?.value) || Infinity
    const cambio = document.getElementById("filtroCambio")?.value || ""
    const combustivel = document.getElementById("filtroCombustivel")?.value || ""
    const carroceria = document.getElementById("filtroCarroceria")?.value || ""
    const marcasSelecionadas = [...document.querySelectorAll("#filtroMarcas input:checked")].map(el => el.value)
    const blindagemCom = document.getElementById("filtroBlindado")?.checked || false
    const blindagemSem = document.getElementById("filtroNaoBlindado")?.checked || false
    const estadoNovo = document.getElementById("filtroNovo")?.checked || false
    const estadoUsado = document.getElementById("filtroUsado")?.checked || false
    const cidadeInline = document.getElementById("filtro-cidade-inline")?.value || ""
    const bairroInline = document.getElementById("filtro-bairro-inline")?.value || ""
    const tipoInline = document.getElementById("filtro-tipo-anunciante")?.value || ""
    const filtroParticular = tipoInline === "particular" || (document.getElementById("filtroParticular")?.checked || false)
    const filtroRevenda = tipoInline === "revenda" || (document.getElementById("filtroRevenda")?.checked || false)

    listaVeiculos = listaVeiculosOriginal.filter(item => {
        const acessorios = obterAcessoriosVeiculo(item.acessorios)
        const temBlindagem = acessorios.some(a => String(a).toLowerCase().includes("blindado"))

        if (busca && !(`${item.marca || ""} ${item.versao || ""} ${item.modelo || ""}`).toLowerCase().includes(busca)) return false
        if (local) {
            const cidade = (item.cidade || "").toLowerCase()
            const estado = (item.estado || "").toLowerCase()
            const bairro = (item.bairro || "").toLowerCase()
            if (!cidade.includes(local) && !estado.includes(local) && !bairro.includes(local)) return false
        }
        if (modelo && (item.modelo || item.versao) !== modelo) return false
        if (anoMin && (Number(item.ano_modelo) || 0) < anoMin) return false
        if (anoMax !== Infinity && (Number(item.ano_modelo) || 0) > anoMax) return false
        if (precoMin && (Number(item.preco) || 0) < precoMin) return false
        if (precoMax !== Infinity && (Number(item.preco) || 0) > precoMax) return false
        if (kmMin && (Number(item.km) || 0) < kmMin) return false
        if (kmMax !== Infinity && (Number(item.km) || 0) > kmMax) return false
        if (cambio && item.cambio !== cambio) return false
        if (combustivel && item.combustivel !== combustivel) return false
        if (carroceria && item.carroceria !== carroceria) return false
        if (marcasSelecionadas.length && !marcasSelecionadas.includes(item.marca)) return false
        if (blindagemCom && !temBlindagem) return false
        if (blindagemSem && temBlindagem) return false
        if (estadoNovo && item.condicao !== "novo") return false
        if (estadoUsado && item.condicao !== "usado") return false
        if (cidadeInline && (item.cidade || "") !== cidadeInline) return false
        if (bairroInline && (item.bairro || "").trim() !== bairroInline) return false
        if (filtroParticular && !filtroRevenda && item.tipo_anunciante !== "particular") return false
        if (filtroRevenda && !filtroParticular && item.tipo_anunciante !== "revenda") return false

        return true
    })

    paginaAtual = 1
    renderizarLista()
    renderizarPaginacao()
    atualizarTitulos()

    // fecha sidebar no mobile
    const sidebar = document.getElementById("sidebar")
    if (sidebar?.classList.contains("ativa")) toggleFiltro()
}

function limparFiltros() {
    document.querySelectorAll(".barra_lateral input, .barra_lateral select").forEach(el => {
        if (el.type === "checkbox" || el.type === "radio") el.checked = false
        else el.value = ""
    })

    listaVeiculos = [...listaVeiculosOriginal]
    paginaAtual = 1
    renderizarLista()
    renderizarPaginacao()
    atualizarTitulos()
}

function toggleFiltro() {
    document.getElementById("sidebar")?.classList.toggle("ativa")
    document.getElementById("overlay")?.classList.toggle("ativo")
}

function popularFiltroCidadeInline() {
    const select = document.getElementById("filtro-cidade-inline")
    if (!select) return
    const vistos = new Map()
    listaVeiculosOriginal.forEach(v => {
        if (v.cidade && !vistos.has(v.cidade)) vistos.set(v.cidade, v.estado || "")
    })
    const cidades = [...vistos.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))

    select.innerHTML = '<option value="">Todas as cidades</option>'
    cidades.forEach(([cidade, estado]) => {
        const opt = document.createElement("option")
        opt.value = cidade
        opt.dataset.estado = estado
        opt.textContent = estado ? `${cidade} - ${estado}` : cidade
        select.appendChild(opt)
    })
}

// Preenche o filtro de bairro com os bairros distintos da cidade atual.
// Retorna a quantidade de bairros encontrados (0 = não há o que filtrar).
function popularFiltroBairroInline() {
    const select = document.getElementById("filtro-bairro-inline")
    if (!select) return 0
    const bairros = [...new Set(
        listaVeiculosOriginal
            .map(v => (v.bairro || "").trim())
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'pt-BR'))

    select.innerHTML = '<option value="">Todos os bairros</option>'
    bairros.forEach(bairro => {
        const opt = document.createElement("option")
        opt.value = bairro
        opt.textContent = bairro
        select.appendChild(opt)
    })
    return bairros.length
}

function controlarVisibilidadeSidebar(total) {
    if (total > 20) {
        document.getElementById("tipo-container")?.classList.add("d-none")
        document.getElementById("sidebar")?.classList.remove("d-none")
        document.getElementById("btn-filtro-wrapper")?.classList.remove("d-none")
        document.getElementById("main-layout")?.classList.remove("sem-sidebar")
        document.body.style.background = "#f5f5f5"
    } else if (total > 0) {
        const filtro = window.FILTRO || {}
        // Com cidade + estado na URL (ex.: /carros/mesquita/rj), troca o filtro de
        // cidade pelo de bairro daquela cidade. Sem cidade (só estado ou nenhum),
        // mantém o filtro de cidade.
        const temCidadeNaUrl = !!(filtro.cidade && filtro.uf && !filtro.bairro)
        const cidadeWrapper = document.getElementById("filtro-cidade-wrapper")
        const bairroWrapper = document.getElementById("filtro-bairro-wrapper")

        if (temCidadeNaUrl) {
            cidadeWrapper?.classList.add("d-none")
            const totalBairros = popularFiltroBairroInline()
            if (totalBairros > 0) {
                bairroWrapper?.classList.remove("d-none")
                const selectBairro = document.getElementById("filtro-bairro-inline")
                if (selectBairro && !selectBairro._inlineListenerAdded) {
                    selectBairro.addEventListener("change", () => aplicarFiltros())
                    selectBairro._inlineListenerAdded = true
                }
            } else {
                bairroWrapper?.classList.add("d-none")
            }
        } else {
            bairroWrapper?.classList.add("d-none")
            popularFiltroCidadeInline()
            cidadeWrapper?.classList.remove("d-none")
            const selectCidade = document.getElementById("filtro-cidade-inline")
            if (selectCidade && !selectCidade._inlineListenerAdded) {
                selectCidade.addEventListener("change", () => {
                    aplicarFiltros()
                    const opt = selectCidade.options[selectCidade.selectedIndex]
                    const cidadeNome = opt?.value || ""
                    const estadoSigla = opt?.dataset?.estado || ""
                    const filtroAtual = window.FILTRO || {}
                    const cidadeSlug = cidadeNome ? slugify(cidadeNome) : (filtroAtual.cidade || "")
                    const ufSlug = estadoSigla ? estadoSigla.toLowerCase() : (filtroAtual.uf || "")
                    carregarBanners(cidadeSlug, ufSlug)
                })
                selectCidade._inlineListenerAdded = true
            }
        }

        document.getElementById("filtro-tipo-wrapper")?.classList.remove("d-none")
        const select = document.getElementById("filtro-tipo-anunciante")
        if (select && !select._inlineListenerAdded) {
            select.addEventListener("change", () => aplicarFiltros())
            select._inlineListenerAdded = true
        }
    }
}

// ===============================
// BANNER SLIDER
// ===============================

function mostrarBannerFallback() {
    document.getElementById("bannerSlider")?.classList.add("d-none")
    document.getElementById("bannerFallback")?.classList.remove("d-none")
}

function bannerImagemFalhou(img) {
    const slide = img.closest('.swiper-slide')
    if (slide) slide.remove()

    const wrapper = document.getElementById("bannerWrapper")
    if (!wrapper || wrapper.querySelectorAll('.swiper-slide').length > 0) return

    const slider = document.getElementById("bannerSlider")
    const fallback = document.getElementById("bannerFallback")
    if (slider) slider.classList.add("d-none")
    if (fallback) fallback.classList.remove("d-none")
}

async function carregarBanners(slug, uf) {
    try {
        // Só substitui a tarja vermelha pelo banner quando há veículos na página
        if (!listaVeiculos.length) {
            mostrarBannerFallback()
            return
        }

        let banners = []

        if (slug && uf) {
            const respCidade = await fetch(`/api/cidades/${encodeURIComponent(slug)}/${encodeURIComponent(uf)}/banners`)
            if (respCidade.ok) {
                const cidadeBanners = await respCidade.json()
                banners = cidadeBanners
                    .map(b => ({
                        src: b.imagem ? (b.imagem.startsWith('/') ? b.imagem : `/uploads/anuncios/${b.imagem}`) : null,
                        srcMobile: b.imagem_mobile ? (b.imagem_mobile.startsWith('/') ? b.imagem_mobile : `/uploads/anuncios/${b.imagem_mobile}`) : null,
                        link: b.link || '',
                        titulo: ''
                    }))
                    .filter(b => b.src)
            }
        }

        if (!banners.length) {
            const params = slug && uf ? `?cidade=${encodeURIComponent(slug)}&uf=${encodeURIComponent(uf)}` : ''
            const resp = await fetch(`/api/banners${params}`)
            if (resp.ok) {
                const globalBanners = await resp.json()
                banners = globalBanners
                    .map(b => ({
                        src: b.imagem ? (b.imagem.startsWith('/') ? b.imagem : `/uploads/banners/${b.imagem}`) : null,
                        srcMobile: b.imagem_mobile ? (b.imagem_mobile.startsWith('/') ? b.imagem_mobile : `/uploads/anuncios/${b.imagem_mobile}`) : null,
                        link: b.link || '',
                        titulo: b.titulo || ''
                    }))
                    .filter(b => b.src)
            }
        }

        if (!banners.length) {
            mostrarBannerFallback()
            return
        }

        const wrapper = document.getElementById("bannerWrapper")
        const slider = document.getElementById("bannerSlider")
        const fallback = document.getElementById("bannerFallback")

        wrapper.innerHTML = banners.map(b => `
            <div class="swiper-slide">
                ${b.link ? `<a href="${escaparHtml(b.link)}" style="display:block">` : ''}
                <picture>
                    ${b.srcMobile ? `<source media="(max-width: 768px)" srcset="${escaparHtml(b.srcMobile)}">` : ''}
                    <img src="${escaparHtml(b.src)}" alt="${escaparHtml(b.titulo)}" onerror="bannerImagemFalhou(this)">
                </picture>
                ${b.link ? '</a>' : ''}
            </div>
        `).join('')

        slider.classList.remove("d-none")
        if (fallback) fallback.classList.add("d-none")

        if (bannerSwiperInstancia) {
            bannerSwiperInstancia.destroy(true, true)
            bannerSwiperInstancia = null
        }

        bannerSwiperInstancia = new Swiper("#bannerSlider", {
            loop: banners.length > 1,
            slidesPerView: 1,
            speed: 900,
            effect: "fade",
            fadeEffect: { crossFade: true },
            autoplay: banners.length > 1 ? { delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true } : false,
            navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
            pagination: { el: "#bannerSlider .swiper-pagination", clickable: true }
        })
    } catch (e) {
        console.error("Erro ao carregar banners:", e)
    }
}

// ===============================
// INIT
// ===============================

document.addEventListener("DOMContentLoaded", async () => {
    const filtro = window.FILTRO || {}
    await carregarVeiculos()
    carregarBanners(filtro.cidade || '', filtro.uf || '')
})
