const express = require('express');
const router = express.Router();
const db = require("./../../database/pool_connection");
const { getSeoCidade } = require('../../helpers/seo');

function slugify(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

// Rota nova: /cidade/:slug/:uf (ex: /cidade/mesquita/rj)
router.get("/cidade/:slug/:uf", async (req, res) => {
  const { slug, uf } = req.params;

  const [cidades] = await db.query(`SELECT * FROM cidades`);

  const cidade = cidades.find(c => {
    return slugify(c.nome) === slug && c.estado.toLowerCase() === uf.toLowerCase();
  });

  if (!cidade) {
    return res.status(404).send("Cidade não encontrada");
  }

  const seo = await getSeoCidade(cidade);
  const breadcrumbs = [
    { name: 'Home', url: 'https://www.temcar.com.br/' },
    { name: 'Cidades', url: 'https://www.temcar.com.br/buscar-cidades' },
    { name: cidade.nome, url: `https://www.temcar.com.br/cidade/${slug}/${uf}` }
  ];
  res.render("cidade", { cidade, seo, breadcrumbs });
});

// Rota antiga: /cidade/:slug → redireciona 301 para /cidade/:slug/:uf
router.get("/cidade/:slug", async (req, res) => {
  const { slug } = req.params;

  const [cidades] = await db.query(`SELECT * FROM cidades`);

  const cidade = cidades.find(c => slugify(c.nome) === slug);

  if (!cidade) {
    return res.status(404).send("Cidade não encontrada");
  }

  const uf = cidade.estado.toLowerCase();
  res.redirect(301, `/cidade/${slug}/${uf}`);
});

module.exports = router;
