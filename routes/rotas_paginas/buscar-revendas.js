const express = require('express');
const router = express.Router();
const db = require("./../../database/pool_connection");
const { getSeo } = require('../../helpers/seo');
const { montarCaminhoRevenda } = require('../../helpers/revenda-url');
const SITE_URL = (process.env.SITE_URL || 'https://www.temcar.com.br').replace(/\/$/, '');

function slugify(texto) {
  return (texto || '')
    .toString()
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

async function buscarBairroPorSlug(bairroSlug, cidadeSlug, ufSlug) {
  const [bairros] = await db.query(
    'SELECT DISTINCT bairro, cidade FROM revendas_cidades WHERE LOWER(estado) = ?',
    [ufSlug]
  );
  const encontrado = bairros.find(
    item => item.bairro
      && slugify(item.bairro) === bairroSlug
      && slugify(item.cidade) === cidadeSlug
  );
  return encontrado ? encontrado.bairro : null;
}

function montarSeoRevendasLocal({ cidade, uf, bairro = '', canonical }) {
  const local = bairro ? `${bairro}, ${cidade} - ${uf}` : `${cidade} - ${uf}`;
  const localDescricao = bairro ? `no bairro ${bairro}, em ${cidade} - ${uf}` : `em ${cidade} - ${uf}`;

  return {
    titulo: `Revendas de veículos em ${local} | TEMCAR`,
    descricao: `Encontre revendas de veículos ${localDescricao}. Veja lojas com carros, motos e utilitários anunciados no TEMCAR.`,
    keywords: bairro
      ? `revendas em ${bairro}, revendas de veículos em ${bairro}, lojas de carros ${cidade}, ${uf}`
      : `revendas em ${cidade}, revendas de veículos ${cidade}, lojas de carros ${uf}`,
    texto_h1: `Revendas de veículos em ${local}`,
    link_canonico: canonical
  };
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

router.get('/buscar-revendas', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const seo = await getSeo('buscar_revendas');
  const breadcrumbs = [
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Revendas', url: `${SITE_URL}/buscar-revendas` }
  ];
  res.render('buscar-revendas', { seo, breadcrumbs, filtro: {} });
});

router.get('/buscar-revendas/:cidade/:uf', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const cidadeSlug = slugify(req.params.cidade);
  const ufSlug = slugify(req.params.uf);
  const cidadeEncontrada = await buscarCidadePorSlugUf(cidadeSlug, ufSlug);

  if (!cidadeEncontrada) {
    const seo = await getSeo('buscar_revendas');
    return res.render('buscar-revendas', { seo, breadcrumbs: [], filtro: {} });
  }

  const nomeCidade = cidadeEncontrada.nome;
  const ufUpper = cidadeEncontrada.estado.toUpperCase();
  const canonical = `${SITE_URL}/buscar-revendas/${cidadeSlug}/${ufSlug}`;
  const seo = await getSeo('buscar_revendas', {
    cidade: nomeCidade,
    estado: ufUpper,
    bairro: ''
  }, montarSeoRevendasLocal({
    cidade: nomeCidade,
    uf: ufUpper,
    canonical
  }));

  const breadcrumbs = [
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Revendas', url: `${SITE_URL}/buscar-revendas` },
    { name: `${nomeCidade} - ${ufUpper}`, url: canonical }
  ];

  res.render('buscar-revendas', {
    seo,
    breadcrumbs,
    filtro: { cidade: cidadeSlug, cidadeNome: nomeCidade, uf: ufSlug, ufNome: ufUpper }
  });
});

router.get('/buscar-revendas/:bairro/:cidade/:uf', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const bairroSlug = slugify(req.params.bairro);
  const cidadeSlug = slugify(req.params.cidade);
  const ufSlug = slugify(req.params.uf);
  const cidadeEncontrada = await buscarCidadePorSlugUf(cidadeSlug, ufSlug);
  const bairroOriginal = await buscarBairroPorSlug(bairroSlug, cidadeSlug, ufSlug);
  const nomeBairro = bairroOriginal || capitalize(bairroSlug);
  const nomeCidade = cidadeEncontrada ? cidadeEncontrada.nome : capitalize(cidadeSlug);
  const ufUpper = cidadeEncontrada ? cidadeEncontrada.estado.toUpperCase() : ufSlug.toUpperCase();
  const canonical = `${SITE_URL}/buscar-revendas/${bairroSlug}/${cidadeSlug}/${ufSlug}`;
  const seo = await getSeo('buscar_revendas', {
    bairro: nomeBairro,
    cidade: nomeCidade,
    estado: ufUpper
  }, montarSeoRevendasLocal({
    cidade: nomeCidade,
    uf: ufUpper,
    bairro: nomeBairro,
    canonical
  }));

  const breadcrumbs = [
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Revendas', url: `${SITE_URL}/buscar-revendas` },
    { name: `${nomeCidade} - ${ufUpper}`, url: `${SITE_URL}/buscar-revendas/${cidadeSlug}/${ufSlug}` },
    { name: nomeBairro, url: canonical }
  ];

  res.render('buscar-revendas', {
    seo,
    breadcrumbs,
    filtro: {
      bairro: bairroSlug,
      bairroNome: nomeBairro,
      cidade: cidadeSlug,
      cidadeNome: nomeCidade,
      uf: ufSlug,
      ufNome: ufUpper
    }
  });
});

router.get("/api/revendas-ativas", async (req, res) => {
  try {
    await garantirTabelaCidadesRevendas();

    const [revendas] = await db.query(`
      SELECT 
        u.id,
        u.nome,
        u.bairro,
        u.cidade,
        u.estado,
        CASE
          WHEN rl.logo LIKE '%logo_pad_revenda.jpg' THEN NULL
          ELSE rl.logo
        END AS logo,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('bairro', rc.bairro, 'cidade', rc.cidade, 'estado', rc.estado))
          FROM revendas_cidades rc
          WHERE rc.usuario_id = u.id
        ) AS cidades_atendimento
      FROM usuarios u

      LEFT JOIN revendas_logos rl
        ON rl.usuario_id = u.id

      WHERE 
        u.tipo = 'revenda'
        AND EXISTS (
          SELECT 1 
          FROM anuncios a
          WHERE a.usuario_id = u.id
          AND a.status = 'ativo'
          AND (a.publicado_ate IS NULL OR a.publicado_ate >= NOW())
        )

      ORDER BY u.nome ASC
    `);

    return res.json(revendas.map((revenda) => ({
      ...revenda,
      url: montarCaminhoRevenda(revenda)
    })));

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro interno" });
  }
});

router.get("/api/anuncios-revenda-ativos", async (req, res) => {
  try {
    await garantirTabelaCidadesRevendas();

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
  (
    SELECT JSON_ARRAYAGG(JSON_OBJECT('bairro', rc.bairro, 'cidade', rc.cidade, 'estado', rc.estado))
    FROM revendas_cidades rc
    WHERE rc.usuario_id = u.id
  ) AS cidades_atendimento,
  img.imagem
FROM anuncios a
INNER JOIN usuarios u 
  ON u.id = a.usuario_id
LEFT JOIN anuncios_imagens img 
  ON img.anuncio_id = a.id 
  AND img.principal = true
WHERE 
  u.tipo = 'revenda'
  AND a.status = 'ativo'
  AND (a.publicado_ate IS NULL OR a.publicado_ate >= NOW())
ORDER BY a.criado_em DESC
    `)

    res.json(anuncios)

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Erro interno" })
  }
})



module.exports = router;
