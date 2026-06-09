const express = require('express');
const router = express.Router();
const db = require("../../database/pool_connection");
const { getSeo } = require('../../helpers/seo');
const { buscarPlanoDoUsuario } = require('../../database/planos');
const SITE_URL = (process.env.SITE_URL || 'https://www.temcar.com.br').replace(/\/$/, '');
const DB_NAME = process.env.DB_NAME;
let cacheUsuariosTemBairro = null;

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

async function usuariosTemColunaBairro() {
  if (cacheUsuariosTemBairro !== null) return cacheUsuariosTemBairro;
  if (!DB_NAME) {
    cacheUsuariosTemBairro = false;
    return cacheUsuariosTemBairro;
  }

  const [colunas] = await db.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'usuarios'
      AND COLUMN_NAME = 'bairro'
    LIMIT 1
  `, [DB_NAME]);

  cacheUsuariosTemBairro = colunas.length > 0;
  return cacheUsuariosTemBairro;
}

function montarSeoParticularLocal({ cidade, uf, bairro = '', canonical }) {
  const local = bairro ? `${bairro}, ${cidade} - ${uf}` : `${cidade} - ${uf}`;
  const localDescricao = bairro ? `no bairro ${bairro}, em ${cidade} - ${uf}` : `em ${cidade} - ${uf}`;

  return {
    titulo: `Veículos de Particular à Venda em ${local} | TEMCAR`,
    descricao: `Compre veículos direto de particulares ${localDescricao}. Encontre carros, motos e utilitários usados, seminovos e novos no TEMCAR.`,
    keywords: bairro
      ? `veículos de particular em ${bairro}, carros de particular em ${bairro}, ${cidade}, ${uf}`
      : `veículos de particular em ${cidade}, carros de particular ${cidade}, motos de particular ${uf}`,
    texto_h1: `Veículos de Particular à Venda em ${local}`,
    link_canonico: canonical
  };
}

router.get('/particular', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const seo = await getSeo('particular');
  const breadcrumbs = [
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Particular', url: `${SITE_URL}/particular` }
  ];
  res.render('particular', { seo, breadcrumbs, filtro: {} });
});

router.get('/particular/:cidade/:uf', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const cidadeSlug = slugify(req.params.cidade);
  const ufSlug = slugify(req.params.uf);
  const cidadeEncontrada = await buscarCidadePorSlugUf(cidadeSlug, ufSlug);

  if (!cidadeEncontrada) {
    const seo = await getSeo('particular');
    return res.render('particular', { seo, breadcrumbs: [], filtro: {} });
  }

  const nomeCidade = cidadeEncontrada.nome;
  const ufUpper = cidadeEncontrada.estado.toUpperCase();
  const canonical = `${SITE_URL}/particular/${cidadeSlug}/${ufSlug}`;
  const seo = await getSeo('particular', {
    cidade: nomeCidade,
    estado: ufUpper,
    bairro: ''
  }, montarSeoParticularLocal({
    cidade: nomeCidade,
    uf: ufUpper,
    canonical
  }));

  const breadcrumbs = [
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Particular', url: `${SITE_URL}/particular` },
    { name: `${nomeCidade} - ${ufUpper}`, url: canonical }
  ];

  res.render('particular', {
    seo,
    breadcrumbs,
    filtro: { cidade: cidadeSlug, cidadeNome: nomeCidade, uf: ufSlug, ufNome: ufUpper }
  });
});

router.get('/particular/:bairro/:cidade/:uf', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const bairroSlug = slugify(req.params.bairro);
  const cidadeSlug = slugify(req.params.cidade);
  const ufSlug = slugify(req.params.uf);
  const cidadeEncontrada = await buscarCidadePorSlugUf(cidadeSlug, ufSlug);
  const nomeBairro = capitalize(bairroSlug);
  const nomeCidade = cidadeEncontrada ? cidadeEncontrada.nome : capitalize(cidadeSlug);
  const ufUpper = cidadeEncontrada ? cidadeEncontrada.estado.toUpperCase() : ufSlug.toUpperCase();
  const canonical = `${SITE_URL}/particular/${bairroSlug}/${cidadeSlug}/${ufSlug}`;

  const seo = await getSeo('particular', {
    bairro: nomeBairro,
    cidade: nomeCidade,
    estado: ufUpper
  }, montarSeoParticularLocal({
    cidade: nomeCidade,
    uf: ufUpper,
    bairro: nomeBairro,
    canonical
  }));

  const breadcrumbs = [
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Particular', url: `${SITE_URL}/particular` },
    { name: `${nomeCidade} - ${ufUpper}`, url: `${SITE_URL}/particular/${cidadeSlug}/${ufSlug}` },
    { name: nomeBairro, url: canonical }
  ];

  res.render('particular', {
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

router.get("/api/particular-ativos", async (req, res) => {
  try {
    const usuario = req.session.usuario;

    /* 🔐 VALIDA SESSÃO */
    if (!usuario) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    const usuarioId = usuario.id;

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
        a.status,

        u.nome,
        u.cidade,
        u.estado,
        u.tipo AS tipo_anunciante,

        img.imagem

      FROM anuncios a

      INNER JOIN usuarios u 
        ON u.id = a.usuario_id

      LEFT JOIN anuncios_imagens img 
        ON img.anuncio_id = a.id 
        AND img.principal = true

      WHERE 
        a.usuario_id = ?
        AND a.status = 'ativo'
        AND (a.publicado_ate IS NULL OR a.publicado_ate >= NOW())

      ORDER BY a.criado_em DESC
    `, [usuarioId]);

    res.json(anuncios);

  } catch (error) {
    console.error("Erro ao buscar anúncios:", error);
    res.status(500).json({ message: "Erro interno" });
  }
});

router.get("/api/particular-ativos-home", async (req, res) => {
  try {
    const bairroSelect = await usuariosTemColunaBairro() ? 'u.bairro,' : 'NULL AS bairro,';

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
  ${bairroSelect}
  u.tipo AS tipo_anunciante,
  img.imagem
FROM anuncios a
INNER JOIN usuarios u 
  ON u.id = a.usuario_id
LEFT JOIN anuncios_imagens img 
  ON img.anuncio_id = a.id 
  AND img.principal = true
WHERE 
  u.tipo = 'particular'
  AND a.status = 'ativo'
  AND (a.publicado_ate IS NULL OR a.publicado_ate >= NOW())
ORDER BY a.criado_em DESC
    `)

    res.json(anuncios)

  } catch (error) {
    console.error("Erro ao buscar anúncios particulares:", error)
    res.status(500).json({ message: "Erro interno" })
  }
})

router.get("/api/meus-anuncios", async (req, res) => {
  try {
    const usuario = req.session.usuario;

    if (!usuario) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    const usuarioId = usuario.id;

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
        a.status,

        u.nome,
        u.cidade,
        u.estado,

        img.imagem

      FROM anuncios a

      INNER JOIN usuarios u 
        ON u.id = a.usuario_id

      LEFT JOIN anuncios_imagens img 
        ON img.anuncio_id = a.id 
        AND img.principal = true

      WHERE 
        a.usuario_id = ?
        AND a.status = 'ativo'
        AND (a.publicado_ate IS NULL OR a.publicado_ate >= NOW())

      ORDER BY a.criado_em DESC
    `, [usuarioId]);

    res.json(anuncios);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar anúncios" });
  }
});

router.post("/api/meus-anuncios-destaques", async (req, res) => {
  try {
    const usuario = req.session.usuario;

    if (!usuario) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    const usuarioId = usuario.id;
    const { anuncios = [] } = req.body;
    const plano = await buscarPlanoDoUsuario(db, usuarioId);
    const limiteDestaques = Number(plano?.limite_destaques || 0);

    /* ==========================
       PEGAR APENAS IDS DO USUÁRIO
    ========================== */
    const [meus] = await db.query(`
      SELECT id 
      FROM anuncios
      WHERE usuario_id = ?
    `, [usuarioId]);

    const idsValidos = meus.map(a => a.id);

    /* ==========================
       FILTRAR SEGURANÇA
    ========================== */
    const selecionados = anuncios
      .map(Number)
      .filter(id => idsValidos.includes(id));

    if (selecionados.length > limiteDestaques) {
      return res.status(403).json({
        message: `Seu plano permite até ${limiteDestaques} destaque(s).`
      });
    }

    /* ==========================
       RESETAR TODOS
    ========================== */
    await db.query(`
      UPDATE anuncios
      SET destaque = FALSE
      WHERE usuario_id = ?
    `, [usuarioId]);

    /* ==========================
       ATIVAR SELECIONADOS
    ========================== */
    if (selecionados.length > 0) {
      await db.query(`
        UPDATE anuncios
        SET destaque = TRUE
        WHERE id IN (?)
      `, [selecionados]);
    }

    res.json({ message: "Destaques atualizados com sucesso!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao salvar destaques" });
  }
});

module.exports = router;
