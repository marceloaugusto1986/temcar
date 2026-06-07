document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const anuncioId = window.TEMCAR_ANUNCIO_ID || params.get("id");

    if (!anuncioId) {
        alert("Anúncio inválido");
        return;
    }

    try {
        // 1️⃣ Descobre o contexto real pelo backend
        const ctxResponse = await fetch("/api/venda-contexto", {
            credentials: "include"
        });

        if (!ctxResponse.ok) throw new Error("Erro ao obter contexto");

        const { context } = await ctxResponse.json();

        // 2️⃣ Usa o contexto retornado para montar o endpoint
        const endpoint = getEndpoint(context, anuncioId);

        // 3️⃣ Busca o anúncio no endpoint correto
        const res = await fetch(endpoint, {
            credentials: "include"
        });

        if (!res.ok) throw new Error("Erro ao carregar anúncio");

        const data = await res.json();
        renderizarVenda(data);

    } catch (err) {
        console.error(err);
        alert("Não foi possível carregar o anúncio.");
    }
});

/* ============================
   🔹 ENDPOINT POR CONTEXTO
============================ */
function getEndpoint(context, anuncioId) {
    switch (context) {
        case "admin":
            return `/api/anuncios-admin/${anuncioId}`;
        case "painel":
            return `/api/painel/anuncios/${anuncioId}`;
        default:
            /* return `/api/public/anuncios/${anuncioId}`; */
            return `/api/anuncios-admin/${anuncioId}`;
    }
}

/* ============================
   🔹 RENDERIZAÇÃO PRINCIPAL
============================ */
function renderizarVenda({ anuncio, anunciante }) {
    // TÍTULO E PREÇO
    setText("tituloVeiculo", `${anuncio.marca} ${anuncio.versao}`);
    setText("preco", `R$ ${Number(anuncio.preco).toLocaleString("pt-BR")}`);
    setText("descricao", anuncio.descricao);
    const e = anunciante.endereco || {};

    setText(
        "localizacao",
        e.cidade && e.estado ? `${e.cidade} - ${e.estado}` : "-"
    );



    // DADOS RÁPIDOS
    preencherCampos({
        anoFabricacao: anuncio.ano_fabricacao,
        anoModelo: anuncio.ano_modelo,
        km: Number(anuncio.km).toLocaleString("pt-BR"),
        condicao: anuncio.condicao,
        cambio: anuncio.cambio,
        combustivel: anuncio.combustivel
    });

    // FICHA TÉCNICA
    preencherCampos({
        motorizacao: anuncio.motorizacao,
        portas: anuncio.portas,
        carroceria: anuncio.carroceria,
        tracao: anuncio.tracao,
        cor: anuncio.cor,
        tipo: anuncio.tipo
    });

    // ANUNCIANTE
    setText("nomeAnunciante", anunciante.nome);
    setText("tipoAnunciante", anunciante.tipo);
    setText("emailAnunciante", anunciante.email);
    setText(
        "telefoneAnunciante",
        anunciante.whatsapp || anunciante.telefone || "-"
    );

    const endereco = anunciante.endereco || {};

    setText(
        "enderecoAnunciante",
        `${endereco.rua || "-"}, ${endereco.numero || "-"} - ${endereco.bairro || "-"}, ${endereco.cidade || "-"}/${endereco.estado || "-"}`
    );

    const id = obterIdDaUrl()

    verRevenda(anuncio.usuario_id, anunciante)

    configurarWhatsapp(anuncio, anunciante);

    // GALERIA E ACESSÓRIOS
    renderizarGaleria(anuncio.imagens);
    renderizarAcessorios(anuncio.acessorios);
}

function obterIdDaUrl() {
    const params = new URLSearchParams(window.location.search)
    return params.get("id")
}

function verRevenda(usuarioId, anunciante) {
    const link = document.getElementById("verRevenda")

    if (!link) return

    if (anunciante.tipo === "revenda") {
        link.style.display = "inline-block"
        link.href = `/revenda/${usuarioId}`
    } else {
        link.style.display = "none"
    }
}

/* ============================
   🔹 HELPERS
============================ */
function setText(id, valor) {
    const el = document.getElementById(id);
    if (el) el.innerText = valor || "-";
}

function preencherCampos(campos) {
    Object.entries(campos).forEach(([id, valor]) => {
        setText(id, valor);
    });
}

/* ============================
   🔹 WHATSAPP
============================ */
function configurarWhatsapp(anuncio, anunciante) {
    if (!anunciante.whatsapp) return;

    const numero = anunciante.whatsapp.replace(/\D/g, "");
    const link = `https://wa.me/55${numero}?text=${encodeURIComponent(
        `Olá, tenho interesse no ${anuncio.marca} ${anuncio.versao}.`
    )}`;

    const btn = document.getElementById("btnWhatsapp");
    if (btn) btn.href = link;
}

/* ============================
   🔹 GALERIA
============================ */

let indexGaleria = 0;

function moverGaleria(dir){

    const track = document.getElementById("miniaturas");
    const items = track.children;

    if(!items.length) return;

    const visiveis = window.innerWidth <= 768 ? 1 : 3;

    indexGaleria += dir;

    if(indexGaleria < 0) indexGaleria = 0;

    if(indexGaleria > items.length - visiveis)
        indexGaleria = items.length - visiveis;

    const largura = items[0].offsetWidth + 20;

    track.style.transform = `translateX(-${indexGaleria * largura}px)`;
}

function renderizarGaleria(imagens = []) {

    const miniaturas = document.getElementById("miniaturas");

    if (!miniaturas) return;

    miniaturas.innerHTML = "";

    if (!imagens.length) {
        const img = document.createElement("img");
        img.src = "/img/sem-imagem.jpg";
        miniaturas.appendChild(img);
        return;
    }

    imagens.forEach(img => {

        const thumb = document.createElement("img");

        thumb.src = `/uploads/anuncios/${img.imagem}`;

        thumb.style.objectFit = "cover";

        miniaturas.appendChild(thumb);

    });

}

/* ============================
   🔹 ACESSÓRIOS
============================ */
function renderizarAcessorios(acessorios) {
    const container = document.getElementById("acessorios");
    if (!container) return;

    container.innerHTML = "";

    let lista = [];
    try {
        lista = Array.isArray(acessorios)
            ? acessorios
            : JSON.parse(acessorios || "[]");
    } catch { }

    if (!lista.length) {
        container.innerHTML =
            `<span class="text-muted">Nenhum acessório informado.</span>`;
        return;
    }

    lista.forEach(item => {
        const badge = document.createElement("span");
        badge.className = "badge bg-light text-dark border me-1 mb-1";
        badge.innerText = item;
        container.appendChild(badge);
    });
}
