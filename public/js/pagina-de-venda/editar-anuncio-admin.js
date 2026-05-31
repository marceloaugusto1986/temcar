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
  setAdminSelect("marca", anuncio.marca);
  setAdminInput("versao", anuncio.versao);
  setAdminInput("ano_fabricacao", anuncio.ano_fabricacao);
  setAdminInput("ano_modelo", anuncio.ano_modelo);
  setAdminInput("km", anuncio.km);
  setAdminSelect("condicao", capitalizarAdmin(anuncio.condicao));
  setAdminSelect("cambio", anuncio.cambio);
  setAdminSelect("motorizacao", String(anuncio.motorizacao ?? ""));
  setAdminSelect("portas", String(anuncio.portas ?? ""));
  setAdminSelect("carroceria", anuncio.carroceria);
  setAdminSelect("combustivel", anuncio.combustivel);
  setAdminSelect("tracao", anuncio.tracao);
  setAdminSelect("cor", anuncio.cor);
  setAdminInput("preco", anuncio.preco);
  setAdminTextarea("descricao", anuncio.descricao);
  preencherAcessoriosAdmin(anuncio.acessorios);
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

  const normalizedValue = String(value);
  const option = [...field.options].find(item => (
    item.value === normalizedValue || item.text === normalizedValue
  ));

  field.value = option ? option.value : "";
}

function capitalizarAdmin(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function preencherAcessoriosAdmin(acessorios) {
  adminEditForm
    .querySelectorAll("[data-admin-acessorio]")
    .forEach(checkbox => checkbox.checked = false);

  if (!acessorios) return;

  let lista = [];

  if (Array.isArray(acessorios)) {
    lista = acessorios;
  } else if (typeof acessorios === "string") {
    try {
      lista = JSON.parse(acessorios);
    } catch {
      lista = [acessorios];
    }
  }

  adminEditForm.querySelectorAll("[data-admin-acessorio]").forEach(checkbox => {
    checkbox.checked = lista.includes(checkbox.dataset.adminAcessorio);
  });
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
  const acessorios = [];

  adminEditForm
    .querySelectorAll("[data-admin-acessorio]:checked")
    .forEach(checkbox => acessorios.push(checkbox.dataset.adminAcessorio));

  formData.append("acessorios", JSON.stringify(acessorios));
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
