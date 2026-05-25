const express = require('express');
const router = express.Router();
const db = require('../../database/pool_connection');
const { getSeo } = require('../../helpers/seo');
const SITE_URL = (process.env.SITE_URL || 'https://www.temcar.com.br').replace(/\/$/, '');

function slugify(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function capitalize(texto) {
  return (texto || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

async function buscarCidadePorSlugUf(cidadeSlug, ufSlug) {
  const [cidades] = await db.query('SELECT nome, estado FROM cidades WHERE LOWER(estado) = ?', [ufSlug]);
  return cidades.find(cidade => slugify(cidade.nome) === cidadeSlug) || null;
}

// =========================================================
// PÁGINAS: /carros e /motos (com variações de cidade/bairro)
// =========================================================

const tiposValidos = { carros: 'Carro', motos: 'Moto' };

// /carros ou /motos (geral)
router.get('/:tipo(carros|motos)', async (req, res) => {
  const tipoSlug = req.params.tipo;
  const seo = await getSeo(tipoSlug);
  const breadcrumbs = [
    { name: 'Home', url: 'https://www.temcar.com.br/' },
    { name: capitalize(tipoSlug), url: `https://www.temcar.com.br/${tipoSlug}` }
  ];
  res.render('veiculos', { seo, breadcrumbs, filtro: { tipo: tipoSlug } });
});

// /carros/:cidade/:uf ou /motos/:cidade/:uf
router.get('/:tipo(carros|motos)/:cidade/:uf', async (req, res) => {
  const { tipo, cidade, uf } = req.params;
  res.set('X-Temcar-Route', 'veiculos-cidade');
  const cidadeSlug = slugify(cidade);
  const ufSlug = slugify(uf);
  const cidadeEncontrada = await buscarCidadePorSlugUf(cidadeSlug, ufSlug);
  const nomeCidade = cidadeEncontrada ? cidadeEncontrada.nome : capitalize(cidadeSlug);
  const ufUpper = cidadeEncontrada ? cidadeEncontrada.estado.toUpperCase() : ufSlug.toUpperCase();

  const seo = await getSeo(tipo, {
    cidade: nomeCidade,
    estado: ufUpper,
    veiculo: tiposValidos[tipo],
    tipo: tiposValidos[tipo],
    bairro: ''
  }, {
    link_canonico: `${SITE_URL}/${tipo}/${cidadeSlug}/${ufSlug}`
  });

  const breadcrumbs = [
    { name: 'Home', url: `${SITE_URL}/` },
    { name: capitalize(tipo), url: `${SITE_URL}/${tipo}` },
    { name: `${nomeCidade} - ${ufUpper}`, url: `${SITE_URL}/${tipo}/${cidadeSlug}/${ufSlug}` }
  ];
  res.render('veiculos', { seo, breadcrumbs, filtro: { tipo, cidade: cidadeSlug, uf: ufSlug } });
});

// /carros/:bairro/:cidade/:uf ou /motos/:bairro/:cidade/:uf (Task 11)
router.get('/:tipo(carros|motos)/:bairro/:cidade/:uf', async (req, res) => {
  const { tipo, bairro, cidade, uf } = req.params;
  const bairroSlug = slugify(bairro);
  const cidadeSlug = slugify(cidade);
  const ufSlug = slugify(uf);
  const nomeBairro = capitalize(bairroSlug);
  const nomeCidade = capitalize(cidadeSlug);
  const ufUpper = ufSlug.toUpperCase();

  const seo = await getSeo(tipo, {
    bairro: nomeBairro,
    cidade: nomeCidade,
    estado: ufUpper,
    veiculo: tiposValidos[tipo],
    tipo: tiposValidos[tipo]
  }, {
    link_canonico: `${SITE_URL}/${tipo}/${bairroSlug}/${cidadeSlug}/${ufSlug}`
  });

  const breadcrumbs = [
    { name: 'Home', url: `${SITE_URL}/` },
    { name: capitalize(tipo), url: `${SITE_URL}/${tipo}` },
    { name: `${nomeCidade} - ${ufUpper}`, url: `${SITE_URL}/${tipo}/${cidadeSlug}/${ufSlug}` },
    { name: nomeBairro, url: `${SITE_URL}/${tipo}/${bairroSlug}/${cidadeSlug}/${ufSlug}` }
  ];
  res.render('veiculos', { seo, breadcrumbs, filtro: { tipo, bairro: bairroSlug, cidade: cidadeSlug, uf: ufSlug } });
});

// =========================================================
// PÁGINAS: /comprar e /vender (landing pages SEO)
// =========================================================

router.get('/comprar', async (req, res) => {
  const seo = await getSeo('comprar');
  const breadcrumbs = [
    { name: 'Home', url: 'https://www.temcar.com.br/' },
    { name: 'Comprar', url: 'https://www.temcar.com.br/comprar' }
  ];
  res.render('comprar', { seo, breadcrumbs });
});

router.get('/vender', async (req, res) => {
  const seo = await getSeo('vender');
  const breadcrumbs = [
    { name: 'Home', url: 'https://www.temcar.com.br/' },
    { name: 'Vender', url: 'https://www.temcar.com.br/vender' }
  ];
  res.render('vender', { seo, breadcrumbs });
});

// =========================================================
// API: /api/veiculos?tipo=Carro&cidade=mesquita&uf=rj&bairro=centro
// =========================================================

router.get('/api/veiculos', async (req, res) => {
  try {
    const { tipo, cidade, uf, bairro, marca, carroceria, busca } = req.query;

    let where = "a.status = 'ativo'";
    const params = [];

    if (tipo) {
      where += ' AND a.tipo = ?';
      params.push(tipo);
    }

    if (cidade) {
      const cidadeNorm = `%${cidade.replace(/-/g, ' ')}%`;
      if (uf) {
        where += ` AND (
          (LOWER(u.cidade) LIKE ? AND LOWER(u.estado) = ?)
          OR EXISTS (
            SELECT 1 FROM anuncios_cidades ac
            WHERE ac.anuncio_id = a.id
            AND LOWER(ac.cidade) LIKE ?
            AND LOWER(ac.estado) = ?
          )
        )`;
        params.push(cidadeNorm, uf.toLowerCase(), cidadeNorm, uf.toLowerCase());
      } else {
        where += ` AND (
          LOWER(u.cidade) LIKE ?
          OR EXISTS (
            SELECT 1 FROM anuncios_cidades ac
            WHERE ac.anuncio_id = a.id AND LOWER(ac.cidade) LIKE ?
          )
        )`;
        params.push(cidadeNorm, cidadeNorm);
      }
    } else if (uf) {
      where += ` AND (
        LOWER(u.estado) = ?
        OR EXISTS (
          SELECT 1 FROM anuncios_cidades ac
          WHERE ac.anuncio_id = a.id AND LOWER(ac.estado) = ?
        )
      )`;
      params.push(uf.toLowerCase(), uf.toLowerCase());
    }

    if (bairro) {
      where += ' AND LOWER(u.bairro) LIKE ?';
      params.push(`%${bairro.replace(/-/g, ' ')}%`);
    }

    if (marca) {
      where += ' AND LOWER(a.marca) = ?';
      params.push(marca.toLowerCase());
    }

    if (carroceria) {
      where += ' AND LOWER(a.carroceria) = ?';
      params.push(carroceria.toLowerCase());
    }

    if (busca) {
      const termo = `%${busca.toLowerCase().replace(/-/g, ' ')}%`;
      where += ` AND (
        LOWER(a.marca) LIKE ?
        OR LOWER(a.versao) LIKE ?
        OR LOWER(a.descricao) LIKE ?
      )`;
      params.push(termo, termo, termo);
    }

    const [anuncios] = await db.query(`
      SELECT
        a.id,
        a.tipo AS tipo_carro,
        a.marca,
        a.versao,
        a.descricao,
        a.preco,
        a.ano_fabricacao,
        a.ano_modelo,
        a.km,
        a.cambio,
        a.motorizacao,
        a.combustivel,
        a.carroceria,
        a.cor,
        a.condicao,
        a.acessorios,
        a.destaque,
        u.nome,
        u.cidade,
        u.estado,
        u.bairro,
        u.tipo AS tipo_anunciante,
        img.imagem
      FROM anuncios a
      INNER JOIN usuarios u ON u.id = a.usuario_id
      LEFT JOIN anuncios_imagens img
        ON img.anuncio_id = a.id AND img.principal = true
      WHERE ${where}
      ORDER BY a.destaque DESC, a.criado_em DESC
      LIMIT 500
    `, params);

    res.json(anuncios);
  } catch (error) {
    console.error('Erro ao buscar veículos:', error);
    res.status(500).json({ message: 'Erro interno' });
  }
});

// =========================================================
// API: /api/banners (públicO - lista banners ativos)
// =========================================================

router.get('/api/banners', async (req, res) => {
  try {
    const [banners] = await db.query(`
      SELECT id, titulo, imagem, link
      FROM banners
      WHERE ativo = true
      ORDER BY ordem ASC, id DESC
    `);
    res.json(banners);
  } catch (error) {
    console.error('Erro ao buscar banners:', error);
    res.status(500).json({ message: 'Erro interno' });
  }
});

module.exports = router;
