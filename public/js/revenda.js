/* ================================
   ESTADO GLOBAL
================================ */

let anunciosOriginais = []
let anunciosFiltrados = []
let itens = []

const itensPorPagina = 12
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

function obterIdRevenda() {
    const id = window.__REVENDA_ID__ || window.location.pathname.split('/').pop()
    console.log("ID REVENDa:", id)
    return id
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
    const cidadeEstado = [item.cidade, item.estado].filter(Boolean).join(", ")
    return item.bairro ? `${item.bairro}, ${cidadeEstado}` : cidadeEstado
}

/* ================================
   CARREGAR ANÚNCIOS
================================ */

async function carregarAnuncios() {
    try {
        const revendaId = obterIdRevenda()
        const response = await fetch(`/api/revenda/${revendaId}/anuncios`)
        if (!response.ok) throw new Error("Erro ao carregar anúncios")
        const data = await response.json()

        anunciosOriginais = ordenarComDestaque(data)
        anunciosFiltrados = [...anunciosOriginais]

        montarFiltrosDinamicos()
        atualizarLista()
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

    // Função segura para JSON
    function parseAcessorios(valor) {
        if (!valor) return []

        try {
            const parsed = JSON.parse(valor)
            return Array.isArray(parsed) ? parsed : [parsed]
        } catch (e) {
            // Se não for JSON, tenta converter string comum em array
            if (typeof valor === "string") {
                return valor.split(",").map(v => v.trim())
            }
            return []
        }
    }

    // Marcas, modelos, versões, etc.
    const marcas = [...new Set(anunciosOriginais.map(a => a.marca).filter(Boolean))];
    const modelos = [...new Set(anunciosOriginais.map(a => a.modelo || a.versao).filter(Boolean))];
    const cambios = [...new Set(anunciosOriginais.map(a => a.cambio).filter(Boolean))];
    const combustiveis = [...new Set(anunciosOriginais.map(a => a.combustivel).filter(Boolean))];
    const carrocerias = [...new Set(anunciosOriginais.map(a => a.carroceria).filter(Boolean))];
    const anos = [...new Set(anunciosOriginais.map(a => a.ano_modelo).filter(Boolean))].sort((a, b) => a - b);

    // Cores
    const cores = [...new Set(anunciosOriginais.map(a => a.cor).filter(Boolean))];

    // Opcionais / Acessórios (CORRIGIDO)
    const todosAcessorios = anunciosOriginais
        .map(a => parseAcessorios(a.acessorios))
        .flat();

    const opcionais = [...new Set(todosAcessorios.filter(Boolean))];

    // Preencher selects
    preencherSelect("filtroModelo", modelos);
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
    const container = document.getElementById("filtroMarcas");
    if (!container) return;
    container.innerHTML = "";
    marcas.forEach(marca => {
        container.innerHTML += `<label><input type="checkbox" value="${marca}"> ${marca}</label><br>`;
    });
}


/* ================================
   APLICAR FILTROS
================================ */

function aplicarFiltros() {
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

    anunciosFiltrados = anunciosOriginais.filter(item => {
        const acessorios = item.acessorios ? JSON.parse(item.acessorios) : []
        const temBlindagem = acessorios.includes("blindado")

        if (filtros.busca && !(`${item.marca} ${item.versao}`.toLowerCase().includes(filtros.busca))) return false
        if (filtros.modelo && item.modelo !== filtros.modelo) return false
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
            if (!cidade.includes(filtros.local) && !estado.includes(filtros.local)) return false
        }
        if (filtros.opcionaisSelecionados.length && !filtros.opcionaisSelecionados.every(o => acessorios.includes(o))) return false
        if (filtros.blindagemCom && !temBlindagem) return false
        if (filtros.blindagemSem && temBlindagem) return false
        if (filtros.estadoNovo && item.condicao !== "novo") return false
        if (filtros.estadoUsado && item.condicao !== "usado") return false

        return true
    })

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
        km: a.km,
        motorizacao: a.motorizacao,
        portas: a.portas,
        cidade: a.cidade,
        estado: a.estado,
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
        nome: a.nome
    }))
    renderizarCards()
    renderizarPaginacao()
}

/* ================================
   RENDERIZAÇÃO CARDS
================================ */

function renderizarSemResultados(container) {
    container.innerHTML = `
        <div style="grid-column: 1 / -1;">
            <div class="cidade-empty-state">
                <div class="cidade-empty-icon">
                    <i class="bi bi-building"></i>
                </div>
                <p class="cidade-empty-title">Nenhum veículo encontrado com os filtros selecionados.</p>
                <p class="cidade-empty-promo">
                    <strong>Atenção Revendas</strong><br>
                    Aproveite nossa promoção de lançamento e anuncie seus veículos gratuitamente até agosto de 2026.
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
        renderizarSemResultados(container)
        return
    }
    const inicio = (paginaAtual - 1) * itensPorPagina
    const fim = inicio + itensPorPagina
    const paginaItens = itens.slice(inicio, fim)
    paginaItens.forEach(item => {
        const detalhesPrincipais = montarDetalhesPrincipais(item)
        const detalhesSecundarios = montarDetalhesSecundarios(item)
        const localizacao = montarLocalizacao(item)

        const col = document.createElement("div")
        col.innerHTML = `
  <div class="card shadow-sm h-100 position-relative"
       style="cursor:pointer;border-radius:6px;overflow:hidden;"
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
      class="card-img-top"
      style="height:182px;object-fit:cover;"
      onerror="this.src='/img/sem-foto.jpg'"
      alt="${item.marca || ''} ${item.versao || ''}"
    >

    <div class="card-body d-flex flex-column" style="padding:14px 16px 12px;">

      <h5 class="fw-bold text-uppercase mb-1" style="font-size:1rem;line-height:1.2;">
        <span style="color:#1f2328;">${item.marca || ''}</span>
        <span style="color:#C90B0C;"> ${item.versao || ''}</span>
      </h5>

      <p class="mb-2" style="color:#666;font-size:.88rem;line-height:1.25;font-weight:600;">
        ${detalhesPrincipais || "&nbsp;"}
      </p>

      <div class="d-flex align-items-baseline mb-1" style="gap:6px;">
        <strong style="color:#C90B0C;font-size:1.18rem;line-height:1;">
          ${formatarPreco(item.preco)}
        </strong>
        <strong style="color:#2b2f36;font-size:1.05rem;">
          ${item.ano ? `| ${item.ano}` : ""}
        </strong>
      </div>

      <p class="mb-2" style="color:#666;font-size:.84rem;line-height:1.25;font-weight:600;">
        ${detalhesSecundarios || "&nbsp;"}
      </p>

      <p class="small fw-bold mb-1 d-flex align-items-center gap-1 mt-auto" style="font-size:.83rem;">
        <i class="bi bi-building"></i> ${item.nome || "Revenda"}
      </p>

      <p class="small mb-0 text-truncate" style="min-width:0;color:#3f4650;font-size:.88rem;">
        <i class="bi bi-geo-alt-fill" style="color:#C90B0C;"></i>
        ${localizacao}
      </p>

    </div>
  </div>`
        container.appendChild(col)
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
   SIDEBAR
================================ */

function toggleFiltro() {
    document.getElementById("sidebar")?.classList.toggle("ativa")
    document.getElementById("overlay")?.classList.toggle("ativo")
}


/* =================================
    PREENCHER BANNER
===================================*/
async function carregarDadosRevenda() {
    try {
        const revendaId = window.__REVENDA_ID__ || window.location.pathname.split("/").pop();
        const response = await fetch(`/api/revenda/${revendaId}`);
        if (!response.ok) throw new Error("Erro ao carregar dados da revenda");

        const revenda = await response.json();
        preencherBannerRevenda(revenda);
    } catch (erro) {
        console.error("Erro ao carregar dados da revenda:", erro);

        // fallback visual caso dê erro
        preencherBannerRevenda({
            nome: "Revenda",
            logo: null,
            telefone: "",
            whatsapp: "",
        });
    }
}

function formatarTelefone(numero) {
    if (!numero) return ""

    // remove tudo que não for número
    numero = numero.replace(/\D/g, "")

    // celular (11 dígitos)
    if (numero.length === 11) {
        return numero.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
    }

    // fixo (10 dígitos)
    if (numero.length === 10) {
        return numero.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
    }

    // fallback (caso venha diferente)
    return numero
}

function preencherBannerRevenda(revenda) {
    const logo = document.getElementById("logoRevendaPagina");
    if (logo) {
        if (revenda.logo) {
            logo.src = revenda.logo;
            logo.style.display = "";
        } else {
            logo.removeAttribute("src");
            logo.style.display = "none";
        }
        logo.onerror = () => {
            logo.removeAttribute("src");
            logo.style.display = "none";
        };
    }

    // NOME
    const nomeEl = document.getElementById("revendaNome");
    if (nomeEl) nomeEl.textContent = revenda.nome || "Revenda";

    // ENDEREÇO COMPLETO
    const endereco = [
        revenda.rua,
        revenda.numero,
        revenda.bairro,
        revenda.cidade,
        revenda.estado
    ].filter(Boolean).join(", ");

    const enderecoEl = document.getElementById("revendaEndereco");
    if (enderecoEl) enderecoEl.textContent = endereco || "Endereço não informado";

    // TELEFONES
    const telefone1El = document.getElementById("revendaTelefone1");
    if (telefone1El) {
        telefone1El.textContent = formatarTelefone(revenda.telefone)
    }

    const telefone2El = document.getElementById("revendaTelefone2");
    if (telefone2El) {
        telefone2El.textContent = formatarTelefone(revenda.whatsapp)
    }

    // DATA DE PARCERIA
    if (revenda.criado_em) {
        const data = new Date(revenda.criado_em);
        const mes = String(data.getMonth() + 1).padStart(2, "0");
        const ano = data.getFullYear();

        const desdeEl = document.getElementById("revendaDesde");
        if (desdeEl) desdeEl.textContent = `Parceiro desde ${mes}/${ano}`;
    }

    // BOTÃO MAPA
    const btnMapa = document.getElementById("btnMapa");
    if (btnMapa && endereco) {
        btnMapa.onclick = () => {
            const query = encodeURIComponent(endereco);
            window.open(
                `https://www.google.com/maps/search/?api=1&query=${query}`,
                "_blank"
            );
        };
    }

    // BOTÃO WHATSAPP
    const numero = (revenda.whatsapp || revenda.telefone || "").replace(/\D/g, "");
    const btnContato = document.getElementById("btnContato");
    if (btnContato) {
        if (numero) {
            btnContato.style.display = "inline-block";
            btnContato.onclick = () => window.open(`https://wa.me/55${numero}`, "_blank");
        } else {
            btnContato.style.display = "none";
        }
    }
}

/* ================================
   INIT
================================ */

document.addEventListener("DOMContentLoaded", () => {
    carregarDadosRevenda();
    carregarAnuncios();
});
