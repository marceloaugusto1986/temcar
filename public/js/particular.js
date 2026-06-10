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
    const filtro = window.FILTRO || {}

    let texto = "Veículos de particulares"

    if (filtro.bairro) {
        texto = `Particulares em ${obterBairroFiltro()}, ${obterCidadeFiltro()} - ${obterUfFiltro()}`
    } else if (filtro.cidade) {
        texto = `Particulares em ${obterCidadeFiltro()} - ${obterUfFiltro()}`
    }

    if (titulo) titulo.textContent = texto
    if (total) total.textContent = `${anunciosFiltrados.length} anúncio(s)`
}

function montarUrlVenda(item) {
    const marcaModelo = criarSlugVenda([item.marca, item.versao || item.modelo].filter(Boolean).join(" ")) || "veiculo"
    const cidade = criarSlugVenda(item.cidade) || "cidade"
    const estado = criarSlugVenda(item.estado) || "estado"

    return `/venda/${marcaModelo}/${cidade}/${estado}`
}

function formatarKm(valor) {
    if (valor === null || valor === undefined || valor === "") return ""
    const numero = Number(valor)
    if (isNaN(numero)) return ""
    return `${numero.toLocaleString("pt-BR")} km`
}

function formatarPreco(valor) {
    const numero = Number(valor)
    if (!numero || isNaN(numero)) return "Consulte"
    return `R$ ${numero.toLocaleString("pt-BR")}`
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

        anunciosOriginais = filtrarPorContexto(data)
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
    }))
    renderizarCards()
    renderizarPaginacao()
    atualizarTituloParticular()
}

/* ================================
   RENDERIZAÇÃO CARDS
================================ */

function renderizarCards() {
    const container = document.getElementById("listaCards")
    container.innerHTML = ""
    if (!itens.length) {
        container.innerHTML = "<p class='text-center'>Nenhum anúncio encontrado</p>"
        return
    }
    const inicio = (paginaAtual - 1) * itensPorPagina
    const fim = inicio + itensPorPagina
    const paginaItens = itens.slice(inicio, fim)
    console.log("Itens exibidos:", paginaItens.length)
    paginaItens.forEach(item => {
        const detalhesPrincipais = montarDetalhesPrincipais(item)
        const detalhesSecundarios = montarDetalhesSecundarios(item)
        const localizacao = montarLocalizacao(item)

        container.innerHTML += `
<div>
  <div class="card shadow-sm vehicle-card position-relative"
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
          ${item.ano ? `| ${item.ano}` : ""}
        </strong>
      </div>

      <p class="mb-2" style="color:#666; font-size:.84rem; line-height:1.25; font-weight:600;">
        ${detalhesSecundarios || "&nbsp;"}
      </p>

      <p class="small fw-bold mb-1 d-flex align-items-center gap-1 mt-auto" style="font-size:.83rem;">
        <i class="bi bi-person-fill"></i> Particular
      </p>

      <p class="small mb-0 text-truncate" style="min-width:0; color:#3f4650; font-size:.88rem;">
        <i class="bi bi-geo-alt-fill" style="color:#C90B0C;"></i>
        ${localizacao}
      </p>

    </div>
  </div>
</div>
`

    })
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

    ul.innerHTML += `<li class="page-item ${paginaAtual === 1 ? 'disabled' : ''}">
        <button class="page-link" onclick="mudarPagina(${paginaAtual - 1})">Anterior</button>
    </li>`
    for (let i = 1; i <= totalPaginas; i++) {
        ul.innerHTML += `<li class="page-item ${i === paginaAtual ? 'active' : ''}">
            <button class="page-link" onclick="mudarPagina(${i})">${i}</button>
        </li>`
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
    window.scrollTo({ top: 0, behavior: "smooth" })
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
    carregarAnuncios();
});
