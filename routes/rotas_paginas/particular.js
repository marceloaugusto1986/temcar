const express = require('express');
const router = express.Router();
const db = require("../../database/pool_connection");
const { getSeo } = require('../../helpers/seo');
const { buscarPlanoDoUsuario } = require('../../database/planos');


router.get('/particular', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const seo = await getSeo('particular');
  res.render('particular', { seo });
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
