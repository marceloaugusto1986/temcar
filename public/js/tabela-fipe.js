(function () {
    const state = {
        tipo: "carros",
        marcaNome: "",
        modeloNome: ""
    };

    const tabs = document.querySelectorAll("[data-fipe-tipo]");
    const marcaSelect = document.getElementById("fipeMarca");
    const modeloSelect = document.getElementById("fipeModelo");
    const anoSelect = document.getElementById("fipeAno");
    const form = document.getElementById("fipeForm");
    const submit = document.getElementById("fipeSubmit");
    const spinner = document.getElementById("fipeSpinner");
    const feedback = document.getElementById("fipeFeedback");
    const empty = document.getElementById("fipeEmpty");
    const result = document.getElementById("fipeResult");
    const comprarLink = document.getElementById("fipeComprarLink");

    const fields = {
        valor: document.getElementById("fipeValor"),
        titulo: document.getElementById("fipeTituloResultado"),
        resumo: document.getElementById("fipeResumoResultado"),
        mes: document.getElementById("fipeMes"),
        codigo: document.getElementById("fipeCodigo"),
        anoModelo: document.getElementById("fipeAnoModelo"),
        combustivel: document.getElementById("fipeCombustivel"),
        marca: document.getElementById("fipeMarcaResultado"),
        dataConsulta: document.getElementById("fipeDataConsulta")
    };

    function setOptions(select, items, placeholder) {
        select.innerHTML = "";
        const option = document.createElement("option");
        option.value = "";
        option.textContent = placeholder;
        select.appendChild(option);

        items.forEach(item => {
            const itemOption = document.createElement("option");
            itemOption.value = item.codigo;
            itemOption.textContent = item.nome;
            select.appendChild(itemOption);
        });
    }

    function setLoading(select, text) {
        select.disabled = true;
        select.innerHTML = `<option value="">${text}</option>`;
    }

    function resetResult() {
        result.classList.add("d-none");
        empty.classList.remove("d-none");
    }

    function showError(message) {
        feedback.textContent = message;
        feedback.classList.remove("d-none");
    }

    function clearError() {
        feedback.textContent = "";
        feedback.classList.add("d-none");
    }

    function setSubmitting(isSubmitting) {
        submit.disabled = isSubmitting || !anoSelect.value;
        spinner.classList.toggle("d-none", !isSubmitting);
    }

    async function fetchJson(url) {
        const response = await fetch(url);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || "Não foi possível consultar a Tabela FIPE.");
        }

        return data;
    }

    async function carregarMarcas() {
        clearError();
        resetResult();
        setLoading(marcaSelect, "Carregando marcas...");
        setLoading(modeloSelect, "Selecione uma marca primeiro");
        setLoading(anoSelect, "Selecione um modelo primeiro");
        submit.disabled = true;

        try {
            const marcas = await fetchJson(`/api/fipe/${state.tipo}/marcas`);
            setOptions(marcaSelect, marcas, "Selecione a marca");
            marcaSelect.disabled = false;
        } catch (error) {
            setLoading(marcaSelect, "Não foi possível carregar");
            showError(error.message);
        }
    }

    async function carregarModelos() {
        clearError();
        resetResult();
        state.marcaNome = marcaSelect.options[marcaSelect.selectedIndex]?.textContent || "";
        setLoading(modeloSelect, "Carregando modelos...");
        setLoading(anoSelect, "Selecione um modelo primeiro");
        submit.disabled = true;

        if (!marcaSelect.value) {
            setLoading(modeloSelect, "Selecione uma marca primeiro");
            return;
        }

        try {
            const data = await fetchJson(`/api/fipe/${state.tipo}/marcas/${encodeURIComponent(marcaSelect.value)}/modelos`);
            const modelos = Array.isArray(data.modelos) ? data.modelos : [];
            setOptions(modeloSelect, modelos, "Selecione o modelo");
            modeloSelect.disabled = false;
        } catch (error) {
            setLoading(modeloSelect, "Não foi possível carregar");
            showError(error.message);
        }
    }

    async function carregarAnos() {
        clearError();
        resetResult();
        state.modeloNome = modeloSelect.options[modeloSelect.selectedIndex]?.textContent || "";
        setLoading(anoSelect, "Carregando anos...");
        submit.disabled = true;

        if (!modeloSelect.value) {
            setLoading(anoSelect, "Selecione um modelo primeiro");
            return;
        }

        try {
            const anos = await fetchJson(`/api/fipe/${state.tipo}/marcas/${encodeURIComponent(marcaSelect.value)}/modelos/${encodeURIComponent(modeloSelect.value)}/anos`);
            setOptions(anoSelect, Array.isArray(anos) ? anos : [], "Selecione o ano e combustível");
            anoSelect.disabled = false;
        } catch (error) {
            setLoading(anoSelect, "Não foi possível carregar");
            showError(error.message);
        }
    }

    function tipoLegivel(tipo) {
        if (tipo === "motos") return "Moto";
        if (tipo === "caminhoes") return "Caminhão";
        return "Carro";
    }

    function renderResultado(data) {
        const marca = data.Marca || state.marcaNome || "-";
        const modelo = data.Modelo || state.modeloNome || "-";
        const anoModelo = data.AnoModelo || "-";
        const combustivel = data.Combustivel || "-";
        const busca = `${marca} ${modelo}`.trim();

        fields.valor.textContent = data.Valor || "Valor indisponível";
        fields.titulo.textContent = `${marca} ${modelo}`;
        fields.resumo.textContent = `${tipoLegivel(state.tipo)} ${anoModelo} ${combustivel}`.replace(/\s+/g, " ").trim();
        fields.mes.textContent = data.MesReferencia || "-";
        fields.codigo.textContent = data.CodigoFipe || "-";
        fields.anoModelo.textContent = anoModelo;
        fields.combustivel.textContent = combustivel;
        fields.marca.textContent = marca;
        fields.dataConsulta.textContent = data.DataConsulta || "Atualizada";
        comprarLink.href = `/comprar?busca=${encodeURIComponent(busca)}`;

        empty.classList.add("d-none");
        result.classList.remove("d-none");
    }

    async function consultarValor(event) {
        event.preventDefault();
        clearError();
        setSubmitting(true);

        try {
            const data = await fetchJson(`/api/fipe/${state.tipo}/marcas/${encodeURIComponent(marcaSelect.value)}/modelos/${encodeURIComponent(modeloSelect.value)}/anos/${encodeURIComponent(anoSelect.value)}`);
            renderResultado(data);
        } catch (error) {
            showError(error.message);
        } finally {
            setSubmitting(false);
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(item => item.classList.remove("active"));
            tab.classList.add("active");
            state.tipo = tab.dataset.fipeTipo;
            carregarMarcas();
        });
    });

    marcaSelect.addEventListener("change", carregarModelos);
    modeloSelect.addEventListener("change", carregarAnos);
    anoSelect.addEventListener("change", () => {
        clearError();
        resetResult();
        submit.disabled = !anoSelect.value;
    });
    form.addEventListener("submit", consultarValor);

    carregarMarcas();
})();
