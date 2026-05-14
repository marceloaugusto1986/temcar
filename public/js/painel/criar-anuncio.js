/* ==================================================
   VARIÁVEIS GLOBAIS
================================================== */
let imagensSelecionadas = [];

document.addEventListener("DOMContentLoaded", () => {

    /* ==================================================
       TOGGLE DO FORMULÁRIO
    ================================================== */
    const toggleBtn = document.getElementById("toggleForm");
    const closeBtn = document.getElementById("closeForm");
    const formWrapper = document.getElementById("formVeiculoWrapper");

    if (toggleBtn && formWrapper) {
        toggleBtn.addEventListener("click", () => {
            formWrapper.classList.toggle("d-none");
            toggleBtn.textContent = formWrapper.classList.contains("d-none")
                ? "Cadastrar Veículo"
                : "Ocultar Cadastro";
        });
    }

    if (closeBtn && toggleBtn && formWrapper) {
        closeBtn.addEventListener("click", () => {
            formWrapper.classList.add("d-none");
            toggleBtn.textContent = "Cadastrar Veículo";
        });
    }

    /* ==================================================
       UPLOAD E PREVIEW DE IMAGENS
    ================================================== */
    const inputImagens = document.getElementById("imagens");
    const preview = document.getElementById("previewImagens");

    if (inputImagens && preview) {
        inputImagens.addEventListener("change", () => {
            const files = Array.from(inputImagens.files);

            for (const file of files) {
                if (imagensSelecionadas.length >= 10) {
                    alert("Você pode adicionar no máximo 10 imagens.");
                    break;
                }

                const jaExiste = imagensSelecionadas.some(
                    img => img.name === file.name && img.size === file.size
                );

                if (!jaExiste) imagensSelecionadas.push(file);
            }

            inputImagens.value = "";
            renderPreview();
        });

        preview.addEventListener("click", (e) => {
            if (e.target.tagName === "BUTTON") {
                const index = Number(e.target.dataset.index);
                imagensSelecionadas.splice(index, 1);
                renderPreview();
            }
        });
    }

    function renderPreview() {
        preview.innerHTML = "";

        imagensSelecionadas.forEach((file, index) => {
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
       SUBMISSÃO DO FORMULÁRIO
    ================================================== */
    const form = document.getElementById("formCadastroVeiculo");
    if (!form) return;

    const botaoSalvar = form.querySelector("button");

    botaoSalvar.addEventListener("click", async () => {

        const getValue = (selector) =>
            form.querySelector(selector)?.value?.trim();

        /* ==========================
           CAMPOS BÁSICOS
        ========================== */
        const preco = Number(getValue("#preco"));
        const descricao = getValue("#descricao");

        /* ==========================
           SELECTS
        ========================== */
        const selects = form.querySelectorAll("select");
        const [
            tipo,
            marca,
            condicao,
            cambio,
            motorizacao,
            portas,
            carroceria,
            combustivel,
            tracao,
            cor
        ] = Array.from(selects).map(s => s.value);

        /* ==========================
           INPUTS NUMÉRICOS
        ========================== */
        const inputsNumber = form.querySelectorAll("input[type='number']");
        const anoFabricacao = Number(inputsNumber[0]?.value);
        const anoModelo = Number(inputsNumber[1]?.value);
        const km = Number(inputsNumber[2]?.value);

        const versao = form.querySelector("input[placeholder*='Onix']")?.value.trim();

        /* ==========================
           ACESSÓRIOS
        ========================== */
        const acessorios = Array.from(
            form.querySelectorAll("input[type='checkbox']:checked")
        ).map(item => item.parentElement.textContent.trim());

        /* ==========================
           VALIDAÇÕES
        ========================== */
        if (
            !descricao ||
            !versao ||
            !tipo || !marca || !condicao || !cambio ||
            !motorizacao || !portas || !carroceria ||
            !combustivel || !tracao || !cor ||
            !preco || preco <= 0 ||
            !anoFabricacao || !anoModelo
        ) {
            alert("Preencha corretamente todos os campos obrigatórios.");
            return;
        }

        const anoAtual = new Date().getFullYear();
        if (anoFabricacao < 1900 || anoFabricacao > anoAtual) {
            alert("Ano de fabricação inválido.");
            return;
        }

        if (anoModelo < anoFabricacao) {
            alert("Ano modelo não pode ser menor que o ano de fabricação.");
            return;
        }

        if (km < 0) {
            alert("KM inválido.");
            return;
        }

        if (imagensSelecionadas.length === 0) {
            alert("Adicione pelo menos uma imagem.");
            return;
        }

        if (imagensSelecionadas.length > 10) {
            alert("Máximo de 10 imagens permitidas.");
            return;
        }

        /* ==========================
           FORM DATA
        ========================== */
        const formData = new FormData();

        formData.append("preco", preco);
        formData.append("descricao", descricao);
        formData.append("tipo", tipo);
        formData.append("marca", marca);
        formData.append("versao", versao);
        formData.append("ano_fabricacao", anoFabricacao);
        formData.append("ano_modelo", anoModelo);
        formData.append("km", km);
        formData.append("condicao", condicao);
        formData.append("cambio", cambio);
        formData.append("motorizacao", motorizacao);
        formData.append("portas", portas);
        formData.append("carroceria", carroceria);
        formData.append("combustivel", combustivel);
        formData.append("tracao", tracao);
        formData.append("cor", cor);
        formData.append("acessorios", JSON.stringify(acessorios));

        imagensSelecionadas.forEach(img => {
            formData.append("imagens", img);
        });

        /* ==========================
           ENVIO
        ========================== */
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

            alert("Anúncio criado com sucesso!");
            form.reset();
            preview.innerHTML = "";
            imagensSelecionadas.length = 0;
            window.location.reload();

        } catch (err) {
            console.error(err);
            alert(err.message || "Erro inesperado.");
        } finally {
            botaoSalvar.disabled = false;
            botaoSalvar.textContent = "Salvar Veículo";
        }
    });
});