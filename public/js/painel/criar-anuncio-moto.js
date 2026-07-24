/* ==================================================
   CADASTRO EXCLUSIVO DE MOTOS
   --------------------------------------------------
   Formulário próprio do painel (aba "Anunciar Moto").
   Envia para o mesmo endpoint dos demais anúncios com
   tipo = "Moto"; os campos de carro (portas, carroceria,
   motorização e tração) simplesmente não existem aqui.
================================================== */

let imagensMotoSelecionadas = [];

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("formCadastroMoto");
    if (!form) return;

    const inputImagens = document.getElementById("imagensMoto");
    const preview = document.getElementById("previewImagensMoto");
    const botaoSalvar = document.getElementById("salvarMoto");

    /* ==================================================
       UPLOAD E PREVIEW DE IMAGENS
    ================================================== */
    if (inputImagens && preview) {
        inputImagens.addEventListener("change", () => {
            const files = Array.from(inputImagens.files);

            for (const file of files) {
                if (imagensMotoSelecionadas.length >= 20) {
                    alert("Você pode adicionar no máximo 20 imagens.");
                    break;
                }

                const jaExiste = imagensMotoSelecionadas.some(
                    img => img.name === file.name && img.size === file.size
                );

                if (!jaExiste) imagensMotoSelecionadas.push(file);
            }

            inputImagens.value = "";
            renderPreview();
        });

        preview.addEventListener("click", (e) => {
            if (e.target.tagName === "BUTTON") {
                const index = Number(e.target.dataset.index);
                imagensMotoSelecionadas.splice(index, 1);
                renderPreview();
            }
        });
    }

    function renderPreview() {
        preview.innerHTML = "";

        imagensMotoSelecionadas.forEach((file, index) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const div = document.createElement("div");
                div.className = "position-relative";

                div.innerHTML = `
            <img src="${e.target.result}" class="rounded border"
                 style="width:120px;height:90px;object-fit:cover">
            <button type="button"
                    class="btn btn-danger btn-sm position-absolute top-0 end-0"
                    data-index="${index}"
                    style="transform: translate(30%, -30%)">✕</button>
          `;

                preview.appendChild(div);
            };

            reader.readAsDataURL(file);
        });
    }

    /* ==================================================
       SUBMISSÃO
    ================================================== */
    if (!botaoSalvar) return;

    botaoSalvar.addEventListener("click", async () => {

        // Campos lidos por name (não por posição).
        const valorDe = (nome) => form.querySelector(`[name="${nome}"]`)?.value?.trim() || "";

        const marca = valorDe("marca");
        const versao = valorDe("versao");
        const cilindrada = valorDe("cilindrada");
        const condicao = valorDe("condicao");
        const cambio = valorDe("cambio");
        const combustivel = valorDe("combustivel");
        const cor = valorDe("cor");
        const descricao = valorDe("descricao");

        const preco = Number(valorDe("preco"));
        const anoFabricacao = Number(valorDe("ano_fabricacao"));
        const anoModelo = Number(valorDe("ano_modelo"));
        const km = Number(valorDe("km"));

        const acessorios = Array.from(
            form.querySelectorAll("input[type='checkbox']:checked")
        ).map(item => item.value);

        /* ==========================
           VALIDAÇÕES
        ========================== */
        if (
            !marca || !versao || !cilindrada || !condicao ||
            !cambio || !combustivel || !cor || !descricao ||
            !preco || preco <= 0 ||
            !anoFabricacao || !anoModelo
        ) {
            alert("Preencha corretamente todos os campos obrigatórios.");
            return;
        }

        const anoAtual = new Date().getFullYear();
        if (anoFabricacao < 1900 || anoFabricacao > anoAtual + 1) {
            alert("Ano de fabricação inválido.");
            return;
        }

        if (anoModelo < anoFabricacao) {
            alert("Ano modelo não pode ser menor que o ano de fabricação.");
            return;
        }

        if (!Number.isFinite(km) || km < 0) {
            alert("KM inválido.");
            return;
        }

        if (imagensMotoSelecionadas.length === 0) {
            alert("Adicione pelo menos uma imagem.");
            return;
        }

        if (imagensMotoSelecionadas.length > 20) {
            alert("Máximo de 20 imagens permitidas.");
            return;
        }

        /* ==========================
           ENVIO
        ========================== */
        const formData = new FormData();

        formData.append("tipo", "Moto");
        formData.append("marca", marca);
        formData.append("versao", versao);
        formData.append("cilindrada", cilindrada);
        formData.append("ano_fabricacao", anoFabricacao);
        formData.append("ano_modelo", anoModelo);
        formData.append("km", km);
        formData.append("condicao", condicao);
        formData.append("cambio", cambio);
        formData.append("combustivel", combustivel);
        formData.append("cor", cor);
        formData.append("preco", preco);
        formData.append("descricao", descricao);
        formData.append("acessorios", JSON.stringify(acessorios));

        imagensMotoSelecionadas.forEach(img => {
            formData.append("imagens", img);
        });

        try {
            botaoSalvar.disabled = true;
            botaoSalvar.textContent = "Salvando...";

            const response = await fetch("/api/anunciante/anuncios", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Erro ao criar anúncio.");
            }

            alert("Anúncio de moto criado com sucesso!");
            form.reset();
            preview.innerHTML = "";
            imagensMotoSelecionadas.length = 0;
            window.location.reload();

        } catch (err) {
            console.error(err);
            alert(err.message || "Erro inesperado.");
        } finally {
            botaoSalvar.disabled = false;
            botaoSalvar.textContent = "Salvar Moto";
        }
    });
});
