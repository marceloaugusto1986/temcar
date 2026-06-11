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
  const minusculas = new Set(['da', 'de', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'no', 'na']);
  return (texto || '')
    .replace(/-/g, ' ')
    .split(' ')
    .map((word, i) => {
      if (!word) return word;
      const lower = word.toLowerCase();
      return (i === 0 || !minusculas.has(lower))
        ? lower.charAt(0).toUpperCase() + lower.slice(1)
        : lower;
    })
    .join(' ');
}

async function buscarCidadePorSlugUf(cidadeSlug, ufSlug) {
  const [cidades] = await db.query('SELECT nome, estado FROM cidades WHERE LOWER(estado) = ?', [ufSlug]);
  return cidades.find(cidade => slugify(cidade.nome) === cidadeSlug) || null;
}

async function buscarBairroPorSlugCidadeUf(bairroSlug, cidade, uf) {
  let bairros = [];
  try {
    [bairros] = await db.query(
      `SELECT nome FROM bairros
       WHERE cidade COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci
         AND LOWER(estado) = ?`,
      [cidade.nome, uf.toLowerCase()]
    );
  } catch (error) {
    if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
  }

  const doBairros = bairros.find(b => slugify(b.nome) === bairroSlug);
  if (doBairros) return doBairros;

  try {
    const [usuarios] = await db.query(
      `SELECT DISTINCT bairro AS nome FROM usuarios
       WHERE cidade COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci
         AND LOWER(estado) = ?
         AND bairro IS NOT NULL AND bairro != ''`,
      [cidade.nome, uf.toLowerCase()]
    );
    return usuarios.find(u => slugify(u.nome) === bairroSlug) || null;
  } catch {
    return null;
  }
}

async function garantirTabelaCidadesRevendas() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS revendas_cidades (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL,
      bairro VARCHAR(150) NOT NULL DEFAULT '',
      cidade VARCHAR(150) NOT NULL,
      estado VARCHAR(2) NOT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_revenda_cidade (usuario_id, bairro, cidade, estado),
      KEY idx_revendas_cidades_usuario (usuario_id),
      CONSTRAINT fk_revenda_cidade_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
    )
  `);

  const [colunas] = await db.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'revendas_cidades'
      AND COLUMN_NAME = 'bairro'
  `);

  if (!colunas.length) {
    await db.query(`
      ALTER TABLE revendas_cidades
      ADD COLUMN bairro VARCHAR(150) NOT NULL DEFAULT '' AFTER usuario_id
    `);
  }

  const [indices] = await db.query(`
    SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS colunas
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'revendas_cidades'
      AND INDEX_NAME = 'uniq_revenda_cidade'
    GROUP BY INDEX_NAME
  `);

  if (indices[0]?.colunas !== 'usuario_id,bairro,cidade,estado') {
    await db.query(`
      ALTER TABLE revendas_cidades
      ADD INDEX idx_revendas_cidades_usuario (usuario_id)
    `).catch(error => {
      if (error.code !== 'ER_DUP_KEYNAME') throw error;
    });

    if (indices.length) {
      await db.query('ALTER TABLE revendas_cidades DROP INDEX uniq_revenda_cidade');
    }
    await db.query(`
      ALTER TABLE revendas_cidades
      ADD UNIQUE KEY uniq_revenda_cidade (usuario_id, bairro, cidade, estado)
    `);
  }
}

// =========================================================
// PÁGINAS: /carros, /motos e /utilitarios (com variações de cidade/bairro)
// =========================================================

const tiposValidos = { carros: 'Carro', motos: 'Moto', utilitarios: 'Utilitário' };
const tipoSingular = { carros: 'carro', motos: 'moto', utilitarios: 'utilitário' };
const tipoPlural = { carros: 'carros', motos: 'motos', utilitarios: 'utilitários' };
const tipoPluralTitulo = { carros: 'Carros', motos: 'Motos', utilitarios: 'Utilitários' };

function obterTiposConsulta(tipo) {
  const tipoNormalizado = slugify(tipo);
  const tiposPorSlug = {
    carro: ['Carro'],
    carros: ['Carro'],
    moto: ['Moto'],
    motos: ['Moto'],
    utilitario: ['Utilitário', 'Utilitario'],
    utilitarios: ['Utilitário', 'Utilitario']
  };

  return tiposPorSlug[tipoNormalizado] || (tipo ? [tipo] : []);
}

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

function montarSeoBuscaVeiculos({ tipo, marca = '', carroceria = '', bairro = '', cidade = '', uf = '', canonical }) {
  const plural = tipoPlural[tipo] || 'veículos';
  const pluralTitulo = tipoPluralTitulo[tipo] || 'Veículos';
  const singular = tipoSingular[tipo] || 'veículo';
  const marcaFormatada = capitalize(String(marca || '').replace(/-/g, ' ').trim());
  const carroceriaFormatada = capitalize(String(carroceria || '').replace(/-/g, ' ').trim());
  const termoFormatado = [marcaFormatada, carroceriaFormatada].filter(Boolean).join(' ');
  const termoKeywords = termoFormatado || plural;
  const local = bairro
    ? `${bairro}, ${cidade} - ${uf}`
    : cidade
      ? `${cidade} - ${uf}`
      : uf
        ? uf
        : 'Brasil';
  const complementoTitulo = local === 'Brasil' ? 'no Brasil' : `em ${local}`;
  const complementoDescricao = local === 'Brasil' ? 'no Brasil' : `em ${local}`;
  const canonicalBase = canonical || `${SITE_URL}/${tipo}`;
  const params = new URLSearchParams();

  if (marcaFormatada) params.set('marca', marcaFormatada);
  if (carroceriaFormatada) params.set('carroceria', carroceriaFormatada);

  return {
    titulo: `${pluralTitulo} ${termoFormatado} à venda ${complementoTitulo} | TEMCAR`,
    descricao: `Encontre ${plural} ${termoFormatado} à venda ${complementoDescricao}. Compare ofertas de ${singular}s novos, seminovos e usados anunciados por revendas e particulares no TEMCAR.`,
    keywords: `${plural} ${termoKeywords}, ${singular} ${termoKeywords} à venda, comprar ${termoKeywords}, ${termoKeywords} usado, ${termoKeywords} seminovo, ${local}`,
    texto_h1: `${pluralTitulo} ${termoFormatado} à venda ${complementoTitulo}`,
    link_canonico: `${canonicalBase}?${params.toString()}`
  };
}

function obterFiltroSeoQuery(query) {
  const marca = query.marca || query.marcas || '';
  const carroceria = query.carroceria || '';

  return {
    marca,
    carroceria,
    ativo: Boolean(marca || carroceria)
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
  const filtroSeo = obterFiltroSeoQuery(req.query);
  const uf = req.query.uf || req.query.estado;
  const seo = filtroSeo.ativo
    ? montarSeoBuscaVeiculos({
      tipo: tipoSlug,
      marca: filtroSeo.marca,
      carroceria: filtroSeo.carroceria,
      uf: uf ? String(uf).toUpperCase() : ''
    })
    : await getSeoBrasil(tipoSlug);
  const breadcrumbs = [
    { name: 'Home', url: 'https://www.temcar.com.br/' },
    { name: capitalize(tipoSlug), url: `https://www.temcar.com.br/${tipoSlug}` }
  ];
  res.render('veiculos', { seo, breadcrumbs, filtro: { tipo: tipoSlug } });
});

// /carros/:cidade/:uf, /motos/:cidade/:uf ou /utilitarios/:cidade/:uf
router.get('/:tipo(carros|motos|utilitarios)/:cidade/:uf', async (req, res) => {
  const { tipo, cidade, uf } = req.params;
  const filtroSeo = obterFiltroSeoQuery(req.query);
  res.set('X-Temcar-Route', 'veiculos-cidade');
  const cidadeSlug = slugify(cidade);
  const ufSlug = slugify(uf);
  const cidadeEncontrada = await buscarCidadePorSlugUf(cidadeSlug, ufSlug);
  const nomeCidade = cidadeEncontrada ? cidadeEncontrada.nome : capitalize(cidadeSlug);
  const ufUpper = cidadeEncontrada ? cidadeEncontrada.estado.toUpperCase() : ufSlug.toUpperCase();

  const canonical = `${SITE_URL}/${tipo}/${cidadeSlug}/${ufSlug}`;
  const seo = filtroSeo.ativo
    ? montarSeoBuscaVeiculos({
      tipo,
      marca: filtroSeo.marca,
      carroceria: filtroSeo.carroceria,
      cidade: nomeCidade,
      uf: ufUpper,
      canonical
    })
    : await getSeo(tipo, {
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
  const filtroSeo = obterFiltroSeoQuery(req.query);
  const bairroSlug = slugify(bairro);
  const cidadeSlug = slugify(cidade);
  const ufSlug = slugify(uf);
  const cidadeEncontrada = await buscarCidadePorSlugUf(cidadeSlug, ufSlug);
  const bairroEncontrado = cidadeEncontrada
    ? await buscarBairroPorSlugCidadeUf(bairroSlug, cidadeEncontrada, ufSlug)
    : null;
  const nomeBairro = bairroEncontrado?.nome || capitalize(bairroSlug);
  const nomeCidade = cidadeEncontrada ? cidadeEncontrada.nome : capitalize(cidadeSlug);
  const ufUpper = cidadeEncontrada ? cidadeEncontrada.estado.toUpperCase() : ufSlug.toUpperCase();

  const canonical = `${SITE_URL}/${tipo}/${bairroSlug}/${cidadeSlug}/${ufSlug}`;
  const seo = filtroSeo.ativo
    ? montarSeoBuscaVeiculos({
      tipo,
      marca: filtroSeo.marca,
      carroceria: filtroSeo.carroceria,
      bairro: nomeBairro,
      cidade: nomeCidade,
      uf: ufUpper,
      canonical
    })
    : await getSeo(tipo, {
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

    const tiposConsulta = obterTiposConsulta(tipo);
    if (tiposConsulta.length) {
      where += ` AND LOWER(a.tipo) IN (${tiposConsulta.map(() => 'LOWER(?)').join(', ')})`;
      params.push(...tiposConsulta);
    }

    if (cidade) {
      const cidadeNorm = `%${cidade.toLowerCase().replace(/-/g, ' ')}%`;
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
      const bairroNorm = `%${bairro.toLowerCase().replace(/-/g, ' ')}%`;
      where += ` AND (
        LOWER(u.bairro) LIKE ?
        OR EXISTS (
          SELECT 1 FROM revendas_cidades rc
          WHERE rc.usuario_id = u.id
          AND LOWER(rc.bairro) LIKE ?
        )
      )`;
      params.push(bairroNorm, bairroNorm);
    }

    if (marca) {
      const marcaNorm = marca.toLowerCase().replace(/-/g, ' ');
      where += ' AND (LOWER(a.marca) = ? OR LOWER(a.versao) LIKE ?)';
      params.push(marcaNorm, `%${marcaNorm}%`);
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
        a.portas,
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
