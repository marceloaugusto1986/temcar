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

function capitalize(texto) {
  return (texto || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

async function garantirColunasRegioesImagens() {
  const [colunas] = await db.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'regioes_imagens'
  `);

  const nomes = colunas.map(coluna => coluna.COLUMN_NAME);

  if (!nomes.includes('link')) {
    await db.query(`
      ALTER TABLE regioes_imagens
      ADD COLUMN link varchar(500) DEFAULT NULL AFTER imagem
    `);
  }

  if (!nomes.includes('imagem_mobile')) {
    await db.query(`
      ALTER TABLE regioes_imagens
      ADD COLUMN imagem_mobile varchar(255) DEFAULT NULL AFTER imagem
    `);
  }
}

async function garantirColunaImagemMobileCidades() {
  const [colunas] = await db.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'cidades'
      AND COLUMN_NAME = 'imagem_mobile'
  `);

  if (!colunas.length) {
    await db.query(`
      ALTER TABLE cidades
      ADD COLUMN imagem_mobile varchar(255) DEFAULT NULL AFTER imagem
    `);
  }
}

// ── /cidade/:slug/:uf (rota original) ──
router.get("/cidade/:slug/:uf", async (req, res) => {
  const { slug, uf } = req.params;
  const [cidades] = await db.query(`SELECT * FROM cidades`);
  const cidade = cidades.find(c =>
    slugify(c.nome) === slug && c.estado.toLowerCase() === uf.toLowerCase()
  );
  if (!cidade) return res.status(404).send("Cidade não encontrada");
  const seo = await getSeoCidade(cidade);
  const breadcrumbs = [
    { name: 'Home', url: 'https://www.temcar.com.br/' },
    { name: 'Cidades', url: 'https://www.temcar.com.br/buscar-cidades' },
    { name: cidade.nome, url: `https://www.temcar.com.br/cidade/${slug}/${uf}` }
  ];
  res.render("cidade", { cidade, seo, breadcrumbs });
});

// ── /veiculos/:estado/:cidade/:bairro ──
router.get("/veiculos/:estado/:cidade/:bairro", async (req, res) => {
  const { estado, cidade, bairro } = req.params;
  const nomeBairro  = capitalize(bairro);
  const nomeCidade  = capitalize(cidade);
  const ufUpper     = estado.toUpperCase();

  const seo = {
    titulo: `Veículos em ${nomeBairro}, ${nomeCidade} - ${ufUpper} | TEMCAR`,
    descricao: `Compre e venda veículos no bairro ${nomeBairro}, ${nomeCidade} - ${ufUpper}. Encontre carros e motos perto de você no TEMCAR.`,
    keywords: `veículos ${nomeBairro}, carros ${nomeBairro}, ${nomeCidade}, ${ufUpper}`,
    texto_h1: `Veículos em ${nomeBairro} — ${nomeCidade}`,
    link_canonico: `https://www.temcar.com.br/veiculos/${estado}/${cidade}/${bairro}`
  };
  const breadcrumbs = [
    { name: 'Home', url: 'https://www.temcar.com.br/' },
    { name: 'Cidades', url: 'https://www.temcar.com.br/buscar-cidades' },
    { name: `${nomeCidade} - ${ufUpper}`, url: `https://www.temcar.com.br/cidade/${cidade}/${estado}` },
    { name: nomeBairro, url: `https://www.temcar.com.br/veiculos/${estado}/${cidade}/${bairro}` }
  ];
  res.render("cidade", {
    cidade: { nome: nomeBairro, estado: ufUpper, imagem: null },
    seo, breadcrumbs
  });
});

// ── /veiculos/:estado/:cidade ──
router.get("/veiculos/:estado/:cidade", async (req, res) => {
  const { estado, cidade } = req.params;
  const nomeCidade = capitalize(cidade);
  const ufUpper    = estado.toUpperCase();

  const seo = {
    titulo: `Veículos em ${nomeCidade} - ${ufUpper} | TEMCAR`,
    descricao: `Compre e venda veículos em ${nomeCidade} - ${ufUpper}. Encontre carros e motos no TEMCAR.`,
    keywords: `veículos ${nomeCidade}, carros ${nomeCidade}, ${ufUpper}`,
    texto_h1: `Veículos em ${nomeCidade} - ${ufUpper}`,
    link_canonico: `https://www.temcar.com.br/veiculos/${estado}/${cidade}`
  };
  const breadcrumbs = [
    { name: 'Home', url: 'https://www.temcar.com.br/' },
    { name: 'Cidades', url: 'https://www.temcar.com.br/buscar-cidades' },
    { name: `${nomeCidade} - ${ufUpper}`, url: `https://www.temcar.com.br/veiculos/${estado}/${cidade}` }
  ];
  res.render("cidade", {
    cidade: { nome: nomeCidade, estado: ufUpper, imagem: null },
    seo, breadcrumbs
  });
});

// ── /veiculos/:estado ──
router.get("/veiculos/:estado", async (req, res) => {
  const { estado } = req.params;
  const ufUpper = estado.toUpperCase();

  const seo = {
    titulo: `Veículos em ${ufUpper} | TEMCAR`,
    descricao: `Compre e venda veículos no estado ${ufUpper}. Encontre carros e motos no TEMCAR.`,
    keywords: `veículos ${ufUpper}, carros ${ufUpper}`,
    texto_h1: `Veículos em ${ufUpper}`,
    link_canonico: `https://www.temcar.com.br/veiculos/${estado}`
  };
  const breadcrumbs = [
    { name: 'Home', url: 'https://www.temcar.com.br/' },
    { name: `Veículos - ${ufUpper}`, url: `https://www.temcar.com.br/veiculos/${estado}` }
  ];
  res.render("cidade", {
    cidade: { nome: ufUpper, estado: ufUpper, imagem: null },
    seo, breadcrumbs
  });
});

// ── API banners da cidade ──
router.get("/api/cidades/:slug/:uf/banners", async (req, res) => {
  try {
    const { slug, uf } = req.params;
    await garantirColunaImagemMobileCidades();
    const [cidades] = await db.query(`SELECT * FROM cidades`);
    const cidade = cidades.find(c =>
      slugify(c.nome) === slug && c.estado.toLowerCase() === uf.toLowerCase()
    );
    if (!cidade) return res.status(404).json({ message: "Cidade não encontrada" });
    await garantirColunasRegioesImagens();
    const [banners] = await db.query(
      `SELECT id, imagem, imagem_mobile, link FROM regioes_imagens WHERE cidade = ? ORDER BY id ASC`,
      [cidade.nome]
    );
    const imagens = banners.map(b => ({
      id: b.id,
      imagem: `/uploads/anuncios/${b.imagem}`,
      imagem_mobile: b.imagem_mobile ? `/uploads/anuncios/${b.imagem_mobile}` : null,
      link: b.link || ''
    }));
    if (!imagens.length && (cidade.imagem || cidade.imagem_mobile)) {
      imagens.push({
        id: `cidade-${cidade.id}`,
        imagem: cidade.imagem || cidade.imagem_mobile,
        imagem_mobile: cidade.imagem_mobile || null
      });
    }
    res.json(imagens);
  } catch (error) {
    console.error("Erro ao buscar banners da cidade:", error);
    res.status(500).json({ message: "Erro interno" });
  }
});

// ── Rota antiga: /cidade/:slug → redirect 301 ──
router.get("/cidade/:slug", async (req, res) => {
  const { slug } = req.params;
  const [cidades] = await db.query(`SELECT * FROM cidades`);
  const cidade = cidades.find(c => slugify(c.nome) === slug);
  if (!cidade) return res.status(404).send("Cidade não encontrada");
  res.redirect(301, `/cidade/${slug}/${cidade.estado.toLowerCase()}`);
});

module.exports = router;
