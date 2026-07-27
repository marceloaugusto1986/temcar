const adminEditParams = new URLSearchParams(window.location.search);
const adminEditContext = adminEditParams.get("context");
const adminEditAnuncioId = adminEditParams.get("id");

const adminEditSection = document.getElementById("adminEditSection");
const adminEditForm = document.getElementById("form-editar-anuncio-admin");
const adminEditPreview = document.getElementById("previewImagensEdicaoAdmin");
const adminEditInputImagens = adminEditForm?.querySelector('[name="imagens"]');
const adminEditButton = document.getElementById("btnEditarAnuncio");
const adminEditCancelButtons = [
  document.getElementById("btnCancelarEdicaoAdmin"),
  document.getElementById("btnCancelarEdicaoAdminRodape")
].filter(Boolean);

let adminEditImagensRemovidas = [];

if (adminEditContext === "admin" && adminEditButton && adminEditForm) {
  adminEditButton.addEventListener("click", () => abrirEdicaoAdmin(adminEditAnuncioId));
  adminEditCancelButtons.forEach(button => {
    button.addEventListener("click", cancelarEdicaoAdmin);
  });
}

/* =====================================================
   MOTO x VEÍCULO
   -----------------------------------------------------
   Editar uma moto tem que mostrar o formulário de moto:
   marcas, câmbio, combustível, cor e acessórios são
   listas diferentes, e cilindrada substitui motorização,
   portas, carroceria e tração.
===================================================== */
const OPCOES_EDICAO_ADMIN = {
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
      "Chevrolet", "Volkswagen", "Fiat", "Ford", "Honda", "Toyota",
      "Hyundai", "Renault", "Nissan", "BMW", "Mercedes-Benz", "Audi",
      "Jeep", "Kia", "Peugeot", "Citroën"
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

const adminTipoSelect = adminEditForm?.querySelector('[name="tipo"]');
const adminAcessoriosContainer = document.getElementById("acessoriosEdicaoAdmin");
const adminTituloEdicao = document.getElementById("tituloEdicaoAdmin");
const adminLabelImagens = document.getElementById("labelImagensEdicaoAdmin");

function ehTipoMotoAdmin() {
  return !!adminTipoSelect && adminTipoSelect.value === "Moto";
}

function escaparHtmlAdmin(texto) {
  return String(texto).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

/* Reescreve as opções de um select. O valor atual só sobrevive se
   existir na nova lista — trocar o tipo não pode deixar marca de
   carro em moto. Valor legado do anúncio é reposto por setAdminSelect. */
function preencherSelectAdmin(name, opcoes) {
  const field = adminEditForm?.querySelector(`[name="${name}"]`);
  if (!field) return;

  const valorAtual = field.value;

  field.innerHTML =
    `<option value="">Selecione</option>` +
    opcoes.map(op => `<option>${escaparHtmlAdmin(op)}</option>`).join("");

  field.value = opcoes.includes(valorAtual) ? valorAtual : "";
}

/* Monta os checkboxes de acessórios do tipo, mantendo marcados
   os que já estavam (inclusive acessórios fora da lista atual). */
function montarAcessoriosAdmin(acessorios, marcados = []) {
  if (!adminAcessoriosContainer) return;

  const extras = marcados.filter(item => !acessorios.includes(item));

  adminAcessoriosContainer.innerHTML = [...acessorios, ...extras]
    .map(item => `
      <div class="col-md-3">
        <label>
          <input type="checkbox" data-admin-acessorio="${escaparHtmlAdmin(item)}"
            ${marcados.includes(item) ? "checked" : ""}> ${escaparHtmlAdmin(item)}
        </label>
      </div>
    `)
    .join("");
}

function acessoriosMarcadosAdmin() {
  return [...adminEditForm.querySelectorAll("[data-admin-acessorio]:checked")]
    .map(checkbox => checkbox.dataset.adminAcessorio);
}

/* Troca o formulário inteiro para o tipo informado.
   `marcados` só é passado ao carregar um anúncio; na troca manual
   de tipo aproveitamos o que já estava selecionado. */
function aplicarTipoNoFormularioAdmin(marcados) {
  if (!adminEditForm) return;

  const ehMoto = ehTipoMotoAdmin();
  const opcoes = ehMoto ? OPCOES_EDICAO_ADMIN.moto : OPCOES_EDICAO_ADMIN.veiculo;

  if (adminTituloEdicao) {
    adminTituloEdicao.textContent = ehMoto ? "Editar moto" : "Editar veículo";
  }

  if (adminLabelImagens) {
    adminLabelImagens.textContent = ehMoto ? "Imagens da moto" : "Imagens";
  }

  adminEditForm.querySelectorAll(".campo-moto-admin").forEach(el => {
    el.classList.toggle("d-none", !ehMoto);
  });

  adminEditForm.querySelectorAll(".campo-veiculo-admin").forEach(el => {
    el.classList.toggle("d-none", ehMoto);
  });

  preencherSelectAdmin("marca", opcoes.marcas);
  preencherSelectAdmin("cambio", opcoes.cambio);
  preencherSelectAdmin("combustivel", opcoes.combustivel);
  preencherSelectAdmin("cor", opcoes.cores);

  // Na troca manual de tipo descarta os acessórios do tipo anterior;
  // ao carregar o anúncio, mantém até os que não estão mais na lista.
  const selecionados = marcados
    ?? acessoriosMarcadosAdmin().filter(item => opcoes.acessorios.includes(item));

  montarAcessoriosAdmin(opcoes.acessorios, selecionados);

  // Zera o que não se aplica, para não gravar dado de outro tipo.
  const limpar = ehMoto
    ? ["motorizacao", "portas", "carroceria", "tracao"]
    : ["cilindrada"];

  limpar.forEach(name => {
    const field = adminEditForm.querySelector(`[name="${name}"]`);
    if (field) field.value = "";
  });
}

if (adminTipoSelect) {
  adminTipoSelect.addEventListener("change", () => aplicarTipoNoFormularioAdmin());
}

// Estado inicial, para o form não abrir com os selects vazios
// enquanto o anúncio ainda está carregando.
aplicarTipoNoFormularioAdmin([]);

async function abrirEdicaoAdmin(id) {
  if (!id) {
    alert("Anúncio inválido");
    return;
  }

  adminEditImagensRemovidas = [];
  adminEditForm.reset();
  adminEditPreview.innerHTML = "";
  adminEditSection.classList.remove("d-none");
  adminEditSection.scrollIntoView({ behavior: "smooth" });

  try {
    const response = await fetch(`/api/admin/anuncios/${id}`, {
      credentials: "include"
    });

    const anuncio = await response.json();

    if (!response.ok) {
      throw new Error(anuncio.message || "Erro ao carregar anúncio");
    }

    preencherFormularioAdmin(anuncio);
    renderizarImagensAdmin(anuncio.imagens);

  } catch (error) {
    alert(error.message);
  }
}

function cancelarEdicaoAdmin() {
  adminEditImagensRemovidas = [];
  adminEditForm.reset();
  adminEditPreview.innerHTML = "";
  adminEditSection.classList.add("d-none");
}

function preencherFormularioAdmin(anuncio) {
  setAdminSelect("tipo", anuncio.tipo);

  // Troca o formulário para o tipo do anúncio ANTES de preencher:
  // é isso que monta as marcas/câmbio/combustível/cor/acessórios
  // corretos (moto x carro/utilitário).
  aplicarTipoNoFormularioAdmin(normalizarAcessoriosAdmin(anuncio.acessorios));

  setAdminSelect("marca", anuncio.marca);
  setAdminInput("versao", anuncio.versao);
  setAdminInput("ano_fabricacao", anuncio.ano_fabricacao);
  setAdminInput("ano_modelo", anuncio.ano_modelo);
  setAdminInput("km", anuncio.km);
  setAdminSelect("condicao", capitalizarAdmin(anuncio.condicao));
  setAdminSelect("cambio", anuncio.cambio);
  setAdminSelect("combustivel", anuncio.combustivel);
  setAdminSelect("cor", anuncio.cor);

  if (ehTipoMotoAdmin()) {
    setAdminSelect("cilindrada", anuncio.cilindrada);
  } else {
    setAdminSelect("motorizacao", anuncio.motorizacao);
    setAdminSelect("portas", anuncio.portas);
    setAdminSelect("carroceria", anuncio.carroceria);
    setAdminSelect("tracao", anuncio.tracao);
  }

  setAdminInput("preco", anuncio.preco);
  setAdminTextarea("descricao", anuncio.descricao);
  setAdminCheckbox("destaque", anuncio.destaque);
}

function setAdminCheckbox(name, value) {
  const field = adminEditForm.querySelector(`[name="${name}"]`);
  if (field) field.checked = Boolean(Number(value));
}

function setAdminInput(name, value) {
  const field = adminEditForm.querySelector(`[name="${name}"]`);
  if (field) field.value = value ?? "";
}

function setAdminTextarea(name, value) {
  const field = adminEditForm.querySelector(`[name="${name}"]`);
  if (field) field.value = value ?? "";
}

function setAdminSelect(name, value) {
  const field = adminEditForm.querySelector(`[name="${name}"]`);
  if (!field || value == null) return;

  const normalizedValue = String(value).trim();

  if (!normalizedValue) {
    field.value = "";
    return;
  }

  const option = [...field.options].find(item => (
    item.value === normalizedValue || item.text === normalizedValue
  ));

  // Valor gravado que não está na lista (dado legado): vira opção,
  // senão a edição apagaria silenciosamente o campo.
  if (!option) {
    field.appendChild(new Option(normalizedValue, normalizedValue));
  }

  field.value = option ? option.value : normalizedValue;
}

function capitalizarAdmin(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

/* O banco pode devolver array, JSON em string ou string solta. */
function normalizarAcessoriosAdmin(acessorios) {
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

function renderizarImagensAdmin(imagens) {
  adminEditPreview.innerHTML = "";

  if (!Array.isArray(imagens)) return;

  imagens.forEach(imagem => {
    if (!imagem.imagem) return;

    const item = document.createElement("div");
    item.className = "position-relative imagem-item-admin";
    item.dataset.nome = imagem.imagem;
    item.dataset.principal = imagem.principal ? "1" : "0";

    item.innerHTML = `
      <img
        src="/uploads/anuncios/${imagem.imagem}"
        style="width:120px;height:90px;object-fit:cover;border-radius:8px">

      ${imagem.principal ? `
        <span class="badge bg-primary position-absolute bottom-0 start-0">
          Principal
        </span>` : ""}

      <button type="button"
        class="btn btn-danger btn-sm position-absolute top-0 end-0"
        aria-label="Remover imagem">
        x
      </button>
    `;

    item.querySelector("button").addEventListener("click", () => {
      removerImagemAdmin(imagem.imagem, item);
    });

    adminEditPreview.appendChild(item);
  });
}

function removerImagemAdmin(nome, item) {
  const eraPrincipal = item?.dataset.principal === "1";

  adminEditImagensRemovidas.push(nome);
  item?.remove();

  if (eraPrincipal) {
    const primeira = adminEditPreview.querySelector(".imagem-item-admin");

    if (primeira) {
      primeira.dataset.principal = "1";

      const badge = document.createElement("span");
      badge.className = "badge bg-primary position-absolute bottom-0 start-0";
      badge.innerText = "Principal";
      primeira.appendChild(badge);
    }
  }
}

adminEditInputImagens?.addEventListener("change", function () {
  [...this.files].forEach(file => {
    const reader = new FileReader();

    reader.onload = event => {
      const item = document.createElement("div");
      item.className = "position-relative";
      item.innerHTML = `
        <img
          src="${event.target.result}"
          style="width:120px;height:90px;object-fit:cover;border-radius:8px">

        <span class="badge bg-success position-absolute top-0 start-0">
          nova
        </span>
      `;

      adminEditPreview.appendChild(item);
    };

    reader.readAsDataURL(file);
  });
});

adminEditForm?.addEventListener("submit", async event => {
  event.preventDefault();

  const imagensRestantes = adminEditPreview.querySelectorAll(".imagem-item-admin").length;
  const imagensNovas = adminEditInputImagens.files.length;

  if (imagensRestantes + imagensNovas === 0) {
    alert("O anúncio precisa ter pelo menos uma imagem.");
    return;
  }

  const formData = new FormData(adminEditForm);

  formData.set("destaque", adminEditForm.querySelector('[name="destaque"]')?.checked ? "1" : "0");
  formData.append("acessorios", JSON.stringify(acessoriosMarcadosAdmin()));
  formData.append("imagensRemovidas", JSON.stringify(adminEditImagensRemovidas));

  try {
    const response = await fetch(`/api/admin/anuncios/${adminEditAnuncioId}`, {
      method: "PUT",
      body: formData,
      credentials: "include"
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Erro ao salvar anúncio");
    }

    alert("Anúncio atualizado com sucesso!");
    window.location.reload();

  } catch (error) {
    alert(error.message);
  }
});
