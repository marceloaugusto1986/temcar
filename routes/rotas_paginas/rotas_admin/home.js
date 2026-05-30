const express = require('express');
const router = express.Router();
const checkAuth = require('../../../middlewares/authMiddleware');
const db = require('../../../database/pool_connection');
const bcrypt = require('bcryptjs');
const fs = require("fs");
const path = require("path");
const upload = require("../../../middlewares/uploadImagens");

async function garantirColunasRegioesImagens() {
  const [colunas] = await db.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'regioes_imagens'
  `);

  const nomes = colunas.map(coluna => coluna.COLUMN_NAME);

  if (!nomes.includes('link')) {
    await db.query(`
      ALTER TABLE regioes_imagens
      ADD COLUMN link varchar(500) DEFAULT NULL AFTER imagem
    `);
  }

  if (!nomes.includes('imagem_mobile')) {
    await db.query(`
      ALTER TABLE regioes_imagens
      ADD COLUMN imagem_mobile varchar(255) DEFAULT NULL AFTER imagem
    `);
  }
}

async function garantirColunaImagemMobileCidades() {
  const [colunas] = await db.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'cidades'
      AND COLUMN_NAME = 'imagem_mobile'
  `);

  if (!colunas.length) {
    await db.query(`
      ALTER TABLE cidades
      ADD COLUMN imagem_mobile varchar(255) DEFAULT NULL AFTER imagem
    `);
  }
}

async function garantirColunaImagemMobileHomeCarousel() {
  const [colunas] = await db.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'home_carousel_imagens'
      AND COLUMN_NAME = 'imagem_mobile'
  `);

  if (!colunas.length) {
    await db.query(`
      ALTER TABLE home_carousel_imagens
      ADD COLUMN imagem_mobile varchar(255) DEFAULT NULL AFTER imagem
    `);
  }
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

function obterListaCampo(body, nome) {
  const valor = body[nome] ?? body[`${nome}[]`] ?? [];
  return Array.isArray(valor) ? valor : [valor];
}

router.get('/home', checkAuth('private'), (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.render('admin/home', { user: req.user });
});

router.get('/api/admin/usuarios', checkAuth('private'), async (req, res) => {
  try {
    const [usuarios] = await db.query(`
      SELECT
        id,
        nome,
        email,
        whatsapp,
        tipo,
        cidade,
        estado,
        criado_em
      FROM usuarios
      WHERE id > 1
      ORDER BY criado_em DESC
    `);

    return res.status(200).json({
      usuarios
    });

  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    return res.status(500).json({
      message: 'Erro interno do servidor.'
    });
  }
});

router.get('/api/admin/usuarios/:id', checkAuth('private'), async (req, res) => {
  try {
    const { id } = req.params;

    await garantirTabelaCidadesRevendas();

    const [usuarios] = await db.query(
      'SELECT * FROM usuarios WHERE id = ? AND id > 1 LIMIT 1',
      [id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        message: 'Usuário não encontrado.'
      });
    }

    const [cidadesAtendimento] = await db.query(
      `
      SELECT cidade, estado
      FROM revendas_cidades
      WHERE usuario_id = ?
      ORDER BY cidade ASC, estado ASC
      `,
      [id]
    );

    usuarios[0].cidades_atendimento = cidadesAtendimento;

    return res.status(200).json({
      usuario: usuarios[0]
    });

  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    return res.status(500).json({
      message: 'Erro interno do servidor.'
    });
  }
});

router.put('/api/admin/usuarios/:id/cidades-atendimento', checkAuth('private'), async (req, res) => {
  try {
    const { id } = req.params;
    const { cidadesAtendimento = [] } = req.body;

    if (!Array.isArray(cidadesAtendimento)) {
      return res.status(400).json({ message: 'Lista de cidades inválida.' });
    }

    await garantirTabelaCidadesRevendas();

    const [[usuario]] = await db.query(
      'SELECT id, tipo FROM usuarios WHERE id = ? AND id > 1 LIMIT 1',
      [id]
    );

    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    if (usuario.tipo !== 'revenda') {
      return res.status(400).json({ message: 'Cidades de atuação disponíveis apenas para revendas.' });
    }

    const cidadesValidas = cidadesAtendimento
      .map(item => ({
        cidade: String(item?.nome || item?.cidade || '').trim(),
        estado: String(item?.estado || '').trim().toUpperCase()
      }))
      .filter(item => item.cidade && /^[A-Z]{2}$/.test(item.estado));

    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM revendas_cidades WHERE usuario_id = ?', [id]);

      if (cidadesValidas.length) {
        const valores = cidadesValidas.map(item => [id, item.cidade, item.estado]);
        await conn.query(
          'INSERT IGNORE INTO revendas_cidades (usuario_id, cidade, estado) VALUES ?',
          [valores]
        );
      }

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }

    return res.json({ message: 'Cidades atualizadas com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar cidades da revenda:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

router.put('/api/admin/usuarios/:id/senha', checkAuth('private'), async (req, res) => {
  try {
    const { id } = req.params;
    const { novaSenha } = req.body;

    if (!novaSenha || novaSenha.length < 6) {
      return res.status(400).json({
        message: 'A senha deve ter pelo menos 6 caracteres.'
      });
    }

    // Verifica se usuário existe (exceto admin)
    const [usuarios] = await db.query(
      'SELECT id FROM usuarios WHERE id = ? AND id > 1 LIMIT 1',
      [id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        message: 'Usuário não encontrado.'
      });
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);

    await db.query(
      'UPDATE usuarios SET senha = ? WHERE id = ?',
      [senhaHash, id]
    );

    return res.status(200).json({
      message: 'Senha alterada com sucesso.'
    });

  } catch (err) {
    console.error('Erro ao alterar senha:', err);
    return res.status(500).json({
      message: 'Erro interno do servidor.'
    });
  }
});

router.get('/api/admin/usuarios/:usuarioId/anuncios', checkAuth('private'), async (req, res) => {
  try {
    const { usuarioId } = req.params;

    const [anuncios] = await db.query(`
      SELECT 
        a.id,
        a.usuario_id,
        a.status,
        a.tipo,
        a.marca,
        a.versao,
        a.ano_modelo,
        a.preco,
        a.descricao,
        u.cidade,
        u.estado,
        (
          SELECT imagem 
          FROM anuncios_imagens 
          WHERE anuncio_id = a.id 
          ORDER BY principal DESC, id ASC 
          LIMIT 1
        ) AS imagem
      FROM anuncios a
      INNER JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.usuario_id = ?
      ORDER BY a.criado_em DESC
    `, [usuarioId]);

    return res.json(anuncios);

  } catch (err) {
    console.error('Erro ao buscar anúncios do usuário:', err);
    return res.status(500).json({ message: 'Erro interno' });
  }
});

router.get('/api/admin/anuncios-analise', checkAuth('private'), async (req, res) => {
  try {
    const [anuncios] = await db.query(`
      SELECT
        a.id,
        a.status,
        a.marca,
        a.versao,
        a.descricao,
        a.preco,
        a.ano_modelo,
        u.nome AS anunciante,
        u.cidade,
        u.estado,
        (
          SELECT imagem
          FROM anuncios_imagens
          WHERE anuncio_id = a.id
          ORDER BY principal DESC, id ASC
          LIMIT 1
        ) AS imagem
      FROM anuncios a
      INNER JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.status = 'analise'
      ORDER BY a.criado_em DESC
    `);

    return res.json(anuncios);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro interno' });
  }
});

router.get('/api/admin/anuncios-publicados', checkAuth('private'), async (req, res) => {
  try {
    const [anuncios] = await db.query(`
      SELECT
        a.id,
        a.status,
        a.marca,
        a.versao,
        a.descricao,
        a.preco,
        a.ano_modelo,
        u.nome AS anunciante,
        u.cidade,
        u.estado,
        (
          SELECT imagem
          FROM anuncios_imagens
          WHERE anuncio_id = a.id
          ORDER BY principal DESC, id ASC
          LIMIT 1
        ) AS imagem
      FROM anuncios a
      INNER JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.status = 'ativo'
      ORDER BY a.criado_em DESC
    `);

    return res.json(anuncios);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro interno' });
  }
});

router.delete('/api/admin/usuarios/:id', checkAuth('private'), async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    if (Number(id) === 1) {
      return res.status(403).json({
        message: "Não é permitido excluir o administrador principal."
      });
    }

    await connection.beginTransaction();

    // 🔹 Buscar imagens dos anúncios do usuário
    const [imagens] = await connection.query(`
      SELECT ai.imagem
      FROM anuncios_imagens ai
      INNER JOIN anuncios a ON a.id = ai.anuncio_id
      WHERE a.usuario_id = ?
    `, [id]);

    // 🔹 Remove arquivos físicos
    for (const img of imagens) {
      const filePath = path.join(
        __dirname,
        "..", "..", "..", 
        "public",
        "uploads",
        "anuncios",
        img.imagem
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // 🔹 Remove usuário
    // (anuncios e imagens serão removidos pelo ON DELETE CASCADE)
    await connection.query(
      "DELETE FROM usuarios WHERE id = ?",
      [id]
    );

    await connection.commit();

    return res.json({
      message: "Usuário, anúncios e imagens removidos com sucesso."
    });

  } catch (err) {
    await connection.rollback();
    console.error("Erro ao excluir usuário:", err);

    return res.status(500).json({
      message: "Erro interno ao excluir usuário."
    });

  } finally {
    connection.release();
  }
});

/* Publicar anúncio */
router.put('/api/admin/publicando-anuncio/:id', checkAuth('private'), async (req, res) => {
  try {
    const anuncioId = req.params.id;

    await db.query(
      `UPDATE anuncios SET status = 'ativo' WHERE id = ?`,
      [anuncioId]
    );

    return res.json({ message: 'Anúncio publicado com sucesso' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro interno' });
  }
});

/* Recusar anúncio */
router.put('/api/admin/reprovar-anuncio/:id', checkAuth('private'), async (req, res) => {
  try {
    const anuncioId = req.params.id;

    await db.query(
      `UPDATE anuncios SET status = 'analise' WHERE id = ?`,
      [anuncioId]
    );

    return res.json({ message: 'Anúncio recusado com sucesso' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro interno' });
  }
});


router.get("/api/admin/home/carrossel", async (req, res) => {
  try {
    await garantirColunaImagemMobileHomeCarousel();

    const [slides] = await db.query(`
      SELECT * FROM home_carousel_imagens
      ORDER BY ordem ASC
    `);

    res.json(slides);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar slides" });
  }
});

router.post(
  "/api/admin/home/carrossel",
  upload.any(),
  async (req, res) => {
    try {
      const {
        ids = [],
        titulos = [],
        descricoes = [],
        links = [],
        ordens = [],
        ativos = [],
        temImagem = [],
        temImagemMobile = []
      } = req.body;

      let fileIndex = 0;
      let fileMobileIndex = 0;
      const arquivos = Array.isArray(req.files) ? req.files : [];
      const imagensDesktop = arquivos.filter(file => file.fieldname === "imagens");
      const imagensMobile = arquivos.filter(file => file.fieldname === "imagensMobile");

      await garantirColunaImagemMobileHomeCarousel();

      for (let i = 0; i < titulos.length; i++) {
        const id = ids[i];
        const possuiNovaImagem = temImagem[i] === "true";
        const possuiNovaImagemMobile = temImagemMobile[i] === "true";
        const novaImagem = possuiNovaImagem ? imagensDesktop[fileIndex++] : null;
        const novaImagemMobile = possuiNovaImagemMobile ? imagensMobile[fileMobileIndex++] : null;

        /* ==========================
           ATUALIZAR EXISTENTE
        ========================== */
        if (id) {
          let imagemFinal = null;
          let imagemMobileFinal = null;

          const [[slideAtual]] = (novaImagem || novaImagemMobile)
            ? await db.query(
              "SELECT imagem, imagem_mobile FROM home_carousel_imagens WHERE id = ?",
              [id]
            )
            : [[]];

          if (novaImagem) {
            if (slideAtual?.imagem) {
              const caminho = path.join(
                "public/uploads/anuncios",
                slideAtual.imagem
              );

              if (fs.existsSync(caminho)) {
                fs.unlinkSync(caminho);
              }
            }

            imagemFinal = novaImagem.filename;
          }

          if (novaImagemMobile) {
            if (slideAtual?.imagem_mobile) {
              const caminho = path.join(
                "public/uploads/anuncios",
                slideAtual.imagem_mobile
              );

              if (fs.existsSync(caminho)) {
                fs.unlinkSync(caminho);
              }
            }

            imagemMobileFinal = novaImagemMobile.filename;
          }

          await db.query(
            `
            UPDATE home_carousel_imagens
            SET
              imagem = COALESCE(?, imagem),
              imagem_mobile = COALESCE(?, imagem_mobile),
              titulo = ?,
              descricao = ?,
              link = ?,
              ordem = ?,
              ativo = ?
            WHERE id = ?
            `,
            [
              imagemFinal,
              imagemMobileFinal,
              titulos[i],
              descricoes[i],
              links[i],
              ordens[i],
              ativos[i] === "true",
              id
            ]
          );

        /* ==========================
           NOVO SLIDE
        ========================== */
        } else {
          if (!novaImagem) continue;

          await db.query(
            `
            INSERT INTO home_carousel_imagens
            (imagem, imagem_mobile, titulo, descricao, link, ordem, ativo)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
              novaImagem.filename,
              novaImagemMobile?.filename || null,
              titulos[i],
              descricoes[i],
              links[i],
              ordens[i],
              ativos[i] === "true"
            ]
          );
        }
      }

      res.json({ message: "Carrossel salvo com sucesso!" });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao salvar carrossel" });
    }
  }
);

router.delete("/api/admin/home/carrossel/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await garantirColunaImagemMobileHomeCarousel();

    const [[slide]] = await db.query(
      "SELECT imagem, imagem_mobile FROM home_carousel_imagens WHERE id = ?",
      [id]
    );

    if (!slide) {
      return res.status(404).json({ message: "Slide não encontrado" });
    }

    if (slide.imagem) {
      const caminho = path.join(
        "public/uploads/anuncios",
        slide.imagem
      );

      if (fs.existsSync(caminho)) {
        fs.unlinkSync(caminho);
      }
    }

    if (slide?.imagem_mobile) {
      const caminhoMobile = path.join(
        "public/uploads/anuncios",
        slide.imagem_mobile
      );

      if (fs.existsSync(caminhoMobile)) {
        fs.unlinkSync(caminhoMobile);
      }
    }

    await db.query("DELETE FROM home_carousel_imagens WHERE id = ?", [id]);

    res.json({ message: "Slide excluído com sucesso!" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao excluir slide" });
  }
});


router.get("/api/configuracoes-site", async (req, res) => {
  try {
    const [[config]] = await db.query(`
      SELECT * FROM configuracoes_site
      LIMIT 1
    `);

    res.json(config || {});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar configurações" });
  }
});

router.post(
  "/api/admin/configuracoes-site",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const removerLogo = req.body.removerLogo === "true";
      const removerFavicon = req.body.removerFavicon === "true";

      const logoFile = req.files?.logo?.[0];
      const faviconFile = req.files?.favicon?.[0];

      const [[config]] = await db.query(`
        SELECT * FROM configuracoes_site
        LIMIT 1
      `);

      if (!config) {
        return res.status(400).json({
          message: "Configuração do site não encontrada"
        });
      }

      let logoFinal = config.logo;
      let faviconFinal = config.favicon;

      /* ==========================
         PROCESSAR LOGO
      ========================== */
      if (removerLogo && config.logo) {
        const caminho = path.join(
          "public/uploads/anuncios",
          config.logo
        );

        if (fs.existsSync(caminho)) fs.unlinkSync(caminho);
        logoFinal = null;
      }

      if (logoFile) {
        if (config.logo) {
          const caminho = path.join(
            "public/uploads/anuncios",
            config.logo
          );

          if (fs.existsSync(caminho)) fs.unlinkSync(caminho);
        }

        logoFinal = logoFile.filename;
      }

      /* ==========================
         PROCESSAR FAVICON
      ========================== */
      if (removerFavicon && config.favicon) {
        const caminho = path.join(
          "public/uploads/anuncios",
          config.favicon
        );

        if (fs.existsSync(caminho)) fs.unlinkSync(caminho);
        faviconFinal = null;
      }

      if (faviconFile) {
        if (config.favicon) {
          const caminho = path.join(
            "public/uploads/anuncios",
            config.favicon
          );

          if (fs.existsSync(caminho)) fs.unlinkSync(caminho);
        }

        faviconFinal = faviconFile.filename;
      }

      /* ==========================
         ATUALIZAR BANCO
      ========================== */
      await db.query(`
        UPDATE configuracoes_site
        SET logo = ?, favicon = ?
        WHERE id = ?
      `, [logoFinal, faviconFinal, config.id]);

      res.json({ message: "Configurações atualizadas com sucesso!" });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao salvar configurações" });
    }
  }
);

router.use(async (req, res, next) => {
  try {
    const [[config]] = await db.query(`
      SELECT logo, favicon FROM configuracoes_site
      LIMIT 1
    `);

    res.locals.config = config || {};
  } catch (error) {
    console.error("Erro ao carregar config do site:", error);
    res.locals.config = {};
  }

  next();
});

router.get("/api/servicos-select", async (req, res) => {
  try {
    const [dados] = await db.query(`
      SELECT *
      FROM servicos_select
      ORDER BY ordem ASC
    `);

    res.json(dados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar opções" });
  }
});

router.post("/api/servicos-select", async (req, res) => {
  try {
    const { nome, url, ordem = 0, ativo = true } = req.body;

    await db.query(`
      INSERT INTO servicos_select (nome, url, ordem, ativo)
      VALUES (?, ?, ?, ?)
    `, [nome, url, ordem, ativo]);

    res.json({ message: "Opção criada com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar opção" });
  }
});

router.put("/api/servicos-select/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, url, ordem, ativo } = req.body;

    await db.query(`
      UPDATE servicos_select
      SET nome = ?, url = ?, ordem = ?, ativo = ?
      WHERE id = ?
    `, [nome, url, ordem, ativo, id]);

    res.json({ message: "Opção atualizada com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao atualizar opção" });
  }
});

router.delete("/api/servicos-select/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(`
      DELETE FROM servicos_select
      WHERE id = ?
    `, [id]);

    res.json({ message: "Opção excluída com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao excluir opção" });
  }
});

router.get("/api/servicos-select/ativos", async (req, res) => {
  try {
    const [dados] = await db.query(`
      SELECT nome, url
      FROM servicos_select
      WHERE ativo = true
      ORDER BY ordem ASC
    `);

    res.json(dados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar opções ativas" });
  }
});

/* SEO */
router.get("/api/seo-templates/pagina/:pagina", async (req, res) => {
  try {
    const { pagina } = req.params;

    const [dados] = await db.query(`
      SELECT *
      FROM seo_templates
      WHERE pagina = ?
      ORDER BY id DESC
    `, [pagina]);

    res.json(dados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar SEO da página" });
  }
});

router.post("/api/seo-templates", async (req, res) => {
  try {
    const {
      pagina,
      titulo,
      descricao,
      keywords,
      texto_h1,
      texto_conteudo,
      link_canonico,
      ativo = true
    } = req.body;

    await db.query(`
      INSERT INTO seo_templates
      (pagina, titulo, descricao, keywords, texto_h1, texto_conteudo, link_canonico, ativo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [pagina, titulo, descricao, keywords, texto_h1, texto_conteudo, link_canonico, ativo]);

    res.json({ message: "SEO criado com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar SEO" });
  }
});

router.put("/api/seo-templates/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      titulo,
      descricao,
      keywords,
      texto_h1,
      texto_conteudo,
      link_canonico,
      ativo
    } = req.body;

    await db.query(`
      UPDATE seo_templates
      SET
        titulo = ?,
        descricao = ?,
        keywords = ?,
        texto_h1 = ?,
        texto_conteudo = ?,
        link_canonico = ?,
        ativo = ?
      WHERE id = ?
    `, [titulo, descricao, keywords, texto_h1, texto_conteudo, link_canonico, ativo, id]);

    res.json({ message: "SEO atualizado com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao atualizar SEO" });
  }
});

router.delete("/api/seo-templates/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(`
      DELETE FROM seo_templates
      WHERE id = ?
    `, [id]);

    res.json({ message: "SEO excluído com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao excluir SEO" });
  }
});

router.get("/api/seo-publico/:pagina", async (req, res) => {
  try {
    const { pagina } = req.params;

    const [[seo]] = await db.query(`
      SELECT *
      FROM seo_templates
      WHERE pagina = ?
      AND ativo = true
      LIMIT 1
    `, [pagina]);

    res.json(seo || {});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar SEO" });
  }
});

router.get("/api/seo-dinamico/:pagina", async (req, res) => {
  try {
    const { pagina } = req.params;

    // 1️⃣ pega template SEO
    const [[seo]] = await db.query(`
      SELECT *
      FROM seo_templates
      WHERE pagina = ?
      AND ativo = true
      LIMIT 1
    `, [pagina]);

    if (!seo) {
      return res.json({});
    }

    // 2️⃣ pega dados reais dos anúncios
    const [[anuncio]] = await db.query(`
      SELECT
        a.marca,
        a.versao,
        a.tipo,
        a.condicao,
        u.cidade,
        u.estado,
        u.bairro
      FROM anuncios a
      INNER JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.status = 'ativo'
      ORDER BY a.criado_em DESC
      LIMIT 1
    `);

    // fallback se não houver anúncio
    const dados = anuncio || {
      marca: '',
      versao: '',
      tipo: '',
      cidade: '',
      estado: '',
      condicao: '',
      bairro: ''
    };

    // 3️⃣ função de substituição
    function aplicarPlaceholders(texto) {
      if (!texto) return texto;

      return texto
        .replaceAll('#marca', dados.marca || '')
        .replaceAll('#modelo', dados.versao || '')
        .replaceAll('#veiculo', dados.tipo || '')
        .replaceAll('#cidade', dados.cidade || '')
        .replaceAll('#estado', dados.estado || '')
        .replaceAll('#condicao', dados.condicao || '')
        .replaceAll('#bairro', dados.bairro || '');
    }

    function slugifyPlaceholder(texto) {
      return (texto || '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    function aplicarPlaceholdersUrl(texto) {
      if (!texto) return texto;

      return texto
        .replaceAll('#marca', slugifyPlaceholder(dados.marca))
        .replaceAll('#modelo', slugifyPlaceholder(dados.versao))
        .replaceAll('#veiculo', slugifyPlaceholder(dados.tipo))
        .replaceAll('#cidade', slugifyPlaceholder(dados.cidade))
        .replaceAll('#estado', slugifyPlaceholder(dados.estado))
        .replaceAll('#condicao', slugifyPlaceholder(dados.condicao))
        .replaceAll('#bairro', slugifyPlaceholder(dados.bairro));
    }

    // 4️⃣ aplica substituição
    const seoFinal = {
      titulo: aplicarPlaceholders(seo.titulo),
      descricao: aplicarPlaceholders(seo.descricao),
      keywords: aplicarPlaceholders(seo.keywords),
      texto_h1: aplicarPlaceholders(seo.texto_h1),
      texto_conteudo: aplicarPlaceholders(seo.texto_conteudo),
      link_canonico: aplicarPlaceholdersUrl(seo.link_canonico)
    };

    res.json(seoFinal);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao gerar SEO dinâmico" });
  }
});

/* SEO página de venda */
router.get('/api/seo-anuncio/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [[anuncio]] = await db.query(`
      SELECT
        a.marca,
        a.versao,
        u.cidade,
        u.estado
      FROM anuncios a
      JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.id = ?
      LIMIT 1
    `, [id]);

    if (!anuncio) return res.json({});

    const [[seo]] = await db.query(`
      SELECT *
      FROM seo_templates
      WHERE pagina = 'venda'
      AND ativo = true
      LIMIT 1
    `);

    if (!seo) return res.json({});

    const substituir = (texto) => {
      if (!texto) return '';
      return texto
        .replace(/#marca/g, anuncio.marca || '')
        .replace(/#modelo/g, anuncio.versao || '')
        .replace(/#cidade/g, anuncio.cidade || '')
        .replace(/#estado/g, anuncio.estado || '');
    };

    res.json({
      titulo: substituir(seo.titulo),
      descricao: substituir(seo.descricao),
      keywords: substituir(seo.keywords),
      texto_h1: substituir(seo.texto_h1),
      texto_conteudo: substituir(seo.texto_conteudo),
      link_canonico: substituir(seo.link_canonico)
    });

  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao gerar SEO do anúncio' });
  }
});

/* Quem somos */
// LISTAR blocos
router.get('/api/admin/quem-somos', async (req, res) => {
  try {
    const [blocos] = await db.query(`
      SELECT *
      FROM quem_somos_blocos
      WHERE ativo = true
      ORDER BY ordem ASC, id ASC
    `);

    res.json(blocos);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao buscar blocos' });
  }
});

// CRIAR bloco
router.post('/api/admin/quem-somos', async (req, res) => {
  try {
    const { titulo, subtitulo, texto, ordem } = req.body;

    await db.query(`
      INSERT INTO quem_somos_blocos
      (titulo, subtitulo, texto, ordem)
      VALUES (?, ?, ?, ?)
    `, [titulo, subtitulo, texto, ordem]);

    res.json({ message: 'Bloco criado com sucesso' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao criar bloco' });
  }
});

// EDITAR bloco
router.put('/api/admin/quem-somos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, subtitulo, texto, ordem } = req.body;

    await db.query(`
      UPDATE quem_somos_blocos
      SET titulo = ?, subtitulo = ?, texto = ?, ordem = ?
      WHERE id = ?
    `, [titulo, subtitulo, texto, ordem, id]);

    res.json({ message: 'Bloco atualizado' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao atualizar bloco' });
  }
});

// EXCLUIR bloco (soft delete)
router.delete('/api/admin/quem-somos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(`
      UPDATE quem_somos_blocos
      SET ativo = false
      WHERE id = ?
    `, [id]);

    res.json({ message: 'Bloco removido' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao excluir bloco' });
  }
});

/* Fale conosco */
// LISTAR
router.get('/api/admin/fale-conosco', async (req, res) => {
  try {
    const [dados] = await db.query(`
      SELECT * FROM fale_conosco_blocos
      ORDER BY ordem ASC, id DESC
    `);
    res.json(dados);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao buscar blocos' });
  }
});

// CRIAR
router.post('/api/admin/fale-conosco', async (req, res) => {
  try {
    const { titulo, subtitulo, texto, ordem } = req.body;

    await db.query(`
      INSERT INTO fale_conosco_blocos
      (titulo, subtitulo, texto, ordem)
      VALUES (?, ?, ?, ?)
    `, [titulo || null, subtitulo || null, texto, ordem || 0]);

    res.json({ message: 'Bloco criado' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao criar bloco' });
  }
});

// ATUALIZAR
router.put('/api/admin/fale-conosco/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, subtitulo, texto, ordem } = req.body;

    await db.query(`
      UPDATE fale_conosco_blocos
      SET titulo=?, subtitulo=?, texto=?, ordem=?
      WHERE id=?
    `, [titulo || null, subtitulo || null, texto, ordem || 0, id]);

    res.json({ message: 'Bloco atualizado' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao atualizar bloco' });
  }
});

// EXCLUIR
router.delete('/api/admin/fale-conosco/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM fale_conosco_blocos WHERE id=?`, [req.params.id]);
    res.json({ message: 'Bloco excluído' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao excluir bloco' });
  }
});

/* Regras gerais */
router.get('/api/admin/regras-gerais', async (req, res) => {
  try {
    const [dados] = await db.query(`
      SELECT * FROM regras_gerais_blocos
      ORDER BY ordem ASC, id DESC
    `);
    res.json(dados);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao buscar blocos' });
  }
});

router.post('/api/admin/regras-gerais', async (req, res) => {
  try {
    const { titulo, subtitulo, texto, ordem } = req.body;

    await db.query(`
      INSERT INTO regras_gerais_blocos
      (titulo, subtitulo, texto, ordem)
      VALUES (?, ?, ?, ?)
    `, [titulo || null, subtitulo || null, texto, ordem || 0]);

    res.json({ message: 'Bloco criado' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao criar bloco' });
  }
});

router.put('/api/admin/regras-gerais/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, subtitulo, texto, ordem } = req.body;

    await db.query(`
      UPDATE regras_gerais_blocos
      SET titulo=?, subtitulo=?, texto=?, ordem=?
      WHERE id=?
    `, [titulo || null, subtitulo || null, texto, ordem || 0, id]);

    res.json({ message: 'Bloco atualizado' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao atualizar bloco' });
  }
});

router.delete('/api/admin/regras-gerais/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM regras_gerais_blocos WHERE id=?`, [req.params.id]);
    res.json({ message: 'Bloco excluído' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao excluir bloco' });
  }
});

/* Politicas de privacidade */
router.get('/api/admin/politica-privacidade', async (req, res) => {
  try {
    const [dados] = await db.query(`
      SELECT * FROM politica_privacidade_blocos
      ORDER BY ordem ASC, id DESC
    `);
    res.json(dados);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao buscar blocos' });
  }
});

router.post('/api/admin/politica-privacidade', async (req, res) => {
  try {
    const { titulo, subtitulo, texto, ordem } = req.body;

    await db.query(`
      INSERT INTO politica_privacidade_blocos
      (titulo, subtitulo, texto, ordem)
      VALUES (?, ?, ?, ?)
    `, [titulo || null, subtitulo || null, texto, ordem || 0]);

    res.json({ message: 'Bloco criado' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao criar bloco' });
  }
});

router.put('/api/admin/politica-privacidade/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, subtitulo, texto, ordem } = req.body;

    await db.query(`
      UPDATE politica_privacidade_blocos
      SET titulo=?, subtitulo=?, texto=?, ordem=?
      WHERE id=?
    `, [titulo || null, subtitulo || null, texto, ordem || 0, id]);

    res.json({ message: 'Bloco atualizado' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao atualizar bloco' });
  }
});

router.delete('/api/admin/politica-privacidade/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM politica_privacidade_blocos WHERE id=?`, [req.params.id]);
    res.json({ message: 'Bloco excluído' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao excluir bloco' });
  }
});

/* Termos de uso */
router.get('/api/admin/termos-uso', async (req, res) => {
  try {
    const [dados] = await db.query(`
      SELECT * FROM termos_uso_blocos
      ORDER BY ordem ASC, id DESC
    `);
    res.json(dados);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao buscar blocos' });
  }
});

router.post('/api/admin/termos-uso', async (req, res) => {
  try {
    const { titulo, subtitulo, texto, ordem } = req.body;

    await db.query(`
      INSERT INTO termos_uso_blocos
      (titulo, subtitulo, texto, ordem)
      VALUES (?, ?, ?, ?)
    `, [titulo || null, subtitulo || null, texto, ordem || 0]);

    res.json({ message: 'Bloco criado' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao criar bloco' });
  }
});

router.put('/api/admin/termos-uso/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, subtitulo, texto, ordem } = req.body;

    await db.query(`
      UPDATE termos_uso_blocos
      SET titulo=?, subtitulo=?, texto=?, ordem=?
      WHERE id=?
    `, [titulo || null, subtitulo || null, texto, ordem || 0, id]);

    res.json({ message: 'Bloco atualizado' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao atualizar bloco' });
  }
});

router.delete('/api/admin/termos-uso/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM termos_uso_blocos WHERE id=?`, [req.params.id]);
    res.json({ message: 'Bloco excluído' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao excluir bloco' });
  }
});

/* Perfil admin */
router.put('/api/admin/usuario', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email é obrigatório' });
    }

    // se NÃO alterou senha
    if (!senha) {
      await db.query(`
        UPDATE usuarios
        SET email = ?
        WHERE nome = 'admin'
      `, [email]);

      return res.json({ message: 'Email atualizado com sucesso' });
    }

    // se alterou senha
    const senhaHash = await bcrypt.hash(senha, 10);

    await db.query(`
      UPDATE usuarios
      SET email = ?, senha = ?
      WHERE nome = 'admin'
    `, [email, senhaHash]);

    res.json({ message: 'Dados atualizados com sucesso' });

  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao atualizar dados' });
  }
});

router.get('/api/admin/usuario', async (req, res) => {
  try {
    const [[admin]] = await db.query(`
      SELECT email FROM usuarios
      WHERE nome = 'admin'
      LIMIT 1
    `);

    res.json(admin || {});
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao buscar admin' });
  }
});

/* Localizações cadastradas */
router.get('/api/usuarios/localidades', async (req, res) => {
  try {

    const [localidades] = await db.query(`
      SELECT DISTINCT
        cidade,
        estado
      FROM usuarios
      WHERE cidade IS NOT NULL
        AND estado IS NOT NULL
      ORDER BY estado ASC, cidade ASC
    `);

    return res.json({
      total: localidades.length,
      localidades
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno' });
  }
});

/* Imagens por regiões */
router.get("/api/admin/regioes/imagens", async (req, res) => {
  try {
    const { cidade } = req.query;

    if (!cidade) {
      return res.status(400).json({ message: "Cidade é obrigatória" });
    }

    await garantirColunasRegioesImagens();

    const [imagens] = await db.query(`
      SELECT *
      FROM regioes_imagens
      WHERE cidade = ?
      ORDER BY id ASC
    `, [cidade]);

    res.json(imagens);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar imagens" });
  }
});

router.post(
  "/api/admin/regioes/imagens",
  upload.fields([
    { name: "imagens", maxCount: 10 },
    { name: "imagensMobile", maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const { cidade } = req.body;

      if (!cidade) {
        return res.status(400).json({ message: "Cidade é obrigatória" });
      }

      let fileIndex = 0;
      let fileMobileIndex = 0;
      const listaIds = obterListaCampo(req.body, "ids");
      const listaTemImagem = obterListaCampo(req.body, "temImagem");
      const listaTemImagemMobile = obterListaCampo(req.body, "temImagemMobile");
      const listaLinks = obterListaCampo(req.body, "links");
      const imagensDesktop = req.files?.imagens || [];
      const imagensMobile = req.files?.imagensMobile || [];

      await garantirColunasRegioesImagens();

      for (let i = 0; i < listaIds.length; i++) {
        const id = listaIds[i];
        const possuiNovaImagem = listaTemImagem[i] === "true";
        const possuiNovaImagemMobile = listaTemImagemMobile[i] === "true";
        const novaImagem = possuiNovaImagem ? imagensDesktop[fileIndex++] : null;
        const novaImagemMobile = possuiNovaImagemMobile ? imagensMobile[fileMobileIndex++] : null;
        const link = String(listaLinks[i] || "").trim() || null;

        /* ==========================
           ATUALIZAR EXISTENTE
        ========================== */
        if (id) {
          let imagemFinal = null;
          let imagemMobileFinal = null;

          const [[imgAtual]] = (novaImagem || novaImagemMobile)
            ? await db.query(
              "SELECT imagem, imagem_mobile FROM regioes_imagens WHERE id = ?",
              [id]
            )
            : [[]];

          if (novaImagem) {
            if (imgAtual?.imagem) {
              const caminho = path.join(
                "public/uploads/anuncios",
                imgAtual.imagem
              );

              if (fs.existsSync(caminho)) {
                fs.unlinkSync(caminho);
              }
            }

            imagemFinal = novaImagem.filename;
          }

          if (novaImagemMobile) {
            if (imgAtual?.imagem_mobile) {
              const caminho = path.join(
                "public/uploads/anuncios",
                imgAtual.imagem_mobile
              );

              if (fs.existsSync(caminho)) {
                fs.unlinkSync(caminho);
              }
            }

            imagemMobileFinal = novaImagemMobile.filename;
          }

          await db.query(
            `
            UPDATE regioes_imagens
            SET imagem = COALESCE(?, imagem),
                imagem_mobile = COALESCE(?, imagem_mobile),
                link = ?
            WHERE id = ?
            `,
            [imagemFinal, imagemMobileFinal, link, id]
          );

        /* ==========================
           NOVA IMAGEM
        ========================== */
        } else {
          if (!novaImagem) continue;

          await db.query(
            `
            INSERT INTO regioes_imagens (cidade, imagem, imagem_mobile, link)
            VALUES (?, ?, ?, ?)
            `,
            [cidade, novaImagem.filename, novaImagemMobile?.filename || null, link]
          );
        }
      }

      res.json({ message: "Imagens salvas com sucesso!" });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao salvar imagens" });
    }
  }
);

router.delete("/api/admin/regioes/imagens/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await garantirColunasRegioesImagens();

    const [[imagem]] = await db.query(
      "SELECT imagem, imagem_mobile FROM regioes_imagens WHERE id = ?",
      [id]
    );

    if (!imagem) {
      return res.status(404).json({ message: "Imagem não encontrada" });
    }

    if (imagem.imagem) {
      const caminho = path.join(
        "public/uploads/anuncios",
        imagem.imagem
      );

      if (fs.existsSync(caminho)) {
        fs.unlinkSync(caminho);
      }
    }

    if (imagem.imagem_mobile) {
      const caminhoMobile = path.join(
        "public/uploads/anuncios",
        imagem.imagem_mobile
      );

      if (fs.existsSync(caminhoMobile)) {
        fs.unlinkSync(caminhoMobile);
      }
    }

    await db.query("DELETE FROM regioes_imagens WHERE id = ?", [id]);

    res.json({ message: "Imagem excluída com sucesso!" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao excluir imagem" });
  }
});

/* Cidades */
router.get("/api/cidades", async (req, res) => {
  try {
    await garantirColunaImagemMobileCidades();

    const [cidades] = await db.query(`
      SELECT 
        id,
        nome,
        estado,
        descricao,
        imagem,
        imagem_mobile
      FROM cidades
      ORDER BY nome ASC
    `);

    return res.json(cidades);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro interno" });
  }
});

router.post(
  "/api/cidades",
  upload.fields([
    { name: "imagem", maxCount: 1 },
    { name: "imagem_mobile", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { nome, estado, descricao } = req.body;

      if (!nome || !estado) {
        return res.status(400).json({ message: "Nome e estado são obrigatórios" });
      }

      await garantirColunaImagemMobileCidades();

      const imagem = req.files?.imagem?.[0] ? `/uploads/anuncios/${req.files.imagem[0].filename}` : null;
      const imagemMobile = req.files?.imagem_mobile?.[0] ? `/uploads/anuncios/${req.files.imagem_mobile[0].filename}` : null;

      const [result] = await db.query(`
        INSERT INTO cidades (nome, estado, descricao, imagem, imagem_mobile)
        VALUES (?, ?, ?, ?, ?)
      `, [nome, estado, descricao, imagem, imagemMobile]);

      return res.json({
        id: result.insertId,
        message: "Cidade cadastrada com sucesso"
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erro interno" });
    }
  }
);

router.put(
  "/api/cidades/:id",
  upload.fields([
    { name: "imagem", maxCount: 1 },
    { name: "imagem_mobile", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, estado, descricao } = req.body;

      await garantirColunaImagemMobileCidades();

      // busca imagem antiga
      const [[cidade]] = await db.query(`
        SELECT imagem, imagem_mobile FROM cidades WHERE id = ?
      `, [id]);

      let novaImagem = cidade?.imagem;
      let novaImagemMobile = cidade?.imagem_mobile;

      if (req.files?.imagem?.[0]) {
        novaImagem = `/uploads/anuncios/${req.files.imagem[0].filename}`;

        // remove imagem antiga
        if (cidade?.imagem) {
          const caminho = path.join("public", cidade.imagem);
          if (fs.existsSync(caminho)) {
            fs.unlinkSync(caminho);
          }
        }
      }

      if (req.files?.imagem_mobile?.[0]) {
        novaImagemMobile = `/uploads/anuncios/${req.files.imagem_mobile[0].filename}`;

        if (cidade?.imagem_mobile) {
          const caminho = path.join("public", cidade.imagem_mobile);
          if (fs.existsSync(caminho)) {
            fs.unlinkSync(caminho);
          }
        }
      }

      await db.query(`
        UPDATE cidades
        SET 
          nome = ?,
          estado = ?,
          descricao = ?,
          imagem = ?,
          imagem_mobile = ?
        WHERE id = ?
      `, [nome, estado, descricao, novaImagem, novaImagemMobile, id]);

      return res.json({ message: "Cidade atualizada com sucesso" });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erro interno" });
    }
  }
);

router.delete("/api/cidades/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await garantirColunaImagemMobileCidades();

    const [[cidade]] = await db.query(`
      SELECT imagem, imagem_mobile FROM cidades WHERE id = ?
    `, [id]);

    if (cidade?.imagem) {
      const caminho = path.join("public", cidade.imagem);
      if (fs.existsSync(caminho)) {
        fs.unlinkSync(caminho);
      }
    }

    if (cidade?.imagem_mobile) {
      const caminho = path.join("public", cidade.imagem_mobile);
      if (fs.existsSync(caminho)) {
        fs.unlinkSync(caminho);
      }
    }

    await db.query(`DELETE FROM cidades WHERE id = ?`, [id]);

    return res.json({ message: "Cidade excluída com sucesso" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro interno" });
  }
});


// =========================================================
// CIDADES EXTRAS POR ANÚNCIO
// =========================================================

router.get("/api/admin/anuncios/:id/cidades", checkAuth('private'), async (req, res) => {
  try {
    const [cidades] = await db.query(
      "SELECT * FROM anuncios_cidades WHERE anuncio_id = ? ORDER BY cidade",
      [req.params.id]
    );
    res.json(cidades);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro interno" });
  }
});

router.post("/api/admin/anuncios/:id/cidades", checkAuth('private'), async (req, res) => {
  try {
    const { cidade, estado } = req.body;
    if (!cidade || !estado) return res.status(400).json({ message: "Cidade e estado são obrigatórios" });

    await db.query(
      "INSERT INTO anuncios_cidades (anuncio_id, cidade, estado) VALUES (?, ?, ?)",
      [req.params.id, cidade, estado.toUpperCase()]
    );
    res.json({ message: "Cidade adicionada" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro interno" });
  }
});

router.delete("/api/admin/anuncios-cidades/:id", checkAuth('private'), async (req, res) => {
  try {
    await db.query("DELETE FROM anuncios_cidades WHERE id = ?", [req.params.id]);
    res.json({ message: "Cidade removida" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro interno" });
  }
});

// =========================================================
// CRUD BANNERS
// =========================================================

const multer = require("multer");
const uploadBanner = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, "public/uploads/banners"),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `banner-${Date.now()}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype.startsWith("image/"));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadCapaUsuario = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = "public/uploads/logos";
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype.startsWith("image/"));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.get("/api/admin/usuarios/:id/capa", checkAuth('private'), async (req, res) => {
  try {
    const [[usuario]] = await db.query(
      "SELECT id, tipo FROM usuarios WHERE id = ? AND id > 1 LIMIT 1",
      [req.params.id]
    );

    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    if (usuario.tipo !== "revenda") {
      return res.status(400).json({ message: "Imagem de capa disponível apenas para revendas." });
    }

    const [[logo]] = await db.query(
      "SELECT logo FROM revendas_logos WHERE usuario_id = ? LIMIT 1",
      [req.params.id]
    );

    res.json({ capa: logo?.logo || "/icones/logo_pad_revenda.jpg" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro interno" });
  }
});

router.put("/api/admin/usuarios/:id/capa", checkAuth('private'), uploadCapaUsuario.single("capa"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Envie uma imagem." });
    }

    const [[usuario]] = await db.query(
      "SELECT id, tipo FROM usuarios WHERE id = ? AND id > 1 LIMIT 1",
      [req.params.id]
    );

    if (!usuario) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    if (usuario.tipo !== "revenda") {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Imagem de capa disponível apenas para revendas." });
    }

    const capaPath = `/uploads/logos/${req.file.filename}`;
    const [[capaAtual]] = await db.query(
      "SELECT logo FROM revendas_logos WHERE usuario_id = ? LIMIT 1",
      [req.params.id]
    );

    if (capaAtual?.logo && !capaAtual.logo.includes("logo_pad_revenda.jpg")) {
      const caminhoAntigo = path.join("public", capaAtual.logo);
      if (fs.existsSync(caminhoAntigo)) fs.unlinkSync(caminhoAntigo);
    }

    if (capaAtual) {
      await db.query(
        "UPDATE revendas_logos SET logo = ? WHERE usuario_id = ?",
        [capaPath, req.params.id]
      );
    } else {
      await db.query(
        "INSERT INTO revendas_logos (usuario_id, logo) VALUES (?, ?)",
        [req.params.id, capaPath]
      );
    }

    res.json({ message: "Imagem de capa atualizada.", capa: capaPath });
  } catch (e) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error(e);
    res.status(500).json({ message: "Erro interno" });
  }
});

router.get("/api/admin/banners", checkAuth('private'), async (req, res) => {
  try {
    const [banners] = await db.query("SELECT * FROM banners ORDER BY ordem ASC, id DESC");
    res.json(banners);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro interno" });
  }
});

router.post("/api/admin/banners", checkAuth('private'), uploadBanner.single("imagem"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Envie uma imagem" });

    const { titulo, link, ordem } = req.body;
    await db.query(
      "INSERT INTO banners (titulo, imagem, link, ordem, ativo) VALUES (?, ?, ?, ?, true)",
      [titulo || '', req.file.filename, link || '', ordem || 0]
    );
    res.json({ message: "Banner criado" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro interno" });
  }
});

router.put("/api/admin/banners/:id", checkAuth('private'), async (req, res) => {
  try {
    const { titulo, link, ordem, ativo } = req.body;
    await db.query(
      "UPDATE banners SET titulo = ?, link = ?, ordem = ?, ativo = ? WHERE id = ?",
      [titulo, link, ordem || 0, ativo !== undefined ? ativo : true, req.params.id]
    );
    res.json({ message: "Banner atualizado" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro interno" });
  }
});

router.delete("/api/admin/banners/:id", checkAuth('private'), async (req, res) => {
  try {
    const [[banner]] = await db.query("SELECT imagem FROM banners WHERE id = ?", [req.params.id]);
    if (banner) {
      const filePath = path.join(__dirname, "../../../public/uploads/banners", banner.imagem);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.query("DELETE FROM banners WHERE id = ?", [req.params.id]);
    res.json({ message: "Banner excluído" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro interno" });
  }
});

module.exports = router;
