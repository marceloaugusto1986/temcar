document.addEventListener("DOMContentLoaded", () => {
    carregarAnunciosUsuario();
});

function carregarAnunciosUsuario() {
    fetch("/api/anunciante/anuncios", {
        credentials: "include"
    })
        .then(res => res.json())
        .then(anuncios => renderizarCardsUsuario(anuncios))
        .catch(err => console.error(err));
}

function renderizarCardsUsuario(anuncios) {
    const container = document.getElementById("container-editar-excluir-anuncio");
    container.innerHTML = "";

    if (!anuncios || anuncios.length === 0) {
        container.innerHTML = `<p class="text-secondary">Você ainda não possui anúncios.</p>`;
        return;
    }

    anuncios.forEach(anuncio => {
        const card = document.createElement("div");
        card.classList.add("card", "shadow-sm", "vehicle-card", "position-relative");

        const statusLabel = anuncio.status === "analise"
            ? `<span class="badge bg-warning text-dark badge-status">Em análise</span>`
            : `<span class="badge bg-success badge-status">Ativo</span>`;

        card.innerHTML = `
            ${statusLabel}

            <img 
                src="/uploads/anuncios/${anuncio.imagem || 'placeholder.jpg'}"
                class="card-img-top"
                style="height:180px; object-fit:cover;"
            >

            <div class="card-body">
                <h5 class="fw-bold mb-1">
                    ${anuncio.marca}
                    <span style="color:#C90B0C;">${anuncio.versao}</span>
                </h5>

                <p class="mb-1 text-secondary descricao-card">${anuncio.descricao}</p>

                <p class="fw-bold mb-2" style="color:#C90B0C;">
                    R$ ${Number(anuncio.preco).toLocaleString("pt-BR")}
                    <span class="text-dark"> | ${anuncio.ano_modelo}</span>
                </p>

                <p class="text-secondary mb-3">
                    <i class="bi bi-geo-alt-fill text-danger"></i>
                    ${anuncio.cidade} - ${anuncio.estado}
                </p>

                <div class="d-flex justify-content-between">
                    <button
                        type="button"
                        class="btn btn-outline-primary btn-sm w-50 me-1"
                        onclick="abrirEdicaoAnuncio(${anuncio.id})">
                        <i class="bi bi-pencil"></i> Editar
                    </button>

                    <button 
                        class="btn btn-outline-danger btn-sm w-50 ms-1"
                        onclick="excluirAnuncio(${anuncio.id})">
                        <i class="bi bi-trash"></i> Excluir
                    </button>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

function editarAnuncio(id) {
    window.location.href = `/painel/editar-anuncio?id=${id}`;
}