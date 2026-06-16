(async function () {
  try {
    const resposta = await fetch("/api/configuracoes-site");
    if (!resposta.ok) return;

    const config = await resposta.json();

    /* ===== FAVICON =====
       Favicon é fixo (/favicon/favicon.png), definido no <head>.
       Não é sobrescrito pela configuração do banco. */

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