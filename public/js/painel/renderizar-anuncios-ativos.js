document.addEventListener("DOMContentLoaded", () => {

    fetch("/api/particular-ativos", {
        credentials: "include" // 🔐 envia o cookie da sessão
    })
        .then(res => res.json())
        .then(anuncios => renderizarCardsAtivos(anuncios))
        .catch(err => console.error(err));
});

function renderizarCardsAtivos(anuncios) {
    const container = document.getElementById("cards-ativos");
    container.innerHTML = "";

    if (!anuncios || anuncios.length === 0) {
        container.innerHTML = `<p class="text-secondary">Nenhum anúncio ativo.</p>`;
        return;
    }

    anuncios.forEach(anuncio => {
        const cardWrapper = document.createElement("div");
        cardWrapper.classList.add("position-relative");

        cardWrapper.innerHTML = `
            <span class="badge bg-success badge-status">Ativo</span>
            <div class="card vehicle-card"
            style="width: 280px; cursor: pointer"
            onclick="window.location.href='/venda?id=${anuncio.id}'">
            
                <img 
                  src="/uploads/anuncios/${anuncio.imagem}"
                  class="card-img-top vehicle-img"
                  style="height:180px; object-fit:cover;"
                >

                <div class="card-body">
                    <h5 class="fw-bold">
                        <span style="color:#000;">${anuncio.marca}</span>
                        <span style="color:#C90B0C;"> ${anuncio.versao}</span>
                    </h5>

                    <p class="mb-1 text-secondary descricao-card">${anuncio.descricao}</p>

                    <p>${anuncio.motorizacao} | ${anuncio.combustivel}</p>

                    <p class="fw-bold" style="color:#C90B0C;">
                        R$ ${Number(anuncio.preco).toLocaleString("pt-BR")}
                        <span class="text-dark"> | ${anuncio.ano_modelo}</span>
                    </p>

                    <p class="fw-bold d-flex align-items-center gap-2">
                        ${
                            anuncio.tipo === "particular"
                            ? `<i class="bi bi-person-fill"></i> Particular`
                            : `<i class="bi bi-building"></i> ${anuncio.nome || "Revenda"}`
                        }
                        </p>

                    <p class="text-secondary m-0">
                        <i class="bi bi-geo-alt-fill" style="color:#C90B0C;"></i>
                        ${anuncio.cidade} - ${anuncio.estado}
                    </p>
                </div>
            </div>
        `;


        container.appendChild(cardWrapper);
    });
}