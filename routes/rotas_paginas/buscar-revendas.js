const express = require('express');
const router = express.Router();
const db = require("./../../database/pool_connection");
const { getSeo } = require('../../helpers/seo');

router.get('/buscar-revendas', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const seo = await getSeo('buscar_revendas');
  res.render('buscar-revendas', { seo });
});

router.get("/api/revendas-ativas", async (req, res) => {
  try {
    const [revendas] = await db.query(`
      SELECT 
        u.id,
        u.nome,
        u.cidade,
        u.estado,
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
        u.tipo = 'revenda'
        AND EXISTS (
          SELECT 1 
          FROM anuncios a
          WHERE a.usuario_id = u.id
          AND a.status = 'ativo'
        )

      ORDER BY u.nome ASC
    `);

    return res.json(revendas);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro interno" });
  }
});

router.get("/api/anuncios-revenda-ativos", async (req, res) => {
  try {
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
  u.tipo AS tipo_anunciante,
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
    console.error(error)
    res.status(500).json({ message: "Erro interno" })
  }
})



module.exports = router;
