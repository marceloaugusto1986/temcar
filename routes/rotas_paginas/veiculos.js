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

async function garantirTabelaCidadesRevendas() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS revendas_cidades (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL,
      cidade VARCHAR(150) NOT NULL,
      estado VARCHAR(2) NOT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_revenda_cidade (usuario_id, cidade, estado),
      CONSTRAINT fk_revenda_cidade_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
    )
  `);
}

// =========================================================
// PÁGINAS: /carros, /motos e /utilitarios (com variações de cidade/bairro)
// =========================================================

const tiposValidos = { carros: 'Carro', motos: 'Moto', utilitarios: 'Utilitário' };
const tipoSingular = { carros: 'carro', motos: 'moto', utilitarios: 'utilitário' };
const tipoPlural = { carros: 'carros', motos: 'motos', utilitarios: 'utilitários' };
const tipoPluralTitulo = { carros: 'Carros', motos: 'Motos', utilitarios: 'Utilitários' };

const seoBrasilPorTipo = {
  carros: {
    titulo: 'Carros a venda no Brasil | TEMCAR',
    descricao: 'Encontre carros a venda no Brasil no TEMCAR. Compare ofertas de carros novos, seminovos e usados anunciados por revendas e particulares.',
    keywords: 'carros a venda no Brasil, comprar carro, carros usados, carros seminovos',
    texto_h1: 'Carros a venda no Brasil',
    link_canonico: `${SITE_URL}/carros`
  },
  motos: {
    titulo: 'Motos a venda no Brasil | TEMCAR',
    descricao: 'Encontre motos a venda no Brasil no TEMCAR. Veja ofertas de motos novas, seminovas e usadas anunciadas por revendas e particulares.',
    keywords: 'motos a venda no Brasil, comprar moto, motos usadas, motos seminovas',
    texto_h1: 'Motos a venda no Brasil',
    link_canonico: `${SITE_URL}/motos`
  },
  utilitarios: {
    titulo: 'Utilitários a venda no Brasil | TEMCAR',
    descricao: 'Encontre utilitários a venda no Brasil no TEMCAR. Compare ofertas de utilitários novos, seminovos e usados anunciados por revendas e particulares.',
    keywords: 'utilitários a venda no Brasil, comprar utilitário, utilitários usados, utilitários seminovos',
    texto_h1: 'Utilitários a venda no Brasil',
    link_canonico: `${SITE_URL}/utilitarios`
  }
};

async function getSeoBrasil(tipoSlug) {
  const seo = await getSeo(tipoSlug);
  return {
    ...seo,
    ...seoBrasilPorTipo[tipoSlug]
  };
}

function montarSeoLocalPorTipo(tipo, { cidade, uf, bairro = '', canonical }) {
  const plural = tipoPlural[tipo] || 'veículos';
  const pluralTitulo = tipoPluralTitulo[tipo] || 'Veículos';
  const singular = tipoSingular[tipo] || 'veículo';
  const local = bairro ? `${bairro}, ${cidade} - ${uf}` : `${cidade} - ${uf}`;
  const localDescricao = bairro ? `no bairro ${bairro}, em ${cidade} - ${uf}` : `em ${cidade} - ${uf}`;

  return {
    titulo: `${pluralTitulo} à venda em ${local} | TEMCAR`,
    descricao: `Encontre ${plural} à venda ${localDescricao}. Compare ofertas de ${singular}s novos, seminovos e usados anunciados por revendas e particulares.`,
    keywords: bairro
      ? `${plural} em ${bairro}, ${singular} em ${bairro}, ${plural} em ${cidade}, comprar ${singular} ${cidade}`
      : `${plural} em ${cidade}, comprar ${singular} ${cidade}, ${plural} usados ${uf}, ${plural} seminovos`,
    texto_h1: `${pluralTitulo} à venda em ${local}`,
    link_canonico: canonical
  };
}

// /carros, /motos ou /utilitarios (geral)
router.get('/:tipo(carros|motos|utilitarios)', async (req, res) => {
  const tipoSlug = req.params.tipo;
  const seo = await getSeoBrasil(tipoSlug);
  const breadcrumbs = [
    { name: 'Home', url: 'https://www.temcar.com.br/' },
    { name: capitalize(tipoSlug), url: `https://www.temcar.com.br/${tipoSlug}` }
  ];
  res.render('veiculos', { seo, breadcrumbs, filtro: { tipo: tipoSlug } });
});

// /carros/:cidade/:uf, /motos/:cidade/:uf ou /utilitarios/:cidade/:uf
router.get('/:tipo(carros|motos|utilitarios)/:cidade/:uf', async (req, res) => {
  const { tipo, cidade, uf } = req.params;
  res.set('X-Temcar-Route', 'veiculos-cidade');
  const cidadeSlug = slugify(cidade);
  const ufSlug = slugify(uf);
  const cidadeEncontrada = await buscarCidadePorSlugUf(cidadeSlug, ufSlug);
  if (!cidadeEncontrada) {
    const seo = await getSeoBrasil(tipo);
    const breadcrumbs = [
      { name: 'Home', url: `${SITE_URL}/` },
      { name: capitalize(tipo), url: `${SITE_URL}/${tipo}` }
    ];
    return res.render('veiculos', { seo, breadcrumbs, filtro: { tipo } });
  }

  const nomeCidade = cidadeEncontrada ? cidadeEncontrada.nome : capitalize(cidadeSlug);
  const ufUpper = cidadeEncontrada ? cidadeEncontrada.estado.toUpperCase() : ufSlug.toUpperCase();

  const canonical = `${SITE_URL}/${tipo}/${cidadeSlug}/${ufSlug}`;
  const seo = await getSeo(tipo, {
    cidade: nomeCidade,
    estado: ufUpper,
    veiculo: tiposValidos[tipo],
    tipo: tiposValidos[tipo],
    bairro: ''
  }, montarSeoLocalPorTipo(tipo, {
    cidade: nomeCidade,
    uf: ufUpper,
    canonical
  }));

  const breadcrumbs = [
    { name: 'Home', url: `${SITE_URL}/` },
    { name: capitalize(tipo), url: `${SITE_URL}/${tipo}` },
    { name: `${nomeCidade} - ${ufUpper}`, url: `${SITE_URL}/${tipo}/${cidadeSlug}/${ufSlug}` }
  ];
  res.render('veiculos', {
    seo,
    breadcrumbs,
    filtro: { tipo, cidade: cidadeSlug, cidadeNome: nomeCidade, uf: ufSlug, ufNome: ufUpper }
  });
});

// /carros/:bairro/:cidade/:uf, /motos/:bairro/:cidade/:uf ou /utilitarios/:bairro/:cidade/:uf (Task 11)
router.get('/:tipo(carros|motos|utilitarios)/:bairro/:cidade/:uf', async (req, res) => {
  const { tipo, bairro, cidade, uf } = req.params;
  const bairroSlug = slugify(bairro);
  const cidadeSlug = slugify(cidade);
  const ufSlug = slugify(uf);
  const cidadeEncontrada = await buscarCidadePorSlugUf(cidadeSlug, ufSlug);
  const nomeBairro = capitalize(bairroSlug);
  const nomeCidade = cidadeEncontrada ? cidadeEncontrada.nome : capitalize(cidadeSlug);
  const ufUpper = cidadeEncontrada ? cidadeEncontrada.estado.toUpperCase() : ufSlug.toUpperCase();

  const canonical = `${SITE_URL}/${tipo}/${bairroSlug}/${cidadeSlug}/${ufSlug}`;
  const seo = await getSeo(tipo, {
    bairro: nomeBairro,
    cidade: nomeCidade,
    estado: ufUpper,
    veiculo: tiposValidos[tipo],
    tipo: tiposValidos[tipo]
  }, montarSeoLocalPorTipo(tipo, {
    cidade: nomeCidade,
    uf: ufUpper,
    bairro: nomeBairro,
    canonical
  }));

  const breadcrumbs = [
    { name: 'Home', url: `${SITE_URL}/` },
    { name: capitalize(tipo), url: `${SITE_URL}/${tipo}` },
    { name: `${nomeCidade} - ${ufUpper}`, url: `${SITE_URL}/${tipo}/${cidadeSlug}/${ufSlug}` },
    { name: nomeBairro, url: `${SITE_URL}/${tipo}/${bairroSlug}/${cidadeSlug}/${ufSlug}` }
  ];
  res.render('veiculos', {
    seo,
    breadcrumbs,
    filtro: {
      tipo,
      bairro: bairroSlug,
      bairroNome: nomeBairro,
      cidade: cidadeSlug,
      cidadeNome: nomeCidade,
      uf: ufSlug,
      ufNome: ufUpper
    }
  });
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
    await garantirTabelaCidadesRevendas();

    const { tipo, cidade, uf, bairro, marca, carroceria, busca } = req.query;

    let where = "a.status = 'ativo' AND (a.publicado_ate IS NULL OR a.publicado_ate >= NOW())";
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
          OR EXISTS (
            SELECT 1 FROM revendas_cidades rc
            WHERE rc.usuario_id = u.id
            AND LOWER(rc.cidade) LIKE ?
            AND LOWER(rc.estado) = ?
          )
        )`;
        params.push(cidadeNorm, uf.toLowerCase(), cidadeNorm, uf.toLowerCase(), cidadeNorm, uf.toLowerCase());
      } else {
        where += ` AND (
          LOWER(u.cidade) LIKE ?
          OR EXISTS (
            SELECT 1 FROM anuncios_cidades ac
            WHERE ac.anuncio_id = a.id AND LOWER(ac.cidade) LIKE ?
          )
          OR EXISTS (
            SELECT 1 FROM revendas_cidades rc
            WHERE rc.usuario_id = u.id AND LOWER(rc.cidade) LIKE ?
          )
        )`;
        params.push(cidadeNorm, cidadeNorm, cidadeNorm);
      }
    } else if (uf) {
      where += ` AND (
        LOWER(u.estado) = ?
        OR EXISTS (
          SELECT 1 FROM anuncios_cidades ac
          WHERE ac.anuncio_id = a.id AND LOWER(ac.estado) = ?
        )
        OR EXISTS (
          SELECT 1 FROM revendas_cidades rc
          WHERE rc.usuario_id = u.id AND LOWER(rc.estado) = ?
        )
      )`;
      params.push(uf.toLowerCase(), uf.toLowerCase(), uf.toLowerCase());
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
