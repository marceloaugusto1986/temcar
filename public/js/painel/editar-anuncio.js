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
  setSelect("marca", a.marca);
  setInput("versao", a.versao);

  setInput("ano_fabricacao", a.ano_fabricacao);
  setInput("ano_modelo", a.ano_modelo);
  setInput("km", a.km);

  setSelect("condicao", capitalizar(a.condicao));
  setSelect("cambio", a.cambio);
  setSelect("motorizacao", String(a.motorizacao));
  setSelect("portas", String(a.portas));

  setSelect("carroceria", a.carroceria);
  setSelect("combustivel", a.combustivel);
  setSelect("tracao", a.tracao);
  setSelect("cor", a.cor);

  setInput("preco", a.preco);
  setTextarea("descricao", a.descricao);

  preencherAcessorios(a.acessorios);
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

  const val = String(value);
  const opt = [...el.options].find(o => o.value === val || o.text === val);
  el.value = opt ? opt.value : "";
}

function capitalizar(txt) {
  return txt ? txt.charAt(0).toUpperCase() + txt.slice(1) : "";
}

/* =====================================================
   ACESSÓRIOS (ROBUSTO)
===================================================== */
function preencherAcessorios(acessorios) {
  document
    .querySelectorAll("[data-acessorio]")
    .forEach(cb => cb.checked = false);

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

  document.querySelectorAll("[data-acessorio]").forEach(cb => {
    cb.checked = lista.includes(cb.dataset.acessorio);
  });
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

  const acessorios = [];
  document
    .querySelectorAll("[data-acessorio]:checked")
    .forEach(cb => acessorios.push(cb.dataset.acessorio));

  formData.append("acessorios", JSON.stringify(acessorios));
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