/* CARREGAR ANÚNCIOS EXPIRADOS */
document.addEventListener("DOMContentLoaded", () => {
    carregarAnunciosExpirados();
});

async function carregarAnunciosExpirados() {
    const container = document.getElementById("cards-anuncios-expirados");
    if (!container) return;
    container.innerHTML = `<p class="text-secondary">Carregando anúncios expirados...</p>`;

    try {
        const response = await fetch('/api/admin/anuncios-expirados');
        if (!response.ok) {
            throw new Error('Erro na resposta da API');
        }
        const anuncios = await response.json();
        renderizarCardsExpirados(anuncios);

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p class="text-danger">Erro ao carregar anúncios.</p>`;
    }
}

/* CARREGAR CARDS EXPIRADOS */
function renderizarCardsExpirados(anuncios) {
    const container = document.getElementById("cards-anuncios-expirados");
    container.innerHTML = "";

    if (!anuncios || anuncios.length === 0) {
        container.innerHTML = `<p class="text-secondary">Nenhum anúncio expirado.</p>`;
        return;
    }

    anuncios.forEach(anuncio => {
        const card = document.createElement("div");
        card.classList.add("position-relative");

        const expiradoEm = anuncio.publicado_ate
            ? new Date(anuncio.publicado_ate).toLocaleDateString('pt-BR')
            : '';

        card.innerHTML = `
        <span class="badge bg-secondary badge-status">Expirado${expiradoEm ? ' em ' + expiradoEm : ''}</span>

      <div class="card shadow-sm vehicle-card" style="width: 280px;">

        <img
          src="/uploads/anuncios/${anuncio.imagem}"
          class="card-img-top"
          style="height:180px; object-fit:cover; cursor:pointer"
          onclick="window.location.href='/venda?id=${anuncio.id}&context=admin'"
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

          <p class="small text-secondary mb-2">
            <i class="bi bi-geo-alt-fill" style="color:#C90B0C;"></i>
            ${anuncio.cidade} - ${anuncio.estado}
          </p>

          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-success flex-fill" onclick="renovarAnuncioExpirado(${anuncio.id})">
              Renovar
            </button>
            <button class="btn btn-sm btn-danger flex-fill" onclick="excluirAnuncioExpirado(${anuncio.id})">
              Excluir
            </button>
          </div>
        </div>
      </div>
    `;

        container.appendChild(card);
    });
}

/* RENOVAR (republica recalculando publicado_ate pelo plano do usuário) */
async function renovarAnuncioExpirado(id) {
    if (!confirm("Renovar a publicação deste anúncio?")) return;

    try {
        const res = await fetch(`/api/admin/publicando-anuncio/${id}`, { method: 'PUT' });
        const dados = await res.json();
        if (!res.ok) throw new Error(dados.message || 'Erro');
        alert(dados.message || 'Anúncio renovado com sucesso');
        carregarAnunciosExpirados();
    } catch (err) {
        console.error(err);
        alert("Erro ao renovar anúncio.");
    }
}

/* EXCLUIR definitivamente */
async function excluirAnuncioExpirado(id) {
    if (!confirm("Excluir este anúncio definitivamente? Esta ação não pode ser desfeita.")) return;

    try {
        const res = await fetch(`/api/admin/anuncios/${id}`, { method: 'DELETE' });
        const dados = await res.json();
        if (!res.ok) throw new Error(dados.message || 'Erro');
        alert(dados.message || 'Anúncio excluído com sucesso');
        carregarAnunciosExpirados();
    } catch (err) {
        console.error(err);
        alert("Erro ao excluir anúncio.");
    }
}
