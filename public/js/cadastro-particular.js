document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#gform_3");
    const btn = document.querySelector("#btnCadastrar");
    const selectPlano = document.querySelector("#input_3_25");

    if (!form || !btn) return;

    async function carregarPlanos() {
        if (!selectPlano) return;

        try {
            const response = await fetch("/api/planos?tipo=particular");
            if (!response.ok) throw new Error("Erro ao carregar planos");

            const planos = await response.json();

            selectPlano.innerHTML = '<option value="">Selecione um plano</option>';
            planos.forEach(plano => {
                const option = document.createElement("option");
                option.value = plano.codigo;
                option.textContent = plano.nome;
                option.dataset.planoId = plano.id;
                selectPlano.appendChild(option);
            });

            const planoUrl = new URLSearchParams(window.location.search).get("plano");

            if (planoUrl && planos.some(plano => plano.codigo === planoUrl)) {
                selectPlano.value = planoUrl;
            } else if (planos[0]) {
                selectPlano.value = planos[0].codigo;
            }
        } catch (error) {
            console.error(error);
        }
    }

    carregarPlanos();

    btn.addEventListener("click", async (e) => {
        e.preventDefault();

        // Helper
        const onlyNumbers = (value) => value.replace(/\D/g, "");

        // Campos
        const nome = document.querySelector("#input_3_1")?.value.trim();
        const email = document.querySelector("#input_3_8")?.value.trim();
        const whatsapp = onlyNumbers(document.querySelector("#input_3_7")?.value || "");
        const cpf = onlyNumbers(document.querySelector("#input_3_5")?.value || "");

        const cep = onlyNumbers(document.querySelector("#cep")?.value || "");
        const rua = document.querySelector("#rua")?.value.trim();
        const numero = onlyNumbers(document.querySelector("#numero")?.value || "");
        const bairro = document.querySelector("#bairro")?.value.trim();
        const cidade = document.querySelector("#cidade")?.value.trim();
        const estado = document.querySelector("#estado")?.value.trim();

        const senha = document.querySelector("#input_3_22")?.value;
        const planoCodigo = selectPlano?.value || "particular-plano-1";
        const planoDesejado = selectPlano?.selectedOptions?.[0]?.textContent || "PLANO 1";

        /* ==========================
           VALIDAÇÃO
        ========================== */
        if (!nome || !email || !whatsapp || !cpf || !senha || !planoDesejado || !cep || !rua || !numero || !bairro || !cidade || !estado) {
            alert("Preencha todos os campos obrigatórios.");
            return;
        }

        if (!email.includes("@") || !email.includes(".com")) {
            alert("Informe um e-mail válido.");
            return;
        }

        if (whatsapp.length !== 11) {
            alert("Whatsapp deve conter 11 dígitos.");
            return;
        }

        if (cpf.length !== 11) {
            alert("CPF deve conter 11 dígitos.");
            return;
        }

        if (senha.length < 6) {
            alert("Senha deve ter no mínimo 6 caracteres.");
            return;
        }

        const payload = {
            tipo: "particular",
            nome,
            email,
            whatsapp,
            cpf,
            senha,
            cep,
            rua,
            numero,
            bairro,
            cidade,
            estado,
            plano_desejado: planoDesejado,
            plano_codigo: planoCodigo
        };

        try {
            const response = await fetch("/api/usuarios", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Erro ao criar usuário");
            }

            alert("Cadastro realizado com sucesso!");
            window.location.href = "/login";

        } catch (err) {
            alert(err.message || "Erro inesperado");
        }
    });
});
