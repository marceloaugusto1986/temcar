(async function () {
  try {
    const resposta = await fetch("/api/configuracoes-site");
    if (!resposta.ok) return;

    const config = await resposta.json();

    /* ===== FAVICON ===== */
    if (config.favicon) {
      const link = document.getElementById("site-favicon");

      if (link) {
        link.href = "/uploads/anuncios/" + config.favicon + "?v=" + Date.now();
      }
    }

    /* ===== LOGO ===== */
    if (config.logo) {
      document.querySelectorAll(".site-logo").forEach(img => {
        img.src = "/uploads/anuncios/" + config.logo + "?v=" + Date.now();
      });
    }

  } catch (erro) {
    console.error("Erro ao carregar config:", erro);
  }
})();