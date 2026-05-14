document.addEventListener("DOMContentLoaded", () => {

    fetch("/api/anunciante/anuncios/analise", {
        credentials: "include" // 🔐 envia o cookie da sessão
    })
        .then(res => res.json())
        .then(anuncios => renderizarCards(anuncios))
        .catch(err => console.error(err));
});

function renderizarCards(anuncios) {
    const container = document.getElementById("cards-analise");
    container.innerHTML = "";

    if (!anuncios || anuncios.length === 0) {
        container.innerHTML = `<p class="text-secondary">Nenhum anúncio em análise.</p>`;
        return;
    }

    anuncios.forEach(anuncio => {
        const cardWrapper = document.createElement("div");
        cardWrapper.classList.add("position-relative");

        cardWrapper.innerHTML = `
            <span class="badge bg-warning text-dark badge-status">Em análise</span>
            <div class="card vehicle-card"
            style="width: 280px;"
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

                    <p class="fw-bold" style="color:#C90B0C;">
                        R$ ${Number(anuncio.preco).toLocaleString("pt-BR")}
                        <span class="text-dark"> | ${anuncio.ano_modelo}</span>
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