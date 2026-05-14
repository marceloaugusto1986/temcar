/* CARREGAR ANÚNCIOS PUBLICADOS */
document.addEventListener("DOMContentLoaded", () => {
    carregarAnunciosPublicados();
});

async function carregarAnunciosPublicados() {
    const container = document.getElementById("cards-anuncios-publicados");
    container.innerHTML = `<p class="text-secondary">Carregando anúncios publicados...</p>`;

    try {
        const response = await fetch('/api/admin/anuncios-publicados');
        const anuncios = await response.json();

        renderizarCardsPublicados(anuncios);

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p class="text-danger">Erro ao carregar anúncios.</p>`;
    }
}

/* CARREGAR CARDS PUBLICADOS */
function renderizarCardsPublicados(anuncios) {
    const container = document.getElementById("cards-anuncios-publicados");
    container.innerHTML = "";

    if (!anuncios || anuncios.length === 0) {
        container.innerHTML = `<p class="text-secondary">Nenhum anúncio publicado.</p>`;
        return;
    }

    anuncios.forEach(anuncio => {
        const card = document.createElement("div");
        card.classList.add("position-relative");

        card.innerHTML = `
        <span class="badge bg-success badge-status">Ativo</span>

      <div class="card shadow-sm vehicle-card"
        style="width: 280px; cursor:pointer"
        onclick="window.location.href='/venda?id=${anuncio.id}&context=admin'">

        <img
          src="/uploads/anuncios/${anuncio.imagem}"
          class="card-img-top"
          style="height:180px; object-fit:cover"
        >

        <div class="card-body">
          <h6 class="fw-bold mb-1">
            ${anuncio.marca}
            <span style="color:#C90B0C;">${anuncio.versao}</span>
          </h6>

          <p class="small text-secondary mb-1 descricao-card">
            ${anuncio.descricao || ''}
          </p>

          <p class="fw-bold mb-1" style="color:#C90B0C;">
            R$ ${Number(anuncio.preco).toLocaleString('pt-BR')}
            <span class="text-dark"> | ${anuncio.ano_modelo}</span>
          </p>

          <p class="small text-secondary mb-1">
            <i class="bi bi-person-fill"></i> ${anuncio.anunciante}
          </p>

          <p class="small text-secondary m-0">
            <i class="bi bi-geo-alt-fill" style="color:#C90B0C;"></i>
            ${anuncio.cidade} - ${anuncio.estado}
          </p>
        </div>
      </div>
    `;

        container.appendChild(card);
    });
}