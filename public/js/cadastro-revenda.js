document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formRevenda");
    const selectCidadeAtendimento = document.getElementById("cidadeAtendimento");
    const btnAdicionarCidade = document.getElementById("btnAdicionarCidade");
    const listaCidadesAtendimento = document.getElementById("cidadesAtendimentoLista");
    const cidadesSelecionadas = [];

    function chaveCidade(cidade) {
        return `${cidade.nome}|${cidade.estado}`.toLowerCase();
    }

    function renderizarCidadesAtendimento() {
        if (!listaCidadesAtendimento) return;

        listaCidadesAtendimento.innerHTML = "";

        cidadesSelecionadas.forEach((cidade, index) => {
            const item = document.createElement("span");
            item.className = "cidade-atendimento-pill";
            item.textContent = `${cidade.nome} / ${cidade.estado}`;

            const remover = document.createElement("button");
            remover.type = "button";
            remover.setAttribute("aria-label", `Remover ${cidade.nome}`);
            remover.textContent = "x";
            remover.addEventListener("click", () => {
                cidadesSelecionadas.splice(index, 1);
                renderizarCidadesAtendimento();
            });

            item.appendChild(remover);
            listaCidadesAtendimento.appendChild(item);
        });
    }

    async function carregarCidadesAtendimento() {
        if (!selectCidadeAtendimento) return;

        try {
            const response = await fetch("/api/cidades");
            if (!response.ok) throw new Error("Erro ao carregar cidades");

            const cidades = await response.json();

            cidades
                .sort((a, b) => `${a.nome} ${a.estado}`.localeCompare(`${b.nome} ${b.estado}`, "pt-BR"))
                .forEach(cidade => {
                    const option = document.createElement("option");
                    option.value = JSON.stringify({ nome: cidade.nome, estado: cidade.estado });
                    option.textContent = `${cidade.nome} / ${cidade.estado}`;
                    selectCidadeAtendimento.appendChild(option);
                });
        } catch (error) {
            console.error(error);
        }
    }

    if (btnAdicionarCidade && selectCidadeAtendimento) {
        btnAdicionarCidade.addEventListener("click", () => {
            if (!selectCidadeAtendimento.value) return;

            const cidade = JSON.parse(selectCidadeAtendimento.value);
            const jaExiste = cidadesSelecionadas.some(item => chaveCidade(item) === chaveCidade(cidade));

            if (!jaExiste) {
                cidadesSelecionadas.push(cidade);
                renderizarCidadesAtendimento();
            }

            selectCidadeAtendimento.value = "";
        });
    }

    carregarCidadesAtendimento();

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Helpers
        const onlyNumbers = (value) => value.replace(/\D/g, "");

        const payload = {
            tipo: "revenda",
            nome: document.getElementById("nome").value.trim(),
            email: document.getElementById("email").value.trim(),
            whatsapp: onlyNumbers(document.getElementById("whatsapp").value),
            telefone: document.getElementById("telefone").value
                ? onlyNumbers(document.getElementById("telefone").value)
                : null,
            cnpj: onlyNumbers(document.getElementById("cnpj").value),
            cep: onlyNumbers(document.getElementById("cep").value),
            rua: document.getElementById("rua").value.trim(),
            numero: document.getElementById("numero").value.trim(),
            bairro: document.getElementById("bairro").value.trim(),
            cidade: document.getElementById("cidade").value.trim(),
            estado: document.getElementById("estado").value,
            cidadesAtendimento: cidadesSelecionadas,
            senha: document.getElementById("senha").value
        };

        /* ==========================
           VALIDAÇÕES OBRIGATÓRIAS
        =========================== */
        for (const key in payload) {
            if (!payload[key] && key !== "telefone") {
                alert("Preencha todos os campos obrigatórios.");
                return;
            }
        }

        /* ==========================
           VALIDAÇÕES ESPECÍFICAS
        =========================== */

        // Email
        if (!payload.email.includes("@") || !payload.email.includes(".com")) {
            alert("Informe um e-mail válido.");
            return;
        }

        // Whatsapp (11 dígitos)
        if (payload.whatsapp.length !== 11) {
            alert("Whatsapp deve conter 11 dígitos (DDD + número).");
            return;
        }

        // Telefone (opcional)
        if (payload.telefone && ![10, 11].includes(payload.telefone.length)) {
            alert("Telefone deve conter 10 ou 11 dígitos.");
            return;
        }

        // CNPJ
        if (payload.cnpj.length !== 14) {
            alert("CNPJ deve conter exatamente 14 dígitos.");
            return;
        }

        // CEP
        if (payload.cep.length !== 8) {
            alert("CEP deve conter exatamente 8 dígitos.");
            return;
        }

        // Senha
        if (payload.senha.length < 6) {
            alert("A senha deve ter no mínimo 6 caracteres.");
            return;
        }

        /* ==========================
           ENVIO PARA API
        =========================== */
        try {
            const response = await fetch("/api/usuarios", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Erro ao cadastrar revenda");
            }

            alert("Cadastro de revenda realizado com sucesso!");
            window.location.href = "/login";

        } catch (error) {
            console.error(error);
            alert(error.message || "Erro inesperado.");
        }
    });
});
