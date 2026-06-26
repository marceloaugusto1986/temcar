// ===============================
// ESTADO GLOBAL
// ===============================

let listaAnuncios = []
let listaCidadeAnuncios = []
let listaFiltrada = []
let paginaAtualCidade = 1
const limitePorPagina = 10
let cidadeAtual = null
let cidadeBannerSwiper = null
let bairroSelecionado = ""

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

function criarSlug(texto) {
    return (texto || "")
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
}

function montarUrlVenda(item) {
    const marcaModelo = criarSlug([item.marca, item.versao || item.modelo].filter(Boolean).join(" ")) || "veiculo"
    const cidade = criarSlug(item.cidade) || "cidade"
    const estado = criarSlug(item.estado) || "estado"

    return `/venda/${marcaModelo}/${cidade}/${estado}`
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
    const linhas = item.bairro ? [item.bairro, cidadeEstado] : [cidadeEstado]
    return linhas
        .filter(Boolean)
        .map(linha => `<span style="display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${linha}</span>`)
        .join("")
}

// ===============================
// CAPTURAR SLUG E UF DA URL
// URL: /cidade/:slug/:uf ou /cidade/:bairro/:slug/:uf
// ===============================

function obterSlugAtual() {
    const filtro = window.FILTRO || {}
    if (filtro.cidade) return criarSlug(filtro.cidade)

    const partes = window.location.pathname.split("/")
    if (partes[1] === "cidade" && partes.length >= 5) return partes[3] || ""
    if (partes[1] === "veiculos" && partes.length >= 5) return partes[3] || ""
    if (partes[1] === "veiculos" && partes.length >= 4) return partes[3] || ""
    return partes[2] || ""
}

function obterUfAtual() {
    const filtro = window.FILTRO || {}
    if (filtro.uf) return criarSlug(filtro.uf)

    const partes = window.location.pathname.split("/")
    if (partes[1] === "cidade" && partes.length >= 5) return partes[4] || ""
    if (partes[1] === "veiculos" && partes.length >= 5) return partes[2] || ""
    if (partes[1] === "veiculos" && partes.length >= 4) return partes[2] || ""
    return partes[3] || ""
}

function formatarNomeCidade(slug) {
    return slug
        .replace(/-/g, " ")
        .replace(/\b\w/g, letra => letra.toUpperCase())
}

function obterNomeCidadeAtual() {
    const filtro = window.FILTRO || {}
    return filtro.cidadeNome || (cidadeAtual ? cidadeAtual.nome : formatarNomeCidade(obterSlugAtual()))
}

function obterEstadoAtual() {
    const filtro = window.FILTRO || {}
    return (filtro.ufNome || filtro.uf || (cidadeAtual ? cidadeAtual.estado : (listaFiltrada[0]?.estado || obterUfAtual())) || "").toUpperCase()
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

function normalizarUrlDirecionamento(link) {
    const valor = String(link || "").trim()
    if (!valor) return ""
    if (valor.startsWith("/") && !valor.startsWith("//")) return valor

    try {
        const url = new URL(valor)
        return ["http:", "https:"].includes(url.protocol) ? url.href : ""
    } catch (erro) {
        return ""
    }
}

function obterCidadesAtendimento(item) {
    if (!item || !item.cidades_atendimento) return []

    if (Array.isArray(item.cidades_atendimento)) return item.cidades_atendimento

    try {
        return JSON.parse(item.cidades_atendimento) || []
    } catch (erro) {
        return []
    }
}

function anuncioAtendeCidade(item, slug, uf) {
    const cidadeItem = (item.cidade || "").split("-")[0].trim()
    const slugItem = criarSlug(cidadeItem)
    const estadoItem = (item.estado || "").toLowerCase()

    if (slugItem === slug && (!uf || estadoItem === uf)) return true

    return obterCidadesAtendimento(item).some(cidadeAtendimento => {
        const slugAtendimento = criarSlug(cidadeAtendimento.cidade || "")
        const estadoAtendimento = (cidadeAtendimento.estado || "").toLowerCase()
        return slugAtendimento === slug && (!uf || estadoAtendimento === uf)
    })
}

// ===============================
// BUSCAR + FILTRAR ANÚNCIOS
// ===============================

async function carregarAnunciosDaCidade() {
    try {
        const slug = obterSlugAtual()
        const bairroInicial = obterBairroFiltro()
        if (bairroInicial) {
            bairroSelecionado = bairroInicial
        }

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
        listaCidadeAnuncios = ordenarComDestaque(listaAnuncios.filter(item => anuncioAtendeCidade(item, slug, uf)))
        aplicarFiltroBairro(false)

        controlarVisibilidadeSidebar(listaCidadeAnuncios.length)
        montarFiltrosDinamicosCidade()
        atualizarTituloCidade()

        paginaAtualCidade = 1
        renderizarLista()
        renderizarPaginacaoCidade()

        if (listaCidadeAnuncios.length > 0) {
            carregarBannersCidade()
        }

    } catch (erro) {
        console.error(erro)
        document.getElementById("container-card-primary").innerHTML =
            "<p class='text-danger text-center'>Erro ao carregar anúncios</p>"
    }
}

function normalizarTexto(texto) {
    return (texto || "")
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
}

function aplicarFiltroBairro(renderizar = true) {
    if (!bairroSelecionado) {
        listaFiltrada = [...listaCidadeAnuncios]
    } else {
        const bairroNormalizado = normalizarTexto(bairroSelecionado)
        listaFiltrada = listaCidadeAnuncios.filter(item =>
            normalizarTexto(item.bairro) === bairroNormalizado
        )
    }

    if (!renderizar) return

    paginaAtualCidade = 1
    atualizarTituloCidade()
    renderizarLista()
    renderizarPaginacaoCidade()
}

function obterBairrosDosAnunciosDaCidade() {
    const bairrosPorNome = new Map()

    listaCidadeAnuncios.forEach(item => {
        const bairro = String(item.bairro || "").trim()
        if (!bairro) return

        const chave = normalizarTexto(bairro)
        if (!bairrosPorNome.has(chave)) {
            bairrosPorNome.set(chave, { nome: bairro })
        }
    })

    return Array.from(bairrosPorNome.values())
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
}

async function carregarFiltroBairrosCidade() {
    const wrapper = document.getElementById("cidade-filtros")
    const select = document.getElementById("filtro-bairro-cidade")

    if (!wrapper || !select) return

    const bairroInicial = obterBairroFiltro()
    if (bairroInicial) {
        bairroSelecionado = bairroInicial
    }

    const fixarBairroDaUrl = () => {
        select.innerHTML = ""
        const option = document.createElement("option")
        option.value = bairroSelecionado
        option.textContent = bairroSelecionado
        option.selected = true
        select.appendChild(option)
        select.disabled = true
    }

    wrapper.classList.remove("d-none")
    select.disabled = true
    select.innerHTML = '<option value="">Carregando bairros...</option>'

    try {
        const cidade = obterNomeCidadeAtual()
        const estado = obterEstadoAtual()
        const params = new URLSearchParams({ cidade, estado })
        const res = await fetch(`/api/bairros?${params.toString()}`)

        if (!res.ok) throw new Error("Erro ao buscar bairros")

        const bairros = await res.json()
        const bairrosValidosApi = bairros.filter(bairro => bairro.nome)

        // apenas bairros que têm pelo menos um veículo na cidade
        const bairrosComVeiculos = obterBairrosDosAnunciosDaCidade()
        const nomesComVeiculos = new Set(bairrosComVeiculos.map(b => normalizarTexto(b.nome)))

        const bairrosFiltrados = bairrosValidosApi.length
            ? bairrosValidosApi.filter(b => nomesComVeiculos.has(normalizarTexto(b.nome)))
            : bairrosComVeiculos

        const bairrosValidos = bairrosFiltrados.length ? bairrosFiltrados : bairrosComVeiculos

        if (!bairrosValidos.length) {
            if (bairroSelecionado) {
                fixarBairroDaUrl()
                return
            }

            wrapper.classList.add("d-none")
            return
        }

        select.disabled = Boolean(bairroSelecionado)
        select.innerHTML = '<option value="">Todos os bairros</option>'

        bairrosValidos.forEach(bairro => {
            const option = document.createElement("option")
            option.value = bairro.nome
            option.textContent = bairro.nome
            if (normalizarTexto(bairro.nome) === normalizarTexto(bairroSelecionado)) {
                option.selected = true
            }
            select.appendChild(option)
        })

        if (bairroSelecionado && !Array.from(select.options).some(option => normalizarTexto(option.value) === normalizarTexto(bairroSelecionado))) {
            const option = document.createElement("option")
            option.value = bairroSelecionado
            option.textContent = bairroSelecionado
            option.selected = true
            select.appendChild(option)
        }

        if (bairroSelecionado) {
            select.disabled = true
        }

        wrapper.classList.remove("d-none")
    } catch (erro) {
        console.error("Erro ao carregar filtro de bairros:", erro)
        wrapper.classList.remove("d-none")
        if (bairroSelecionado) {
            fixarBairroDaUrl()
            return
        }

        const bairrosDosAnuncios = obterBairrosDosAnunciosDaCidade()
        if (bairrosDosAnuncios.length) {
            select.disabled = false
            select.innerHTML = '<option value="">Todos os bairros</option>'

            bairrosDosAnuncios.forEach(bairro => {
                const option = document.createElement("option")
                option.value = bairro.nome
                option.textContent = bairro.nome
                select.appendChild(option)
            })

            return
        }

        wrapper.classList.add("d-none")
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

    if (bairroSelecionado) {
        titulo.textContent = `Veículos em ${bairroSelecionado}, ${nomeCidade} - ${estado}`
        return
    }

    if (!listaFiltrada.length) {
        titulo.textContent = `${nomeCidade}, ${estado}`
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
        const detalhesPrincipais = montarDetalhesPrincipais(item)
        const detalhesSecundarios = montarDetalhesSecundarios(item)
        const localizacao = montarLocalizacao(item)

        wrapper.innerHTML = `
            <div class="card shadow-sm vehicle-card position-relative"
                 style="width: 280px; cursor: pointer; border-radius: 6px; overflow: hidden;"
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

                  <p class="small mb-0 d-flex align-items-start gap-1" style="min-width:0; color:#3f4650; font-size:.88rem;">
                    <i class="bi bi-geo-alt-fill" style="color:#C90B0C; flex-shrink:0; line-height:1.3;"></i>
                    <span style="min-width:0; line-height:1.3; min-height:2.6em; display:block; overflow:hidden;">${localizacao}</span>
                  </p>
                </div>
            </div>
        `

        container.appendChild(wrapper)
    })
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
    const query = new URLSearchParams(window.location.search)
    return filtro.cidadeNome || capitalize(filtro.cidade || obterNomeCidadeAtual())
}

function obterBairroFiltro() {
    const filtro = window.FILTRO || {}
    const query = new URLSearchParams(window.location.search)
    return filtro.bairroNome || capitalize(filtro.bairro || query.get('bairro'))
}

function obterUfFiltro() {
    const filtro = window.FILTRO || {}
    const query = new URLSearchParams(window.location.search)
    return (filtro.ufNome || filtro.uf || obterEstadoAtual() || "").toUpperCase()
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
    const cidadeFiltro = filtro.cidade || obterNomeCidadeAtual()
    const ufFiltro = filtro.uf || obterEstadoAtual()
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

function obterTextoSeoEmptyState(localizacao, tipo) {
    const seo = window.SEO_PAGINA || {}
    const dados = seo.dados_contexto || {}
    const template = String(seo.descricao_template_original || seo.descricao_template || "")
    const marcadorCidade = "#cidade"
    const indiceCidade = template.indexOf(marcadorCidade)
    // Na página /cidade/:slug/:uf sempre temos contexto local
    const nomeCidade = obterNomeCidadeAtual()
    const ufAtual = obterEstadoAtual()

    if (indiceCidade < 0) {
        return `${tipo.chamada} ${localizacao.preposicao} <strong>${escaparHtml(localizacao.texto)}</strong>`
    }

    const trechoAntesCidade = template.slice(0, indiceCidade)

    const cidade = dados.cidade || nomeCidade || localizacao.texto
    const estado = dados.estado || ufAtual || ""
    const bairro = dados.bairro || bairroSelecionado || ""
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

function renderizarCidadeSemAnuncios(container) {
    const tipo = obterTipoEmptyState()
    const localizacao = obterLocalizacaoEmptyState()
    const textoTitulo = obterTextoSeoEmptyState(localizacao, tipo)

    // heading com cidade/estado
    const nomeCidade = escaparHtml(obterNomeCidadeAtual())
    const estado = escaparHtml(obterEstadoAtual())
    const tituloHeading = estado ? `${nomeCidade}, ${estado}` : nomeCidade

    container.classList.remove("overflow-auto")
    container.classList.add("overflow-visible")

    container.innerHTML = `
        <div class="cidade-empty-state">
            <div class="cidade-empty-icon">
                <i class="bi ${tipo.icon}"></i>
            </div>

            <p class="cidade-empty-title">
                ${textoTitulo}
            </p>

            <p class="cidade-empty-promo">
                <strong>Atenção Particulares e Revendas</strong><br>
                Aproveite nossa promoção de lançamento e anuncie ${tipo.artigo} ${tipo.nome} gratuitamente até agosto de 2026.
            </p>

            <div class="cidade-empty-actions">
                <a class="btn btn-danger" href="/vender">
                    Anunciar grátis
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
    if (totalPaginas === 0) return

    paginacao.innerHTML += `
        <li class="page-item ${paginaAtualCidade === 1 ? "disabled" : ""}">
            <button class="page-link" onclick="mudarPaginaCidade(${paginaAtualCidade - 1})">Anterior</button>
        </li>
    `

    const inicio = Math.max(1, paginaAtualCidade - 2)
    const fim = Math.min(totalPaginas, paginaAtualCidade + 2)

    if (inicio > 1) {
        paginacao.innerHTML += `<li class="page-item"><button class="page-link" onclick="mudarPaginaCidade(1)">1</button></li>`
        if (inicio > 2) paginacao.innerHTML += `<li class="page-item disabled"><span class="page-link">…</span></li>`
    }

    for (let i = inicio; i <= fim; i++) {
        paginacao.innerHTML += `
            <li class="page-item ${i === paginaAtualCidade ? "active" : ""}">
                <button class="page-link" onclick="mudarPaginaCidade(${i})">${i}</button>
            </li>
        `
    }

    if (fim < totalPaginas) {
        if (fim < totalPaginas - 1) paginacao.innerHTML += `<li class="page-item disabled"><span class="page-link">…</span></li>`
        paginacao.innerHTML += `<li class="page-item"><button class="page-link" onclick="mudarPaginaCidade(${totalPaginas})">${totalPaginas}</button></li>`
    }

    paginacao.innerHTML += `
        <li class="page-item ${paginaAtualCidade === totalPaginas ? "disabled" : ""}">
            <button class="page-link" onclick="mudarPaginaCidade(${paginaAtualCidade + 1})">Próximo</button>
        </li>
    `
}

function mudarPaginaCidade(pagina) {
    const totalPaginas = Math.ceil(listaFiltrada.length / limitePorPagina)

    if (pagina < 1 || pagina > totalPaginas) return

    paginaAtualCidade = pagina
    renderizarLista()
    renderizarPaginacaoCidade()

    window.scrollTo({ top: 0, behavior: "smooth" })
}

// ===============================
// SIDEBAR — FILTROS DINÂMICOS
// ===============================

function obterAcessoriosCidade(acessorios) {
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

function preencherSelectCidade(id, valores) {
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

function montarFiltrosDinamicosCidade() {
    const lista = listaCidadeAnuncios

    const marcas = [...new Set(lista.map(a => a.marca).filter(Boolean))].sort()
    const modelos = [...new Set(lista.map(a => a.modelo || a.versao).filter(Boolean))].sort()
    const cambios = [...new Set(lista.map(a => a.cambio).filter(Boolean))].sort()
    const combustiveis = [...new Set(lista.map(a => a.combustivel).filter(Boolean))].sort()
    const carrocerias = [...new Set(lista.map(a => a.carroceria).filter(Boolean))].sort()
    const anos = [...new Set(lista.map(a => a.ano_modelo).filter(Boolean))].sort((a, b) => a - b)

    preencherSelectCidade("filtroModelo", modelos)
    preencherSelectCidade("filtroCambio", cambios)
    preencherSelectCidade("filtroCombustivel", combustiveis)
    preencherSelectCidade("filtroCarroceria", carrocerias)
    preencherSelectCidade("filtroAnoMin", anos)
    preencherSelectCidade("filtroAnoMax", anos)

    const container = document.getElementById("filtroMarcas")
    if (container) {
        container.innerHTML = ""
        marcas.forEach(marca => {
            container.innerHTML += `<label><input type="checkbox" value="${marca}"> ${marca}</label><br>`
        })
    }
}

function aplicarFiltros() {
    const busca = document.getElementById("filtroBusca")?.value.toLowerCase().trim() || ""
    const bairro = document.getElementById("filtro-bairro-cidade")?.value || ""
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
    const tipoInline = document.getElementById("filtro-tipo-anunciante")?.value || ""
    const filtroParticular = tipoInline === "particular" || (document.getElementById("filtroParticular")?.checked || false)
    const filtroRevenda = tipoInline === "revenda" || (document.getElementById("filtroRevenda")?.checked || false)

    // mantém bairroSelecionado sincronizado para o título
    bairroSelecionado = bairro

    listaFiltrada = listaCidadeAnuncios.filter(item => {
        const acessorios = obterAcessoriosCidade(item.acessorios)
        const temBlindagem = acessorios.some(a => String(a).toLowerCase().includes("blindado"))
        const tipoAnunciante = item.tipo_anunciante || item.tipoAnunciante || ""

        if (busca && !(`${item.marca || ""} ${item.versao || ""} ${item.modelo || ""}`).toLowerCase().includes(busca)) return false
        if (bairro && normalizarTexto(item.bairro) !== normalizarTexto(bairro)) return false
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
        if (filtroParticular && !filtroRevenda && tipoAnunciante !== "particular") return false
        if (filtroRevenda && !filtroParticular && tipoAnunciante !== "revenda") return false

        return true
    })

    paginaAtualCidade = 1
    atualizarTituloCidade()
    renderizarLista()
    renderizarPaginacaoCidade()

    // fecha sidebar no mobile
    const sidebar = document.getElementById("sidebar")
    if (sidebar?.classList.contains("ativa")) toggleFiltro()
}

function limparFiltros() {
    document.querySelectorAll(".barra_lateral input, .barra_lateral select").forEach(el => {
        if (el.type === "checkbox" || el.type === "radio") el.checked = false
        else el.value = ""
    })

    bairroSelecionado = ""
    listaFiltrada = [...listaCidadeAnuncios]
    paginaAtualCidade = 1
    atualizarTituloCidade()
    renderizarLista()
    renderizarPaginacaoCidade()
}

function toggleFiltro() {
    document.getElementById("sidebar")?.classList.toggle("ativa")
    document.getElementById("overlay")?.classList.toggle("ativo")
}

function controlarVisibilidadeSidebar(total) {
    // Sem carros anunciados: usa "Carros" no lugar de "veículos" na faixa do topo.
    if (total === 0) {
        document.querySelectorAll("#cidade-banner-titulo, #cidade-banner-sub").forEach(el => {
            el.textContent = el.textContent.replace(/Veículos/g, "Carros").replace(/veículos/g, "carros")
        })
    }

    if (total > 20) {
        // Move bairro inline para dentro da sidebar
        const bairroSection = document.getElementById("cidade-filtros")
        const slot = document.getElementById("sidebar-bairro-slot")
        if (bairroSection && slot) {
            bairroSection.classList.remove("cidade-filtros")
            bairroSection.classList.add("in-sidebar")
            slot.appendChild(bairroSection)
        }
        document.getElementById("bairro-container")?.classList.add("d-none")

        document.getElementById("sidebar")?.classList.remove("d-none")
        document.getElementById("btn-filtro-wrapper")?.classList.remove("d-none")
        document.getElementById("main-layout")?.classList.remove("sem-sidebar")
        document.body.style.background = "#f5f5f5"
    } else {
        // ≤20: mostra filtro de tipo e adiciona listeners de change
        if (total > 0) {
            document.getElementById("filtro-tipo-container")?.classList.remove("d-none")
        }

        const selectBairro = document.getElementById("filtro-bairro-cidade")
        if (selectBairro && !selectBairro._inlineListenerAdded) {
            selectBairro.addEventListener("change", () => aplicarFiltros())
            selectBairro._inlineListenerAdded = true
        }

        const selectTipo = document.getElementById("filtro-tipo-anunciante")
        if (selectTipo && !selectTipo._inlineListenerAdded) {
            selectTipo.addEventListener("change", () => aplicarFiltros())
            selectTipo._inlineListenerAdded = true
        }
    }
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

    } catch (erro) {
        console.error("Erro ao carregar dados da cidade:", erro)
    }
}

function bannerCidadeImagemFalhou(img) {
    const slide = img.closest('.swiper-slide')
    if (slide) slide.remove()

    const wrapper = document.getElementById("cidadeBannerWrapper")
    if (!wrapper || wrapper.querySelectorAll('.swiper-slide').length > 0) return

    renderizarBannerFallback()
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

        const banners = (await res.json())
            .map(banner => ({
                src: obterUrlBannerCidade(banner.imagem),
                srcMobile: obterUrlBannerCidade(banner.imagem_mobile || banner.imagem),
                link: normalizarUrlDirecionamento(banner.link)
            }))
            .filter(banner => banner.src)

        if (!banners.length) {
            renderizarBannerFallback()
            return
        }

        wrapper.innerHTML = banners.map((banner, index) => `
            <div class="swiper-slide">
                ${banner.link ? `<a href="${escaparHtml(banner.link)}" class="cidade-banner-link">` : ""}
                    <picture class="cidade-banner-picture">
                        <source media="(max-width: 768px)" srcset="${escaparHtml(banner.srcMobile)}">
                        <img
                            src="${escaparHtml(banner.src)}"
                            class="cidade-banner-img"
                            alt="Banner de ${escaparHtml(obterNomeCidadeAtual())}${index > 0 ? ` ${index + 1}` : ""}"
                            loading="${index === 0 ? "eager" : "lazy"}"
                            onerror="bannerCidadeImagemFalhou(this)"
                        >
                    </picture>
                ${banner.link ? "</a>" : ""}
            </div>
        `).join("")

        if (banners.length > 1) {
            const prev = document.querySelector("#cidadeBannerSlider .swiper-button-prev")
            const next = document.querySelector("#cidadeBannerSlider .swiper-button-next")
            if (prev) prev.style.display = ""
            if (next) next.style.display = ""
        }

        iniciarSliderCidade(banners.length)

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

    const nomeCidade = obterNomeCidadeAtual()
    const uf = (window.FILTRO?.ufNome || obterUfAtual() || "").toUpperCase()
    const titulo = nomeCidade ? `Veículos em ${escaparHtml(nomeCidade)}${uf ? ` - ${escaparHtml(uf)}` : ""}` : ""

    wrapper.innerHTML = `
        <div class="swiper-slide">
            <div class="cidade-banner-fallback d-flex align-items-center justify-content-center text-center">
                ${titulo ? `<div><h2 class="fw-bold mb-2">${titulo}</h2><p class="mb-0">Ofertas de veículos na sua cidade</p></div>` : ""}
            </div>
        </div>
    `

    const prev = document.querySelector("#cidadeBannerSlider .swiper-button-prev")
    const next = document.querySelector("#cidadeBannerSlider .swiper-button-next")
    if (prev) prev.style.display = "none"
    if (next) next.style.display = "none"

    iniciarSliderCidade(1)
}

// ===============================
// INIT
// ===============================

document.addEventListener("DOMContentLoaded", async () => {
    await carregarDadosCidade()
    await carregarAnunciosDaCidade()
    await carregarFiltroBairrosCidade()
})
