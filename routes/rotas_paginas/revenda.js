const express = require('express');
const router = express.Router();
const db = require("./../../database/pool_connection");
const { getSeoRevenda } = require('../../helpers/seo');

/* =========================================================
   🔹 PÁGINA DA REVENDA
   ========================================================= */
router.get('/revenda/:id', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const seo = await getSeoRevenda(req.params.id);
  const breadcrumbs = [
    { name: 'Home', url: 'https://www.temcar.com.br/' },
    { name: 'Revendas', url: 'https://www.temcar.com.br/buscar-revendas' },
    { name: seo.texto_h1 || 'Revenda', url: `https://www.temcar.com.br/revenda/${req.params.id}` }
  ];
  res.render('revenda', { seo, breadcrumbs });
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

        COALESCE(rl.logo, rlp.caminho) AS logo

      FROM usuarios u

      LEFT JOIN revendas_logos rl
        ON rl.usuario_id = u.id

      CROSS JOIN (
        SELECT caminho 
        FROM revenda_logo_padrao 
        LIMIT 1
      ) rlp

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
      ORDER BY a.criado_em DESC
    `)

    res.json(anuncios)

  } catch (error) {
    console.error("Erro ao buscar anúncios particulares:", error)
    res.status(500).json({ message: "Erro interno" })
  }
})



module.exports = router;
