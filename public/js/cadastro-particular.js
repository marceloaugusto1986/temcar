document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#gform_3");
    const btn = document.querySelector("#btnCadastrar");

    if (!form || !btn) return;

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
        //const planoRaw = document.querySelector("#input_3_25")?.value;
        //const planoDesejado = planoRaw?.split("|")[0];
        const planoDesejado = "Grátis";

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
            plano_desejado: planoDesejado
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