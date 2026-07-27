/* =====================================================
   ESTADO GLOBAL
===================================================== */
let anuncioEditandoId = null;
let imagensRemovidas = [];

/* =====================================================
   ELEMENTOS FIXOS
===================================================== */
const formEdicao = document.getElementById("form-editar-anuncio");
const listaAnuncios = document.getElementById("container-editar-excluir-anuncio");
const previewImagensEdicao = document.getElementById("previewImagensEdicao");
const inputImagens = formEdicao.querySelector('[name="imagens"]');
const containerAcessorios = document.getElementById("acessorios-edicao");
const tituloFormEdicao = document.getElementById("titulo-form-edicao");
const labelImagensEdicao = document.getElementById("label-imagens-edicao");

/* =====================================================
   MOTO x VEÍCULO
   -----------------------------------------------------
   Editar uma moto tem que mostrar o formulário de moto,
   e não o de veículos: marcas, câmbio, combustível, cor
   e acessórios são listas diferentes. As opções abaixo
   espelham criar-anuncio.ejs e criar-anuncio-moto.ejs.
===================================================== */
const OPCOES_EDICAO = {
  moto: {
    marcas: [
      "Honda", "Yamaha", "Suzuki", "Kawasaki", "BMW", "Harley-Davidson",
      "Ducati", "Triumph", "Royal Enfield", "KTM", "Dafra", "Haojue",
      "Shineray", "Traxx", "Bajaj", "Outra"
    ],
    cambio: ["Manual", "Automático", "Semi-automático"],
    combustivel: ["Gasolina", "Flex", "Elétrico"],
    cores: [
      "Branco", "Preto", "Prata", "Cinza", "Grafite",
      "Vermelho", "Azul", "Verde", "Amarelo", "Vinho"
    ],
    acessorios: [
      "Freio ABS", "Freio CBS", "Partida elétrica", "Painel digital",
      "Farol de LED", "Alarme", "Bauleto", "Protetor de motor",
      "Manopla aquecida", "Controle de tração"
    ]
  },
  veiculo: {
    marcas: [
      "Chevrolet", "Volkswagen", "Fiat", "Ford", "Toyota", "Hyundai",
      "Renault", "Nissan", "Jeep", "Peugeot", "Citroën", "Kia",
      "Mercedes-Benz", "Audi"
    ],
    cambio: ["Manual", "Automático", "Automático CVT"],
    combustivel: ["Gasolina", "Etanol", "Flex", "Diesel", "Elétrico"],
    cores: [
      "Branco", "Preto", "Prata", "Cinza", "Grafite",
      "Vermelho", "Azul", "Vinho", "Bege"
    ],
    acessorios: [
      "Ar-condicionado", "Direção elétrica", "Airbag",
      "ABS", "Multimídia", "Câmera de ré"
    ]
  }
};

const tipoEdicao = formEdicao.querySelector('[name="tipo"]');

function ehTipoMoto() {
  return !!tipoEdicao && tipoEdicao.value === "Moto";
}

function escaparHtml(txt) {
  return String(txt).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

/* Reescreve as opções de um select. O valor atual só sobrevive se
   existir na nova lista — trocar o tipo não pode deixar marca de
   carro em moto. Valor legado do anúncio é reposto por setSelect. */
function preencherSelect(name, opcoes) {
  const el = formEdicao.querySelector(`[name="${name}"]`);
  if (!el) return;

  const valorAtual = el.value;

  el.innerHTML =
    `<option value="">Selecione</option>` +
    opcoes.map(op => `<option>${escaparHtml(op)}</option>`).join("");

  el.value = opcoes.includes(valorAtual) ? valorAtual : "";
}

/* Monta os checkboxes de acessórios do tipo, mantendo marcados
   os que já estavam (inclusive acessórios fora da lista atual). */
function montarAcessorios(acessorios, marcados = []) {
  if (!containerAcessorios) return;

  const extras = marcados.filter(item => !acessorios.includes(item));

  containerAcessorios.innerHTML = [...acessorios, ...extras]
    .map(item => `
      <div class="col-md-3">
        <label>
          <input type="checkbox" data-acessorio="${escaparHtml(item)}"
            ${marcados.includes(item) ? "checked" : ""}> ${escaparHtml(item)}
        </label>
      </div>
    `)
    .join("");
}

function acessoriosMarcados() {
  return [...formEdicao.querySelectorAll("[data-acessorio]:checked")]
    .map(cb => cb.dataset.acessorio);
}

/* Troca o formulário inteiro para o tipo informado.
   `marcados` só é passado ao carregar um anúncio; na troca manual
   de tipo aproveitamos o que já estava selecionado. */
function aplicarTipoNoFormulario(marcados) {
  const ehMoto = ehTipoMoto();
  const opcoes = ehMoto ? OPCOES_EDICAO.moto : OPCOES_EDICAO.veiculo;

  if (tituloFormEdicao) {
    tituloFormEdicao.textContent = ehMoto ? "Editar moto" : "Editar veículo";
  }

  if (labelImagensEdicao) {
    labelImagensEdicao.textContent = ehMoto ? "Imagens da moto" : "Imagens";
  }

  formEdicao.querySelectorAll(".campo-moto").forEach(el => {
    el.classList.toggle("d-none", !ehMoto);
  });

  formEdicao.querySelectorAll(".campo-veiculo").forEach(el => {
    el.classList.toggle("d-none", ehMoto);
  });

  preencherSelect("marca", opcoes.marcas);
  preencherSelect("cambio", opcoes.cambio);
  preencherSelect("combustivel", opcoes.combustivel);
  preencherSelect("cor", opcoes.cores);

  // Na troca manual de tipo descarta os acessórios do tipo anterior;
  // ao carregar o anúncio, mantém até os que não estão mais na lista.
  const selecionados = marcados
    ?? acessoriosMarcados().filter(item => opcoes.acessorios.includes(item));

  montarAcessorios(opcoes.acessorios, selecionados);

  // Cilindrada só é obrigatória (e só existe) para moto.
  const cilindrada = formEdicao.querySelector('[name="cilindrada"]');
  if (cilindrada) cilindrada.required = ehMoto;

  // Zera o que não se aplica, para não gravar dado de outro tipo.
  const limpar = ehMoto
    ? ["motorizacao", "portas", "carroceria", "tracao"]
    : ["cilindrada"];

  limpar.forEach(name => {
    const el = formEdicao.querySelector(`[name="${name}"]`);
    if (el) el.value = "";
  });
}

if (tipoEdicao) {
  tipoEdicao.addEventListener("change", () => aplicarTipoNoFormulario());
}

// Estado inicial, para o form não abrir com os selects vazios
// enquanto o anúncio ainda está carregando.
aplicarTipoNoFormulario([]);

/* =====================================================
   ABRIR EDIÇÃO
===================================================== */
async function abrirEdicaoAnuncio(id) {
  anuncioEditandoId = id;
  imagensRemovidas = [];

  // reset visual
  formEdicao.reset();
  previewImagensEdicao.innerHTML = "";

  // mostra form / esconde lista
  listaAnuncios.classList.add("d-none");
  formEdicao.classList.remove("d-none");

  // força reflow (CRÍTICO)
  void formEdicao.offsetHeight;

  formEdicao.scrollIntoView({ behavior: "smooth" });

  try {
    const res = await fetch(`/api/anunciante/anuncios/${id}`, {
      credentials: "include"
    });

    if (!res.ok) throw new Error("Erro ao carregar anúncio");

    const anuncio = await res.json();

    preencherFormulario(anuncio);

    // ⏱ aguarda DOM visível
    setTimeout(() => {
      renderizarImagens(anuncio.imagens);
    }, 150);

  } catch (err) {
    alert(err.message);
  }
}

/* =====================================================
   CANCELAR EDIÇÃO
===================================================== */
function cancelarEdicao() {
  anuncioEditandoId = null;
  imagensRemovidas = [];

  formEdicao.reset();
  previewImagensEdicao.innerHTML = "";

  formEdicao.classList.add("d-none");
  listaAnuncios.classList.remove("d-none");
}

/* =====================================================
   PREENCHER FORMULÁRIO
===================================================== */
function preencherFormulario(a) {
  setSelect("tipo", a.tipo);

  // Troca o formulário para o tipo do anúncio ANTES de preencher:
  // é isso que monta as marcas/câmbio/combustível/cor/acessórios
  // corretos (moto x carro/utilitário).
  aplicarTipoNoFormulario(normalizarAcessorios(a.acessorios));

  const ehMoto = ehTipoMoto();

  setSelect("marca", a.marca);
  setInput("versao", a.versao);

  setInput("ano_fabricacao", a.ano_fabricacao);
  setInput("ano_modelo", a.ano_modelo);
  setInput("km", a.km);

  setSelect("condicao", capitalizar(a.condicao));
  setSelect("cambio", a.cambio);
  setSelect("combustivel", a.combustivel);
  setSelect("cor", a.cor);

  if (ehMoto) {
    setSelect("cilindrada", a.cilindrada ? String(a.cilindrada) : "");
  } else {
    setSelect("motorizacao", a.motorizacao);
    setSelect("portas", a.portas);
    setSelect("carroceria", a.carroceria);
    setSelect("tracao", a.tracao);
  }

  setInput("preco", a.preco);
  setTextarea("descricao", a.descricao);
}

/* =====================================================
   HELPERS
===================================================== */
function setInput(name, value) {
  const el = formEdicao.querySelector(`[name="${name}"]`);
  if (el) el.value = value ?? "";
}

function setTextarea(name, value) {
  const el = formEdicao.querySelector(`[name="${name}"]`);
  if (el) el.value = value ?? "";
}

function setSelect(name, value) {
  const el = formEdicao.querySelector(`[name="${name}"]`);
  if (!el || value == null) return;

  const val = String(value).trim();

  if (!val) {
    el.value = "";
    return;
  }

  const opt = [...el.options].find(o => o.value === val || o.text === val);

  // Valor gravado que não está na lista (dado legado): vira opção,
  // senão a edição apagaria silenciosamente o campo.
  if (!opt) {
    el.appendChild(new Option(val, val));
  }

  el.value = opt ? opt.value : val;
}

function capitalizar(txt) {
  return txt ? txt.charAt(0).toUpperCase() + txt.slice(1) : "";
}

/* =====================================================
   ACESSÓRIOS (ROBUSTO)
   O banco pode devolver array, JSON em string ou string solta.
===================================================== */
function normalizarAcessorios(acessorios) {
  if (!acessorios) return [];

  if (Array.isArray(acessorios)) return acessorios;

  if (typeof acessorios === "string") {
    try {
      const lista = JSON.parse(acessorios);
      return Array.isArray(lista) ? lista : [String(lista)];
    } catch {
      return [acessorios];
    }
  }

  return [];
}

/* =====================================================
   IMAGENS EXISTENTES
===================================================== */
function renderizarImagens(imagens) {
  previewImagensEdicao.innerHTML = "";

  if (!Array.isArray(imagens)) return;

  imagens.forEach(img => {
    if (!img.imagem) return;

    const div = document.createElement("div");
    div.className = "position-relative imagem-item";
    div.dataset.nome = img.imagem;
    div.dataset.principal = img.principal ? "1" : "0";

    div.innerHTML = `
      <img
        src="/uploads/anuncios/${img.imagem}"
        style="width:120px;height:90px;object-fit:cover;border-radius:8px">

      ${img.principal ? `
        <span class="badge bg-primary position-absolute bottom-0 start-0">
          Principal
        </span>` : ""}

      <button type="button"
        class="btn btn-danger btn-sm position-absolute top-0 end-0"
        onclick="removerImagem('${img.imagem}', this)">
        ✕
      </button>
    `;

    previewImagensEdicao.appendChild(div);
  });
}


/* =====================================================
   PREVIEW IMAGENS NOVAS
===================================================== */
inputImagens.addEventListener("change", function () {
  [...this.files].forEach(file => {
    const reader = new FileReader();

    reader.onload = e => {
      const div = document.createElement("div");
      div.className = "position-relative";

      div.innerHTML = `
        <img
          src="${e.target.result}"
          style="width:120px;height:90px;object-fit:cover;border-radius:8px">

        <span class="badge bg-success position-absolute top-0 start-0">
          nova
        </span>
      `;

      previewImagensEdicao.appendChild(div);
    };

    reader.readAsDataURL(file);
  });
});

/* =====================================================
   REMOVER IMAGEM
===================================================== */
function removerImagem(nome, btn) {
  const container = btn.closest(".imagem-item");
  const eraPrincipal = container?.dataset.principal === "1";

  imagensRemovidas.push(nome);
  container?.remove();

  // Se removeu a principal, define nova principal (se existir)
  if (eraPrincipal) {
    const primeira = previewImagensEdicao.querySelector(".imagem-item");
    if (primeira) {
      primeira.dataset.principal = "1";

      const badge = document.createElement("span");
      badge.className = "badge bg-primary position-absolute bottom-0 start-0";
      badge.innerText = "Principal";
      primeira.appendChild(badge);
    }
  }
}



/* =====================================================
   SUBMIT
===================================================== */
formEdicao.addEventListener("submit", async e => {
  e.preventDefault();

  // 🔒 VALIDAÇÃO DE IMAGENS
  const imagensRestantes = previewImagensEdicao.querySelectorAll(".imagem-item").length;
  const imagensNovas = inputImagens.files.length;

  if (imagensRestantes + imagensNovas === 0) {
    alert("Você precisa adicionar pelo menos uma imagem ao anúncio.");
    return;
  }

  if (!anuncioEditandoId) {
    alert("Anúncio inválido");
    return;
  }

  if (!anuncioEditandoId) {
    alert("Anúncio inválido");
    return;
  }

  const formData = new FormData(formEdicao);

  formData.append("acessorios", JSON.stringify(acessoriosMarcados()));
  formData.append("imagensRemovidas", JSON.stringify(imagensRemovidas));

  try {
    const res = await fetch(`/api/anunciante/anuncios/${anuncioEditandoId}`, {
      method: "PUT",
      body: formData,
      credentials: "include"
    });

    if (!res.ok) throw new Error("Erro ao salvar");

    alert("Anúncio atualizado com sucesso!");
    location.reload();

  } catch (err) {
    alert(err.message);
  }
});