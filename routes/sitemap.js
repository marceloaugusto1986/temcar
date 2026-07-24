const express = require('express');
const router = express.Router();
const db = require('../database/pool_connection');
const { montarCaminhoVenda } = require('../helpers/anuncio-url');
const { montarCaminhoRevenda } = require('../helpers/revenda-url');
const SITE_URL = (process.env.SITE_URL || 'https://www.temcar.com.br').replace(/\/$/, '');

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugify(value) {
  return (value || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function hoje() {
  return new Date().toISOString().split('T')[0];
}

/* =========================================================
   CARREGADORES DE DADOS
   Cada um falha em silêncio devolvendo lista vazia, para um
   erro pontual não derrubar o sitemap inteiro.
========================================================= */

async function carregarCidades() {
  try {
    const [cidades] = await db.query(`SELECT nome, estado FROM cidades`);
    return cidades.filter(c => c.nome && c.estado);
  } catch (e) {
    console.error('Sitemap: erro ao buscar cidades', e);
    return [];
  }
}

async function carregarEstados() {
  try {
    const [estados] = await db.query(
      `SELECT DISTINCT estado FROM cidades WHERE estado IS NOT NULL AND estado <> ''`
    );
    return estados.map(e => slugify(e.estado)).filter(Boolean);
  } catch (e) {
    console.error('Sitemap: erro ao buscar estados', e);
    return [];
  }
}

async function carregarBairros() {
  try {
    const [bairros] = await db.query(`SELECT nome, cidade, estado FROM bairros`);
    return bairros.filter(b => b.nome && b.cidade && b.estado);
  } catch (e) {
    console.error('Sitemap: erro ao buscar bairros', e);
    return [];
  }
}

async function carregarRevendas() {
  try {
    const [revendas] = await db.query(
      `SELECT id, nome, bairro, cidade, estado FROM usuarios WHERE tipo = 'revenda'`
    );
    return revendas;
  } catch (e) {
    console.error('Sitemap: erro ao buscar revendas', e);
    return [];
  }
}

async function carregarAnuncios() {
  try {
    const [anuncios] = await db.query(`
      SELECT
        a.id,
        a.marca,
        a.versao,
        a.criado_em AS data_mod,
        u.cidade,
        u.estado
      FROM anuncios a
      INNER JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.status = 'ativo'
        AND (a.publicado_ate IS NULL OR a.publicado_ate >= NOW())
      ORDER BY a.criado_em DESC
      LIMIT 5000
    `);
    return anuncios;
  } catch (e) {
    console.error('Sitemap: erro ao buscar anúncios', e);
    return [];
  }
}

/* =========================================================
   CATEGORIAS
   Cada categoria monta a própria lista de URLs. O conjunto
   somado é o mesmo que existia no sitemap único.
========================================================= */

// Monta as URLs de um tipo de veículo: raiz, estados, cidades e bairros.
function construtorPorTipo(tipo, prioridadeCidade) {
  return async () => {
    const data = hoje();
    const [estados, cidades, bairros] = await Promise.all([
      carregarEstados(),
      carregarCidades(),
      carregarBairros()
    ]);

    const urls = [
      { loc: `/${tipo}`, priority: '0.8', changefreq: 'daily', lastmod: data }
    ];

    estados.forEach(uf => {
      urls.push({ loc: `/${tipo}/${uf}`, priority: prioridadeCidade, changefreq: 'daily', lastmod: data });
    });

    cidades.forEach(c => {
      urls.push({
        loc: `/${tipo}/${slugify(c.nome)}/${slugify(c.estado)}`,
        priority: prioridadeCidade,
        changefreq: 'daily',
        lastmod: data
      });
    });

    bairros.forEach(b => {
      urls.push({
        loc: `/${tipo}/${slugify(b.nome)}/${slugify(b.cidade)}/${slugify(b.estado)}`,
        priority: '0.5',
        changefreq: 'daily',
        lastmod: data
      });
    });

    return urls;
  };
}

const CATEGORIAS = {
  estaticas: async () => {
    const data = hoje();
    return [
      { loc: '/', priority: '1.0', changefreq: 'daily', lastmod: data },
      { loc: '/quem-somos', priority: '0.5', changefreq: 'monthly', lastmod: data },
      { loc: '/fale-conosco', priority: '0.5', changefreq: 'monthly', lastmod: data },
      { loc: '/politica-de-privacidade', priority: '0.3', changefreq: 'yearly', lastmod: data },
      { loc: '/termos-de-uso', priority: '0.3', changefreq: 'yearly', lastmod: data },
      { loc: '/regras-gerais', priority: '0.3', changefreq: 'yearly', lastmod: data },
      { loc: '/planos-particular', priority: '0.5', changefreq: 'monthly', lastmod: data },
      { loc: '/planos-revenda', priority: '0.5', changefreq: 'monthly', lastmod: data },
      { loc: '/comprar', priority: '0.7', changefreq: 'daily', lastmod: data },
      { loc: '/tabela-fipe', priority: '0.7', changefreq: 'monthly', lastmod: data },
      { loc: '/vender', priority: '0.7', changefreq: 'monthly', lastmod: data }
    ];
  },

  carros: construtorPorTipo('carros', '0.6'),
  motos: construtorPorTipo('motos', '0.5'),
  utilitarios: construtorPorTipo('utilitarios', '0.5'),

  cidades: async () => {
    const data = hoje();
    const cidades = await carregarCidades();

    const urls = [
      { loc: '/buscar-cidades', priority: '0.7', changefreq: 'daily', lastmod: data }
    ];

    cidades.forEach(c => {
      urls.push({
        loc: `/cidade/${slugify(c.nome)}/${slugify(c.estado)}`,
        priority: '0.6',
        changefreq: 'daily',
        lastmod: data
      });
    });

    return urls;
  },

  particular: async () => {
    const data = hoje();
    const [cidades, bairros] = await Promise.all([carregarCidades(), carregarBairros()]);
    const urls = [];

    cidades.forEach(c => {
      urls.push({
        loc: `/particular/${slugify(c.nome)}/${slugify(c.estado)}`,
        priority: '0.5',
        changefreq: 'daily',
        lastmod: data
      });
    });

    bairros.forEach(b => {
      urls.push({
        loc: `/particular/${slugify(b.nome)}/${slugify(b.cidade)}/${slugify(b.estado)}`,
        priority: '0.5',
        changefreq: 'daily',
        lastmod: data
      });
    });

    return urls;
  },

  revendas: async () => {
    const data = hoje();
    const [cidades, bairros, revendas] = await Promise.all([
      carregarCidades(),
      carregarBairros(),
      carregarRevendas()
    ]);

    const urls = [
      { loc: '/buscar-revendas', priority: '0.7', changefreq: 'daily', lastmod: data }
    ];

    cidades.forEach(c => {
      urls.push({
        loc: `/buscar-revendas/${slugify(c.nome)}/${slugify(c.estado)}`,
        priority: '0.5',
        changefreq: 'daily',
        lastmod: data
      });
    });

    bairros.forEach(b => {
      urls.push({
        loc: `/buscar-revendas/${slugify(b.nome)}/${slugify(b.cidade)}/${slugify(b.estado)}`,
        priority: '0.5',
        changefreq: 'daily',
        lastmod: data
      });
    });

    revendas.forEach(r => {
      urls.push({
        loc: montarCaminhoRevenda(r),
        priority: '0.6',
        changefreq: 'weekly',
        lastmod: data
      });
    });

    return urls;
  },

  anuncios: async () => {
    const data = hoje();
    const anuncios = await carregarAnuncios();

    return anuncios.map(a => ({
      loc: montarCaminhoVenda(a),
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: a.data_mod ? new Date(a.data_mod).toISOString().split('T')[0] : data
    }));
  }
};

/* =========================================================
   GERAÇÃO DO XML
========================================================= */

// Remove URLs repetidas mantendo a primeira ocorrência. A tabela `cidades`
// tem municípios duplicados (e nomes que geram o mesmo slug), o que produzia
// entradas repetidas no sitemap.
function semDuplicatas(urls) {
  const vistas = new Set();
  return urls.filter(u => {
    if (vistas.has(u.loc)) return false;
    vistas.add(u.loc);
    return true;
  });
}

function montarUrlset(urls) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const p of semDuplicatas(urls)) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(SITE_URL + p.loc)}</loc>\n`;
    if (p.lastmod) xml += `    <lastmod>${escapeXml(p.lastmod)}</lastmod>\n`;
    xml += `    <changefreq>${p.changefreq}</changefreq>\n`;
    xml += `    <priority>${p.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>`;
  return xml;
}

function montarIndex(categorias) {
  const data = hoje();
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const nome of categorias) {
    xml += `  <sitemap>\n`;
    xml += `    <loc>${escapeXml(`${SITE_URL}/sitemap-${nome}.xml`)}</loc>\n`;
    xml += `    <lastmod>${escapeXml(data)}</lastmod>\n`;
    xml += `  </sitemap>\n`;
  }

  xml += `</sitemapindex>`;
  return xml;
}

function responderXml(res, xml) {
  res.set('Content-Type', 'application/xml');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(xml);
}

/* =========================================================
   ROTAS
========================================================= */

// Índice: /sitemap.xml (é o que o robots.txt aponta)
router.get('/sitemap.xml', (req, res) => {
  try {
    responderXml(res, montarIndex(Object.keys(CATEGORIAS)));
  } catch (error) {
    console.error('Erro ao gerar índice do sitemap:', error);
    res.status(500).send('Erro ao gerar sitemap');
  }
});

// Uma rota por categoria: /sitemap-carros.xml, /sitemap-motos.xml, ...
Object.entries(CATEGORIAS).forEach(([nome, construir]) => {
  router.get(`/sitemap-${nome}.xml`, async (req, res) => {
    try {
      responderXml(res, montarUrlset(await construir()));
    } catch (error) {
      console.error(`Erro ao gerar sitemap de ${nome}:`, error);
      res.status(500).send('Erro ao gerar sitemap');
    }
  });
});

module.exports = router;
