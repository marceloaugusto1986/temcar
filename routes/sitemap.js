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

router.get('/sitemap.xml', async (req, res) => {
  try {
    const base = SITE_URL;
    const hoje = new Date().toISOString().split('T')[0];

    // Páginas estáticas
    const paginasEstaticas = [
      { loc: '/', priority: '1.0', changefreq: 'daily', lastmod: hoje },
      { loc: '/quem-somos', priority: '0.5', changefreq: 'monthly', lastmod: hoje },
      { loc: '/fale-conosco', priority: '0.5', changefreq: 'monthly', lastmod: hoje },
      { loc: '/politica-de-privacidade', priority: '0.3', changefreq: 'yearly', lastmod: hoje },
      { loc: '/termos-de-uso', priority: '0.3', changefreq: 'yearly', lastmod: hoje },
      { loc: '/regras-gerais', priority: '0.3', changefreq: 'yearly', lastmod: hoje },
      { loc: '/buscar-revendas', priority: '0.7', changefreq: 'daily', lastmod: hoje },
      { loc: '/buscar-cidades', priority: '0.7', changefreq: 'daily', lastmod: hoje },
      { loc: '/planos-particular', priority: '0.5', changefreq: 'monthly', lastmod: hoje },
      { loc: '/planos-revenda', priority: '0.5', changefreq: 'monthly', lastmod: hoje },
      { loc: '/carros', priority: '0.8', changefreq: 'daily', lastmod: hoje },
      { loc: '/motos', priority: '0.8', changefreq: 'daily', lastmod: hoje },
      { loc: '/utilitarios', priority: '0.8', changefreq: 'daily', lastmod: hoje },
      { loc: '/comprar', priority: '0.7', changefreq: 'daily', lastmod: hoje },
      { loc: '/tabela-fipe', priority: '0.7', changefreq: 'monthly', lastmod: hoje },
      { loc: '/vender', priority: '0.7', changefreq: 'monthly', lastmod: hoje },
    ];

    // Cidades dinâmicas (cidade + veículos por cidade)
    let cidadesUrls = [];
    try {
      const [cidades] = await db.query(`SELECT nome, estado FROM cidades`);
      cidades.forEach(c => {
        const slug = slugify(c.nome);
        const uf = slugify(c.estado);
        cidadesUrls.push({ loc: `/cidade/${slug}/${uf}`, priority: '0.6', changefreq: 'daily', lastmod: hoje });
        cidadesUrls.push({ loc: `/carros/${slug}/${uf}`, priority: '0.6', changefreq: 'daily', lastmod: hoje });
        cidadesUrls.push({ loc: `/motos/${slug}/${uf}`, priority: '0.5', changefreq: 'daily', lastmod: hoje });
        cidadesUrls.push({ loc: `/utilitarios/${slug}/${uf}`, priority: '0.5', changefreq: 'daily', lastmod: hoje });
        cidadesUrls.push({ loc: `/particular/${slug}/${uf}`, priority: '0.5', changefreq: 'daily', lastmod: hoje });
        cidadesUrls.push({ loc: `/buscar-revendas/${slug}/${uf}`, priority: '0.5', changefreq: 'daily', lastmod: hoje });
      });
    } catch (e) {
      console.error('Sitemap: erro ao buscar cidades', e);
    }

    // Bairros dinâmicos para anúncios de particulares
    let bairrosUrls = [];
    try {
      const [bairros] = await db.query(`SELECT nome, cidade, estado FROM bairros`);
      bairrosUrls = bairros
        .filter(b => b.nome && b.cidade && b.estado)
        .flatMap(b => {
          const bairro = slugify(b.nome);
          const cidade = slugify(b.cidade);
          const estado = slugify(b.estado);

          return [
            {
              loc: `/particular/${bairro}/${cidade}/${estado}`,
              priority: '0.5',
              changefreq: 'daily',
              lastmod: hoje
            },
            {
              loc: `/buscar-revendas/${bairro}/${cidade}/${estado}`,
              priority: '0.5',
              changefreq: 'daily',
              lastmod: hoje
            }
          ];
        });
    } catch (e) {
      console.error('Sitemap: erro ao buscar bairros', e);
    }

    // Revendas dinâmicas
    let revendasUrls = [];
    try {
      const [revendas] = await db.query(`SELECT id, nome, bairro, cidade, estado FROM usuarios WHERE tipo = 'revenda'`);
      revendasUrls = revendas.map(r => ({
        loc: montarCaminhoRevenda(r),
        priority: '0.6',
        changefreq: 'weekly',
        lastmod: hoje
      }));
    } catch (e) {
      console.error('Sitemap: erro ao buscar revendas', e);
    }

    // Anúncios ativos com data de atualização
    let anunciosUrls = [];
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
      anunciosUrls = anuncios.map(a => ({
        loc: montarCaminhoVenda(a),
        priority: '0.8',
        changefreq: 'weekly',
        lastmod: a.data_mod ? new Date(a.data_mod).toISOString().split('T')[0] : hoje
      }));
    } catch (e) {
      console.error('Sitemap: erro ao buscar anúncios', e);
    }

    const todas = [...paginasEstaticas, ...cidadesUrls, ...bairrosUrls, ...revendasUrls, ...anunciosUrls];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const p of todas) {
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(base + p.loc)}</loc>\n`;
      if (p.lastmod) xml += `    <lastmod>${escapeXml(p.lastmod)}</lastmod>\n`;
      xml += `    <changefreq>${p.changefreq}</changefreq>\n`;
      xml += `    <priority>${p.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (error) {
    console.error('Erro ao gerar sitemap:', error);
    res.status(500).send('Erro ao gerar sitemap');
  }
});

module.exports = router;
