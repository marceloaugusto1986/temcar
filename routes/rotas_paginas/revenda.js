const express = require('express');
const router = express.Router();
const db = require("./../../database/pool_connection");
const { getSeoRevenda } = require('../../helpers/seo');
const { montarCaminhoRevenda, montarUrlRevenda, montarSlugRevenda } = require('../../helpers/revenda-url');

async function buscarRevendaPorId(id) {
  const [[revenda]] = await db.query(`
    SELECT id, nome
    FROM usuarios
    WHERE id = ? AND tipo = 'revenda'
    LIMIT 1
  `, [id]);

  return revenda || null;
}

async function buscarRevendaPorIdentificador(identificador) {
  if (/^\d+$/.test(identificador)) {
    return buscarRevendaPorId(identificador);
  }

  const [revendas] = await db.query(`
    SELECT id, nome
    FROM usuarios
    WHERE tipo = 'revenda'
    ORDER BY id ASC
  `);

  return revendas.find((revenda) => montarSlugRevenda(revenda) === identificador) || null;
}

/* =========================================================
   🔹 PÁGINA DA REVENDA
   ========================================================= */
router.get('/revenda/:identificador', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const revenda = await buscarRevendaPorIdentificador(req.params.identificador);
  if (!revenda) {
    return res.status(404).render('error-page', {
      statusCode: 404,
      message: 'Revenda não encontrada'
    });
  }

  const caminhoCanonico = montarCaminhoRevenda(revenda);
  if (req.path !== caminhoCanonico) {
    return res.redirect(301, caminhoCanonico);
  }

  const seo = await getSeoRevenda(revenda.id);
  const breadcrumbs = [
    { name: 'Home', url: 'https://www.temcar.com.br/' },
    { name: 'Revendas', url: 'https://www.temcar.com.br/buscar-revendas' },
    { name: seo.texto_h1 || 'Revenda', url: montarUrlRevenda(revenda) }
  ];
  res.render('revenda', { seo: { ...seo, link_canonico: montarUrlRevenda(revenda) }, breadcrumbs, revendaId: revenda.id });
});


/* =========================================================
   🔹 API — DADOS DA REVENDA + ANÚNCIOS
   ========================================================= */
router.get("/api/revenda/:id", async (req, res) => {
  try {
    const revendaId = req.params.id

    const [dados] = await db.query(`
      SELECT 
        u.id,
        u.nome,
        u.whatsapp,
        u.telefone,
        u.cep,
        u.rua,
        u.numero,
        u.bairro,
        u.cidade,
        u.estado,
        u.criado_em,

        CASE
          WHEN rl.logo LIKE '%logo_pad_revenda.jpg' THEN NULL
          ELSE rl.logo
        END AS logo

      FROM usuarios u

      LEFT JOIN revendas_logos rl
        ON rl.usuario_id = u.id

      WHERE 
        u.id = ?
        AND u.tipo = 'revenda'
      LIMIT 1
    `, [revendaId])

    if (!dados.length) {
      return res.status(404).json({ message: "Revenda não encontrada" })
    }

    return res.json(dados[0])

  } catch (error) {
    console.error("Erro ao buscar revenda:", error)
    return res.status(500).json({ message: "Erro interno" })
  }
})

router.get("/api/revenda/:id/anuncios", async (req, res) => {
  try {
    const revendaId = req.params.id

    const [anuncios] = await db.query(`
      SELECT 
        a.id,
        a.marca,
        a.versao,
        a.descricao,
        a.preco,
        a.ano_fabricacao,
        a.ano_modelo,
        a.motorizacao,
        a.km,
        a.cambio,
        a.combustivel,
        a.carroceria,
        a.cor,
        a.condicao,
        a.acessorios,
        u.nome,
        u.cidade,
        u.estado,
        img.imagem
      FROM anuncios a
      INNER JOIN usuarios u ON u.id = a.usuario_id
      LEFT JOIN anuncios_imagens img 
        ON img.anuncio_id = a.id AND img.principal = true
      WHERE 
        a.usuario_id = ?
        AND a.status = 'ativo'
        AND (a.publicado_ate IS NULL OR a.publicado_ate >= NOW())
      ORDER BY a.criado_em DESC
    `, [revendaId])

    res.json(anuncios)

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Erro interno" })
  }
})

router.get("/api/revendas-ativos", async (req, res) => {
  try {
    const [anuncios] = await db.query(`
      SELECT 
        a.id,
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
        u.tipo = 'revenda'
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



module.exports = router;
