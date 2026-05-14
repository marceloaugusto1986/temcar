/* ==========================
   CONFIG
========================== */
const API_LISTAR = "/api/admin/home/carrossel";
const API_SALVAR = "/api/admin/home/carrossel";
const API_EXCLUIR = "/api/admin/home/carrossel";


/* ==========================
   CRIAR UI DO SLIDE
========================== */
window.adicionarSlide = function (dados = {}) {
  const template = document.getElementById("templateSlide");
  const clone = template.content.cloneNode(true);
  const slide = clone.querySelector(".slide-item");

  const inputId = slide.querySelector(".input-id");
  const inputImagem = slide.querySelector(".input-imagem");
  const preview = slide.querySelector(".preview");

  const inputTitulo = slide.querySelector(".input-titulo");
  const inputDescricao = slide.querySelector(".input-descricao");
  const inputLink = slide.querySelector(".input-link");
  const inputOrdem = slide.querySelector(".input-ordem");
  const inputAtivo = slide.querySelector(".input-ativo");

  const btnRemover = slide.querySelector(".btn-remover");

  /* ===== PREENCHER DADOS EXISTENTES ===== */
  if (dados.id) inputId.value = dados.id;
  if (dados.imagem) preview.src = dados.imagem;
  if (dados.titulo) inputTitulo.value = dados.titulo;
  if (dados.descricao) inputDescricao.value = dados.descricao;
  if (dados.link) inputLink.value = dados.link;
  if (dados.ordem !== undefined) inputOrdem.value = dados.ordem;
  if (dados.ativo !== undefined) inputAtivo.checked = dados.ativo;

  /* ===== PREVIEW AO TROCAR IMAGEM ===== */
  inputImagem.addEventListener("change", () => {
    const file = inputImagem.files[0];
    if (file) preview.src = URL.createObjectURL(file);
  });

  /* ===== EXCLUIR ===== */
  btnRemover.addEventListener("click", async () => {
    const id = inputId.value;

    if (!id) {
      slide.remove();
      return;
    }

    if (!confirm("Deseja excluir esta imagem do carrossel?")) return;

    try {
      const resposta = await fetch(`${API_EXCLUIR}/${id}`, {
        method: "DELETE"
      });

      const json = await resposta.json();

      if (resposta.ok) {
        slide.remove();
      } else {
        alert(json.message || "Erro ao excluir.");
      }

    } catch (erro) {
      console.error(erro);
      alert("Erro ao excluir imagem.");
    }
  });

  document.getElementById("listaSlides").appendChild(clone);
};


/* ==========================
   CARREGAR SLIDES DO BANCO
========================== */
window.carregarSlidesExistentes = async function () {
  try {
    const resposta = await fetch(API_LISTAR);
    const slides = await resposta.json();

    document.getElementById("listaSlides").innerHTML = "";

    slides.forEach(slide => {
      adicionarSlide({
        id: slide.id,
        imagem: "/uploads/anuncios/" + slide.imagem,
        titulo: slide.titulo,
        descricao: slide.descricao,
        link: slide.link,
        ordem: slide.ordem,
        ativo: slide.ativo
      });
    });

  } catch (erro) {
    console.error("Erro ao carregar carrossel:", erro);
  }
};


/* ==========================
   SALVAR (CRIAR + EDITAR)
========================== */
window.salvarImagensSite = async function () {
  const slides = document.querySelectorAll(".slide-item");
  const formData = new FormData();

  if (slides.length === 0) {
    alert("Adicione pelo menos uma imagem.");
    return;
  }

  slides.forEach(slide => {
    const id = slide.querySelector(".input-id").value;
    const fileInput = slide.querySelector(".input-imagem");
    const titulo = slide.querySelector(".input-titulo").value;
    const descricao = slide.querySelector(".input-descricao").value;
    const link = slide.querySelector(".input-link").value;
    const ordem = slide.querySelector(".input-ordem").value;
    const ativo = slide.querySelector(".input-ativo").checked;

    const file = fileInput.files[0];

    formData.append("ids[]", id || "");
    formData.append("titulos[]", titulo);
    formData.append("descricoes[]", descricao);
    formData.append("links[]", link);
    formData.append("ordens[]", ordem);
    formData.append("ativos[]", ativo);

    /* 🔴 CHAVE DA SOLUÇÃO */
    formData.append("temImagem[]", file ? "true" : "false");

    if (file) formData.append("imagens", file);
  });

  try {
    const resposta = await fetch(API_SALVAR, {
      method: "POST",
      body: formData
    });

    const json = await resposta.json();

    if (resposta.ok) {
      alert(json.message || "Carrossel salvo com sucesso!");
      carregarSlidesExistentes();
    } else {
      alert(json.message || "Erro ao salvar.");
    }

  } catch (erro) {
    console.error("Erro ao salvar:", erro);
    alert("Erro de conexão com o servidor.");
  }
};


/* ==========================
   AUTO LOAD
========================== */
document.addEventListener("DOMContentLoaded", () => {
  carregarSlidesExistentes();
});