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

// Conta anúncios de particulares que casam com o local (espelha o filtro do front)
// para sinalizar páginas sem nenhum resultado.
async function contarParticular({ cidadeSlug, ufSlug, bairroSlug } = {}) {
  try {
    const [anuncios] = await db.query(`
      SELECT u.cidade, u.estado, u.bairro
      FROM anuncios a
      INNER JOIN usuarios u ON u.id = a.usuario_id
      WHERE u.tipo = 'particular'
        AND a.status = 'ativo'
        AND (a.publicado_ate IS NULL OR a.publicado_ate >= NOW())
    `);
    return anuncios.filter(item => {
      if (cidadeSlug && slugify(item.cidade) !== cidadeSlug) return false;
      if (ufSlug && String(item.estado || '').toLowerCase() !== ufSlug) return false;
      if (bairroSlug && slugify(item.bairro) !== bairroSlug) return false;
      return true;
    }).length;
  } catch (error) {
    console.error('Erro ao contar particulares para indexação:', error);
    return 1; // Em caso de erro, mantém comportamento padrão (indexável)
  }
}

// Páginas sem anúncio continuam indexáveis (index, follow) com o SEO das meta
// tags; apenas sinalizamos a ausência de anúncios para o template aplicar
// data-nosnippet nas tarjas vermelhas (Google indexa, mas não lê o título da tarja).
function marcarSemAnuncios(seo, total) {
  seo.semAnuncios = !total;
  return seo;
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

  marcarSemAnuncios(seo, await contarParticular({ cidadeSlug, ufSlug }));

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
  const bairroEncontrado = cidadeEncontrada
    ? await buscarBairroPorSlugCidadeUf(bairroSlug, cidadeEncontrada, ufSlug)
    : null;
  const nomeBairro = bairroEncontrado?.nome || capitalize(bairroSlug);
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

  marcarSemAnuncios(seo, await contarParticular({ cidadeSlug, ufSlug, bairroSlug }));

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

    // Garante a tabela de cidades extras (criada de forma lazy por outras rotas)
    await db.query(`
      CREATE TABLE IF NOT EXISTS revendas_cidades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        bairro VARCHAR(150) NOT NULL DEFAULT '',
        cidade VARCHAR(150) NOT NULL,
        estado VARCHAR(2) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_revenda_cidade (usuario_id, bairro, cidade, estado),
        KEY idx_revendas_cidades_usuario (usuario_id)
      )
    `);

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
  ${bairroSelect}
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
