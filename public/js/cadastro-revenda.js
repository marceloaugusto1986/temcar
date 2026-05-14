document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formRevenda");

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