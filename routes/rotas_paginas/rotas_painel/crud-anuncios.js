const express = require("express");
const router = express.Router();
const upload = require("../../../middlewares/uploadImagens");
const converterWebp = require("../../../middlewares/converterWebp");
const db = require("../../../database/pool_connection");
const fs = require("fs");
const path = require("path");
const { validarCriacaoAnuncio, validarEdicaoAnuncio } = require("../../../database/planos");

// Middleware simples de autenticação
function auth(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({
      message: "Usuário não autenticado."
    });
  }
  next();
}

router.post("/api/anunciante/anuncios", auth, upload.array("imagens", 10), converterWebp, async (req, res) => {
  try {
    const usuarioId = req.session.usuario.id;

    const {
      preco,
      descricao,
      tipo,
      marca,
      versao,
      ano_fabricacao,
      ano_modelo,
      km,
      condicao,
      cambio,
      motorizacao,
      portas,
      carroceria,
      combustivel,
      tracao,
      cor,
      acessorios
    } = req.body;

    /* ==========================
       VALIDAÇÕES
    ========================== */
    if (!preco || !descricao) {
      return res.status(400).json({
        message: "Campos obrigatórios não preenchidos."
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: "Envie pelo menos uma imagem."
      });
    }

    const validacaoPlano = await validarCriacaoAnuncio(db, usuarioId, {
      tipo,
      totalFotos: req.files.length
    });

    if (!validacaoPlano.permitido) {
      return res.status(403).json({
        message: validacaoPlano.message
      });
    }

    /* ==========================
       CRIAR ANÚNCIO
    ========================== */
    const [result] = await db.query(
      `
        INSERT INTO anuncios (
          usuario_id,
          status,
          preco,
          descricao,
          tipo,
          marca,
          versao,
          ano_fabricacao,
          ano_modelo,
          km,
          condicao,
          cambio,
          motorizacao,
          portas,
          carroceria,
          combustivel,
          tracao,
          cor,
          acessorios
        ) VALUES (?, 'analise', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        usuarioId,
        preco,
        descricao,
        tipo,
        marca,
        versao,
        ano_fabricacao,
        ano_modelo,
        km,
        condicao,
        cambio,
        motorizacao,
        portas,
        carroceria,
        combustivel,
        tracao,
        cor,
        acessorios ? JSON.stringify(acessorios) : null
      ]
    );

    const anuncioId = result.insertId;

    /* ==========================
       SALVAR IMAGENS
    ========================== */
    for (let i = 0; i < req.files.length; i++) {
      await db.query(
        `
          INSERT INTO anuncios_imagens (anuncio_id, imagem, principal)
          VALUES (?, ?, ?)
          `,
        [
          anuncioId,
          req.files[i].filename,
          i === 0 // primeira imagem como principal
        ]
      );
    }

    return res.status(201).json({
      message: "Anúncio criado com sucesso e enviado para análise.",
      anuncio_id: anuncioId
    });

  } catch (error) {
    console.error("Erro ao criar anúncio:", error);
    return res.status(500).json({
      message: "Erro interno no servidor."
    });
  }
}
);

router.get("/api/anunciante/anuncios/analise", auth, async (req, res) => {
  try {
    const usuarioId = req.session.usuario.id;

    const [anuncios] = await db.query(`
  SELECT 
    a.id,
    a.marca,
    a.versao,
    a.descricao,
    a.preco,
    a.ano_modelo,
    a.versao,
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
    AND a.status = 'analise'
  ORDER BY a.criado_em DESC
`, [usuarioId]);


    return res.json(anuncios);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro interno" });
  }
});

router.get("/api/anunciante/anuncios-ativos", auth, async (req, res) => {
  try {
    const usuarioId = req.session.usuario.id;

    const [anuncios] = await db.query(`
  SELECT 
    a.id,
    a.marca,
    a.versao,
    a.descricao,
    a.preco,
    a.ano_modelo,
    a.versao,
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


    return res.json(anuncios);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro interno" });
  }
});

router.get("/api/anunciante/anuncios", auth, async (req, res) => {
  try {
    const usuarioId = req.session.usuario.id;

    const [anuncios] = await db.query(`
      SELECT 
        a.id,
        a.marca,
        a.versao,
        a.descricao,
        a.preco,
        a.ano_modelo,
        a.status,
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
      ORDER BY a.criado_em DESC
    `, [usuarioId]);

    return res.json(anuncios);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro interno" });
  }
});

/* ROTA DE CONFLITO */
router.get("/api/anunciante/anuncios/:id", auth, async (req, res) => {
  try {
    const usuarioId = req.session.usuario.id;
    const anuncioId = req.params.id;

    const [[anuncio]] = await db.query(
      `
      SELECT 
        a.id,
        a.usuario_id,
        a.status,
        a.tipo,
        a.marca,
        a.versao,
        a.ano_fabricacao,
        a.ano_modelo,
        a.km,
        a.condicao,
        a.cambio,
        a.motorizacao,
        a.portas,
        a.carroceria,
        a.combustivel,
        a.tracao,
        a.cor,
        a.preco,
        a.descricao,
        a.acessorios,
        u.cidade,
        u.estado
      FROM anuncios a
      INNER JOIN usuarios u 
        ON u.id = a.usuario_id
      WHERE 
        a.id = ?
        AND a.usuario_id = ?
      LIMIT 1
      `,
      [anuncioId, usuarioId]
    );

    if (!anuncio) {
      return res.status(404).json({
        message: "Anúncio não encontrado"
      });
    }

    // 🔹 Busca TODAS as imagens do anúncio
    const [imagens] = await db.query(
      `
      SELECT id, imagem, principal
      FROM anuncios_imagens
      WHERE anuncio_id = ?
      ORDER BY principal DESC, id ASC
      `,
      [anuncioId]
    );

    anuncio.imagens = imagens;

    return res.json(anuncio);

  } catch (error) {
    console.error("Erro ao buscar anúncio:", error);
    return res.status(500).json({
      message: "Erro interno"
    });
  }
});

router.delete("/api/anunciante/anuncios/:id", auth, async (req, res) => {
  try {
    const usuarioId = req.session.usuario.id;
    const anuncioId = req.params.id;

    // 1️⃣ Verifica se o anúncio pertence ao usuário
    const [[anuncio]] = await db.query(
      "SELECT id FROM anuncios WHERE id = ? AND usuario_id = ?",
      [anuncioId, usuarioId]
    );

    if (!anuncio) {
      return res.status(403).json({ message: "Acesso negado ou anúncio inexistente" });
    }

    // 2️⃣ Busca imagens do anúncio
    const [imagens] = await db.query(
      "SELECT imagem FROM anuncios_imagens WHERE anuncio_id = ?",
      [anuncioId]
    );

    // 3️⃣ Remove arquivos físicos
    for (const img of imagens) {
      const caminhoImagem = path.join(
        __dirname,
        "..", "..", "..",      // 🔥 VOLTA ATÉ A RAIZ
        "public",
        "uploads",
        "anuncios",
        img.imagem
      );

      if (fs.existsSync(caminhoImagem)) {
        fs.unlinkSync(caminhoImagem);
      }
    }

    // 4️⃣ Remove anúncio (cascade remove imagens no banco)
    await db.query(
      "DELETE FROM anuncios WHERE id = ?",
      [anuncioId]
    );

    return res.json({ message: "Anúncio excluído com sucesso" });

  } catch (error) {
    console.error("Erro ao excluir anúncio:", error);
    return res.status(500).json({ message: "Erro interno" });
  }
});

router.put("/api/anunciante/anuncios/:id", auth, upload.array("imagens", 10), converterWebp, async (req, res) => {
  try {
    const usuarioId = req.session.usuario.id;
    const anuncioId = req.params.id;

    const {
      tipo,
      marca,
      versao,
      ano_fabricacao,
      ano_modelo,
      km,
      condicao,
      cambio,
      motorizacao,
      portas,
      carroceria,
      combustivel,
      tracao,
      cor,
      preco,
      descricao,
      acessorios,
      imagensRemovidas
    } = req.body;

    /* ============================
       1️⃣ VERIFICA PROPRIEDADE
    ============================ */
    const [[anuncio]] = await db.query(
      "SELECT id FROM anuncios WHERE id = ? AND usuario_id = ?",
      [anuncioId, usuarioId]
    );

    if (!anuncio) {
      return res.status(403).json({
        message: "Acesso negado ou anúncio não encontrado"
      });
    }

    /* ============================
       🔒 GARANTE IMAGEM FINAL
    ============================ */
    const [[{ totalImagens }]] = await db.query(
      `
  SELECT COUNT(*) AS totalImagens
  FROM anuncios_imagens
  WHERE anuncio_id = ?
  `,
      [anuncioId]
    );

    let removidas = [];

    if (imagensRemovidas) {
      try {
        removidas = JSON.parse(imagensRemovidas);
      } catch {
        removidas = [];
      }
    }

    const imagensNovas = req.files ? req.files.length : 0;
    const imagensFinais = totalImagens - removidas.length + imagensNovas;

    if (imagensFinais <= 0) {
      return res.status(400).json({
        message: "O anúncio precisa ter pelo menos uma imagem."
      });
    }

    const validacaoPlano = await validarEdicaoAnuncio(db, usuarioId, anuncioId, {
      totalFotosFinal: imagensFinais
    });

    if (!validacaoPlano.permitido) {
      return res.status(403).json({
        message: validacaoPlano.message
      });
    }



    /* ============================
       2️⃣ REMOVE IMAGENS EXCLUÍDAS
    ============================ */
    let listaRemovidas = [];

    if (imagensRemovidas) {
      try {
        listaRemovidas = JSON.parse(imagensRemovidas);
      } catch {
        listaRemovidas = [];
      }
    }

    for (const nomeImagem of listaRemovidas) {
      await db.query(
        "DELETE FROM anuncios_imagens WHERE anuncio_id = ? AND imagem = ?",
        [anuncioId, nomeImagem]
      );

      const caminho = path.join(
        process.cwd(),
        "public",
        "uploads",
        "anuncios",
        nomeImagem
      );

      try {
        if (fs.existsSync(caminho)) {
          fs.unlinkSync(caminho);
        }
      } catch (err) {
        console.warn("Erro ao remover imagem:", nomeImagem);
      }
    }

    /* ============================
 ⭐ GARANTE IMAGEM PRINCIPAL
============================ */
    const [[existePrincipal]] = await db.query(
      `
  SELECT id FROM anuncios_imagens
  WHERE anuncio_id = ? AND principal = 1
  LIMIT 1
  `,
      [anuncioId]
    );

    if (!existePrincipal) {
      const [[novaPrincipal]] = await db.query(
        `
    SELECT id FROM anuncios_imagens
    WHERE anuncio_id = ?
    ORDER BY id ASC
    LIMIT 1
    `,
        [anuncioId]
      );

      if (novaPrincipal) {
        await db.query(
          `UPDATE anuncios_imagens SET principal = 1 WHERE id = ?`,
          [novaPrincipal.id]
        );
      }
    }


    /* ============================
       3️⃣ ATUALIZA DADOS
    ============================ */
    let acessoriosFinal = "[]";

    if (acessorios) {
      try {
        JSON.parse(acessorios);
        acessoriosFinal = acessorios;
      } catch {
        acessoriosFinal = JSON.stringify([acessorios]);
      }
    }

    await db.query(
      `
        UPDATE anuncios SET
          tipo = ?,
          marca = ?,
          versao = ?,
          ano_fabricacao = ?,
          ano_modelo = ?,
          km = ?,
          condicao = ?,
          cambio = ?,
          motorizacao = ?,
          portas = ?,
          carroceria = ?,
          combustivel = ?,
          tracao = ?,
          cor = ?,
          preco = ?,
          descricao = ?,
          acessorios = ?,
          status = 'analise'
        WHERE id = ?
        `,
      [
        tipo,
        marca,
        versao,
        ano_fabricacao,
        ano_modelo,
        km,
        condicao,
        cambio,
        motorizacao,
        portas,
        carroceria,
        combustivel,
        tracao,
        cor,
        preco,
        descricao,
        acessoriosFinal,
        anuncioId
      ]
    );

    /* ============================
       4️⃣ INSERE NOVAS IMAGENS
    ============================ */
    if (req.files && req.files.length > 0) {
      const [[existePrincipal]] = await db.query(
        `
          SELECT id FROM anuncios_imagens
          WHERE anuncio_id = ? AND principal = 1
          LIMIT 1
          `,
        [anuncioId]
      );

      for (let i = 0; i < req.files.length; i++) {
        await db.query(
          `
            INSERT INTO anuncios_imagens
            (anuncio_id, imagem, principal)
            VALUES (?, ?, ?)
            `,
          [
            anuncioId,
            req.files[i].filename,
            !existePrincipal && i === 0 ? 1 : 0
          ]
        );
      }
    }

    return res.json({
      message: "Anúncio atualizado com sucesso"
    });

  } catch (error) {
    console.error("Erro ao atualizar anúncio:", error);
    return res.status(500).json({
      message: "Erro interno ao atualizar anúncio"
    });
  }
}
);

module.exports = router;
