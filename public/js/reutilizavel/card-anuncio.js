/* ============================================================
   COMPONENTE COMPARTILHADO: CARD DE ANÚNCIO
   ------------------------------------------------------------
   Usado em: carros/motos/utilitários (veiculos.js), cidade.js,
   particular.js, revenda.js e home.js.

   Expõe globalmente:
   - criarCardAnuncio(item)      -> retorna o elemento .card (DOM)
   - formatarValor / formatarPreco / formatarKm
   - montarDetalhesPrincipais / montarDetalhesSecundarios
   - montarLocalizacao
   - criarSlugVenda / montarUrlVenda

   O item pode vir de qualquer página; os campos são lidos de
   forma tolerante (ex.: ano_modelo || ano) para funcionar com
   todas as origens de dados.
   ============================================================ */

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
    // Campos *_exibicao permitem que a página sobrescreva a localização mostrada
    // (ex.: anúncio que atende outra cidade deve exibir a cidade da página, não a
    // de origem). Sem eles, usa a localização real do anúncio.
    const cidade = item.cidade_exibicao ?? item.cidade
    const estado = item.estado_exibicao ?? item.estado
    const bairro = item.bairro_exibicao ?? item.bairro
    const cidadeEstado = [cidade, estado].filter(Boolean).join(", ")
    const linhas = bairro ? [bairro, cidadeEstado] : [cidadeEstado]
    return linhas
        .filter(Boolean)
        .map(linha => `<span style="display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${linha}</span>`)
        .join("")
}

function criarSlugVenda(texto) {
    return (texto || "")
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
}

function montarUrlVenda(item) {
    const marcaModelo = criarSlugVenda([item.marca, item.versao || item.modelo].filter(Boolean).join(" ")) || "veiculo"
    const cidade = criarSlugVenda(item.cidade) || "cidade"
    const estado = criarSlugVenda(item.estado) || "estado"

    return `/venda/${marcaModelo}/${cidade}/${estado}`
}

/**
 * Monta a linha do anunciante (particular x revenda).
 * Revenda é identificada por tipo_anunciante === "revenda" ou pela
 * presença de item.nome quando não é particular.
 */
function montarAnuncianteCard(item) {
    if (item.tipo_anunciante === "particular") {
        return `<i class="bi bi-person-fill"></i> Particular`
    }
    return `<i class="bi bi-building"></i> ${item.nome || "Revenda"}`
}

/**
 * Cria e retorna o elemento .card do anúncio (DOM node).
 * Quem chama é responsável por envolvê-lo na coluna/slide adequada
 * (ex.: <div class="col-...">, swiper-slide).
 */
function criarCardAnuncio(item) {
    const ano = item.ano_modelo ?? item.ano
    const detalhesPrincipais = montarDetalhesPrincipais(item)
    const detalhesSecundarios = montarDetalhesSecundarios(item)
    const localizacao = montarLocalizacao(item)

    const card = document.createElement("div")
    card.className = "card shadow-sm h-100 vehicle-card position-relative"
    card.style.cssText = "cursor:pointer;border-radius:6px;overflow:hidden;"
    card.addEventListener("click", () => {
        window.location.href = montarUrlVenda(item)
    })

    card.innerHTML = `
        ${item.destaque == 1 ? `
            <span style="
                position:absolute;top:10px;left:10px;
                background:#C90B0C;color:#fff;
                padding:5px 10px;border-radius:6px;
                font-size:12px;font-weight:bold;z-index:10;">
                Destaque
            </span>` : ''}

        <img
          src="${item.imagem ? '/uploads/anuncios/' + item.imagem : '/img/sem-foto.jpg'}"
          class="card-img-top vehicle-img"
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
              ${ano ? `| ${ano}` : ""}
            </strong>
          </div>

          <p class="mb-2" style="color:#666; font-size:.84rem; line-height:1.25; font-weight:600;">
            ${detalhesSecundarios || "&nbsp;"}
          </p>

          <p class="small fw-bold mb-1 d-flex align-items-center gap-1 mt-auto" style="font-size:.83rem;">
            ${montarAnuncianteCard(item)}
          </p>

          <p class="small mb-0 d-flex align-items-start gap-1" style="min-width:0; color:#3f4650; font-size:.88rem;">
            <i class="bi bi-geo-alt-fill" style="color:#C90B0C; flex-shrink:0; line-height:1.3;"></i>
            <span style="min-width:0; line-height:1.3; min-height:2.6em; display:block; overflow:hidden;">${localizacao}</span>
          </p>
        </div>
    `

    return card
}
