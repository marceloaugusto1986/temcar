const select = document.getElementById("select-cidades")
const inputCidade = document.getElementById("input-cidade")
const btnBuscarCidade = document.getElementById("btn-buscar-cidade")
const boxSugestoes = document.getElementById("cidade-sugestoes")

let cidadesCache = []

function gerarSlug(nome) {
    return (nome || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
}

function normalizarTexto(texto) {
    return (texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
}

function irParaCidade(cidade) {
    if (!cidade) return

    const slug = gerarSlug(cidade.nome)
    const uf = gerarSlug(cidade.estado)
    window.location.href = `/cidade/${slug}/${uf}`
}

function preencherSelect(cidades) {
    select.innerHTML = `<option value="">Selecione uma cidade</option>`

    cidades.forEach(cidade => {
        const option = document.createElement("option")
        option.value = JSON.stringify({ nome: cidade.nome, estado: cidade.estado })
        option.textContent = `${cidade.nome} (${cidade.estado})`
        select.appendChild(option)
    })
}

function renderizarSugestoes(termo) {
    const busca = normalizarTexto(termo).trim()

    if (!busca) {
        boxSugestoes.style.display = "none"
        boxSugestoes.innerHTML = ""
        return
    }

    const resultados = cidadesCache
        .filter(cidade => {
            const cidadeTexto = normalizarTexto(`${cidade.nome} ${cidade.estado}`)
            return cidadeTexto.includes(busca)
        })
        .slice(0, 12)

    if (!resultados.length) {
        boxSugestoes.style.display = "block"
        boxSugestoes.innerHTML = `<div class="cidade-sugestao text-muted">Nenhuma cidade encontrada</div>`
        return
    }

    boxSugestoes.style.display = "block"
    boxSugestoes.innerHTML = ""

    resultados.forEach(cidade => {
        const button = document.createElement("button")
        button.type = "button"
        button.className = "cidade-sugestao"
        button.textContent = `${cidade.nome} / ${cidade.estado}`
        button.addEventListener("click", () => irParaCidade(cidade))
        boxSugestoes.appendChild(button)
    })
}

function buscarCidadeDigitada() {
    const termo = normalizarTexto(inputCidade.value).trim()
    if (!termo) return

    const cidade = cidadesCache.find(item => {
        return normalizarTexto(`${item.nome} ${item.estado}`) === termo
            || normalizarTexto(item.nome) === termo
    }) || cidadesCache.find(item => normalizarTexto(item.nome).includes(termo))

    irParaCidade(cidade)
}

async function carregarCidades() {
    const res = await fetch("/api/cidades")
    const cidades = await res.json()

    cidadesCache = cidades.sort((a, b) => {
        return `${a.nome} ${a.estado}`.localeCompare(`${b.nome} ${b.estado}`, "pt-BR")
    })

    preencherSelect(cidadesCache)
}

select.addEventListener("change", () => {
    if (!select.value) return

    const cidade = JSON.parse(select.value)
    irParaCidade(cidade)
})

inputCidade.addEventListener("input", () => {
    renderizarSugestoes(inputCidade.value)
})

inputCidade.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault()
        buscarCidadeDigitada()
    }
})

btnBuscarCidade.addEventListener("click", buscarCidadeDigitada)

document.addEventListener("click", (event) => {
    if (!boxSugestoes.contains(event.target) && event.target !== inputCidade) {
        boxSugestoes.style.display = "none"
    }
})

carregarCidades()
