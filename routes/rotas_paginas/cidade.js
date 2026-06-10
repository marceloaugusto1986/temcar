const express = require('express');
const router = express.Router();
const db = require("./../../database/pool_connection");
const { getSeoCidade } = require('../../helpers/seo');

function slugify(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function capitalize(texto) {
  return (texto || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

async function buscarCidadePorSlugUf(slug, uf) {
  const [cidades] = await db.query(`SELECT * FROM cidades WHERE LOWER(estado) = ?`, [uf.toLowerCase()]);
  return cidades.find(c => slugify(c.nome) === slug) || null;
}

async function buscarBairroPorSlugCidadeUf(bairroSlug, cidade, uf) {
  let bairros = [];

  try {
    [bairros] = await db.query(
      `
      SELECT nome
      FROM bairros
      WHERE cidade COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci
        AND LOWER(estado) = ?
      `,
      [cidade.nome, uf.toLowerCase()]
    );
  } catch (error) {
    if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
  }

  return bairros.find(bairro => slugify(bairro.nome) === bairroSlug) || null;
}

function obterUrlUpload(imagem) {
  if (!imagem) return null;
  if (imagem.startsWith('/')) return imagem;
  return `/uploads/anuncios/${imagem}`;
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

  if (!nomes.includes('cidade_id')) {
    await db.query(`
      ALTER TABLE regioes_imagens
      ADD COLUMN cidade_id int DEFAULT NULL AFTER id
    `);
  }

  if (!nomes.includes('estado')) {
    await db.query(`
      ALTER TABLE regioes_imagens
      ADD COLUMN estado varchar(2) DEFAULT NULL AFTER cidade
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
  const cidade = await buscarCidadePorSlugUf(slugify(slug), slugify(uf));
  if (!cidade) return res.status(404).send("Cidade não encontrada");
  const seo = await getSeoCidade(cidade);
  const breadcrumbs = [
    { name: 'Home', url: 'https://www.temcar.com.br/' },
    { name: 'Cidades', url: 'https://www.temcar.com.br/buscar-cidades' },
    { name: cidade.nome, url: `https://www.temcar.com.br/cidade/${slugify(cidade.nome)}/${cidade.estado.toLowerCase()}` }
  ];
  res.render("cidade", {
    cidade,
    seo,
    breadcrumbs,
    filtro: {
      cidade: slugify(cidade.nome),
      cidadeNome: cidade.nome,
      uf: cidade.estado.toLowerCase(),
      ufNome: cidade.estado.toUpperCase(),
      bairro: '',
      bairroNome: ''
    }
  });
});

// ── /cidade/:bairro/:cidade/:uf ──
router.get("/cidade/:bairro/:cidade/:uf", async (req, res) => {
  const bairroSlug = slugify(req.params.bairro);
  const cidadeSlug = slugify(req.params.cidade);
  const ufSlug = slugify(req.params.uf);
  const cidade = await buscarCidadePorSlugUf(cidadeSlug, ufSlug);

  if (!cidade) return res.status(404).send("Cidade não encontrada");

  const bairroEncontrado = await buscarBairroPorSlugCidadeUf(bairroSlug, cidade, ufSlug);
  const nomeBairro = bairroEncontrado?.nome || capitalize(bairroSlug);
  const cidadeCanonical = slugify(cidade.nome);
  const ufCanonical = cidade.estado.toLowerCase();
  const seo = await getSeoCidade(cidade, nomeBairro);
  seo.link_canonico = `https://www.temcar.com.br/cidade/${bairroSlug}/${cidadeCanonical}/${ufCanonical}`;
  const breadcrumbs = [
    { name: 'Home', url: 'https://www.temcar.com.br/' },
    { name: 'Cidades', url: 'https://www.temcar.com.br/buscar-cidades' },
    { name: cidade.nome, url: `https://www.temcar.com.br/cidade/${cidadeCanonical}/${ufCanonical}` },
    { name: nomeBairro, url: `https://www.temcar.com.br/cidade/${bairroSlug}/${cidadeCanonical}/${ufCanonical}` }
  ];

  res.render("cidade", {
    cidade,
    seo,
    breadcrumbs,
    filtro: {
      bairro: bairroSlug,
      bairroNome: nomeBairro,
      cidade: cidadeCanonical,
      cidadeNome: cidade.nome,
      uf: ufCanonical,
      ufNome: cidade.estado.toUpperCase()
    }
  });
});

// ── /veiculos/:estado/:cidade/:bairro ──
router.get("/veiculos/:estado/:cidade/:bairro", async (req, res) => {
  const { estado, cidade, bairro } = req.params;
  const nomeBairro  = capitalize(bairro);
  const nomeCidade  = capitalize(cidade);
  const ufUpper     = estado.toUpperCase();

  const seo = await getSeoCidade({ nome: nomeCidade, estado: ufUpper }, nomeBairro);
  const breadcrumbs = [
    { name: 'Home', url: 'https://www.temcar.com.br/' },
    { name: 'Cidades', url: 'https://www.temcar.com.br/buscar-cidades' },
    { name: `${nomeCidade} - ${ufUpper}`, url: `https://www.temcar.com.br/cidade/${cidade}/${estado}` },
    { name: nomeBairro, url: `https://www.temcar.com.br/veiculos/${estado}/${cidade}/${bairro}` }
  ];
  res.render("cidade", {
    cidade: { nome: nomeBairro, estado: ufUpper, imagem: null },
    seo,
    breadcrumbs,
    filtro: {
      bairro,
      bairroNome: nomeBairro,
      cidade,
      cidadeNome: nomeCidade,
      uf: estado,
      ufNome: ufUpper
    }
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
    seo,
    breadcrumbs,
    filtro: {
      cidade,
      cidadeNome: nomeCidade,
      uf: estado,
      ufNome: ufUpper,
      bairro: '',
      bairroNome: ''
    }
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
    seo,
    breadcrumbs,
    filtro: { uf: estado, ufNome: ufUpper, bairro: '', bairroNome: '' }
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
    const [[duplicidade]] = await db.query(
      `SELECT COUNT(*) AS total FROM cidades WHERE nome = ?`,
      [cidade.nome]
    );

    const params = [cidade.id, cidade.nome, cidade.estado];
    let whereLegado = 'cidade = ? AND estado = ?';

    if (Number(duplicidade.total) <= 1) {
      whereLegado = '(cidade = ? AND (estado = ? OR estado IS NULL))';
    }

    const [banners] = await db.query(
      `
      SELECT id, imagem, imagem_mobile, link
      FROM regioes_imagens
      WHERE cidade_id = ?
         OR (cidade_id IS NULL AND ${whereLegado})
      ORDER BY id ASC
      `,
      params
    );
    const imagens = banners.map(b => ({
      id: b.id,
      imagem: obterUrlUpload(b.imagem),
      imagem_mobile: obterUrlUpload(b.imagem_mobile),
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
