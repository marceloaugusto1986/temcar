const express = require('express');
const router = express.Router();
require('dotenv').config();
const db = require("../../../database/pool_connection");
const bcrypt = require('bcryptjs');
// backend/api/revendasLogo.js
const path = require('path');
const fs = require('fs');
const multer = require("multer");
const converterWebp = require("../../../middlewares/converterWebp");

router.get('/api/get/usuario/sessao', (req, res) => {
  if (!req.session.usuario) {
    return res.status(401).json({ erro: "Usuário não autenticado" });
  }
  res.json(req.session.usuario);
});

router.get('/api/perfil-anunciante/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validação básica do ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        erro: 'ID inválido'
      });
    }

    const [usuarios] = await db.query(`
      SELECT
        id,
        nome,
        email,
        whatsapp,
        tipo,

        -- Dados revenda
        telefone,
        cnpj,
        cep,
        rua,
        numero,
        bairro,
        cidade,
        estado,

        -- Dados particular
        cpf,
        plano_desejado,
        plano_id,

        criado_em
      FROM usuarios
      WHERE id = ?
      LIMIT 1
    `, [id]);

    if (usuarios.length === 0) {
      return res.status(404).json({
        erro: 'Usuário não encontrado'
      });
    }

    await garantirTabelaCidadesRevendas();

    const [cidadesAtendimento] = await db.query(
      `
      SELECT bairro, cidade, estado
      FROM revendas_cidades
      WHERE usuario_id = ?
      ORDER BY cidade ASC, bairro ASC, estado ASC
      `,
      [id]
    );

    usuarios[0].cidades_atendimento = cidadesAtendimento;

    return res.status(200).json({
      usuario: usuarios[0]
    });

  } catch (err) {
    console.error('Erro ao buscar usuário pelo ID:', err);
    return res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
});

router.put('/api/alterar-senha-anunciante/:id/senha', async (req, res) => {
  try {
    const { id } = req.params;

    // Validação básica do ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        erro: 'ID inválido'
      });
    }

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

router.put('/api/editar-perfil-anunciante/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validação básica do ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        erro: 'ID inválido'
      });
    }

    const {
      nome,
      email,
      whatsapp,

      telefone,
      cnpj,
      cep,
      rua,
      numero,
      bairro,
      cidade,
      estado,

      cpf,
      plano,
      cidadesAtendimento = []
    } = req.body;

    // Validação mínima (ajuste conforme sua regra de negócio)
    if (!nome || !email) {
      return res.status(400).json({
        erro: 'Nome e e-mail são obrigatórios'
      });
    }

    const cidadesAtendimentoValidas = Array.isArray(cidadesAtendimento)
      ? cidadesAtendimento
        .map(item => ({
          bairro: String(item?.bairro || '').trim(),
          cidade: String(item?.nome || item?.cidade || '').trim(),
          estado: String(item?.estado || '').trim().toUpperCase()
        }))
        .filter(item => item.cidade && /^[A-Z]{2}$/.test(item.estado))
        .slice(0, 3)
      : [];

    await garantirTabelaCidadesRevendas();

    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      const [resultado] = await conn.query(
        `
        UPDATE usuarios
        SET
          nome = ?,
          email = ?,
          whatsapp = ?,

          telefone = ?,
          cnpj = ?,
          cep = ?,
          rua = ?,
          numero = ?,
          bairro = ?,
          cidade = ?,
          estado = ?,

          cpf = ?,
          plano_desejado = ?
        WHERE id = ?
        `,
        [
          nome,
          email,
          whatsapp,

          telefone,
          cnpj,
          cep,
          rua,
          numero,
          bairro,
          cidade,
          estado,

          cpf,
          plano,
          id
        ]
      );

      if (resultado.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({
          erro: 'Usuário não encontrado'
        });
      }

      // Cidades de atuação valem para qualquer tipo de anunciante (revenda ou particular)
      await conn.query('DELETE FROM revendas_cidades WHERE usuario_id = ?', [id]);

      if (cidadesAtendimentoValidas.length) {
        const valores = cidadesAtendimentoValidas.map(item => [
          id,
          item.bairro,
          item.cidade,
          item.estado
        ]);

        await conn.query(
          'INSERT IGNORE INTO revendas_cidades (usuario_id, bairro, cidade, estado) VALUES ?',
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

    return res.status(200).json({
      mensagem: 'Perfil atualizado com sucesso'
    });

  } catch (err) {
    console.error('Erro ao editar perfil do anunciante:', err);
    return res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
});

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "public/uploads/logos";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const nome = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, nome);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Arquivo inválido. Apenas imagens."));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

async function garantirTabelaCidadesRevendas(conn = db) {
  await conn.query(`
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

  const [colunas] = await conn.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'revendas_cidades'
      AND COLUMN_NAME = 'bairro'
  `);

  if (!colunas.length) {
    await conn.query(`
      ALTER TABLE revendas_cidades
      ADD COLUMN bairro VARCHAR(150) NOT NULL DEFAULT '' AFTER usuario_id
    `);
  }

  const [indices] = await conn.query(`
    SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS colunas
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'revendas_cidades'
      AND INDEX_NAME = 'uniq_revenda_cidade'
    GROUP BY INDEX_NAME
  `);

  if (indices[0]?.colunas !== 'usuario_id,bairro,cidade,estado') {
    await conn.query(`
      ALTER TABLE revendas_cidades
      ADD INDEX idx_revendas_cidades_usuario (usuario_id)
    `).catch(error => {
      if (error.code !== 'ER_DUP_KEYNAME') throw error;
    });

    if (indices.length) {
      await conn.query('ALTER TABLE revendas_cidades DROP INDEX uniq_revenda_cidade');
    }
    await conn.query(`
      ALTER TABLE revendas_cidades
      ADD UNIQUE KEY uniq_revenda_cidade (usuario_id, bairro, cidade, estado)
    `);
  }
}

// -----------------------
// GET: Buscar logo
// -----------------------
router.get("/api/revenda/logo/:usuarioId", async (req, res) => {
  try {
    const { usuarioId } = req.params;

    const [rows] = await db.query(
      "SELECT logo FROM revendas_logos WHERE usuario_id = ?",
      [usuarioId]
    );

    const logo = rows[0]?.logo || null;
    res.json({ logo: logo && !logo.includes("logo_pad_revenda.jpg") ? logo : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar logo." });
  }
});

// -----------------------
// POST: Criar logo (primeira vez)
// -----------------------
router.post("/api/revenda/logo/:usuarioId", upload.single("logo"), converterWebp, async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "Selecione uma imagem." });

    const logoPath = `/uploads/logos/${file.filename}`;

    const [rows] = await db.query(
      "SELECT * FROM revendas_logos WHERE usuario_id = ?",
      [usuarioId]
    );

    if (rows.length > 0) return res.status(400).json({ error: "Usuário já possui uma logo." });

    await db.query(
      "INSERT INTO revendas_logos (usuario_id, logo) VALUES (?, ?)",
      [usuarioId, logoPath]
    );

    res.json({ logo: logoPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar logo." });
  }
});

// -----------------------
// PUT: Atualizar logo
// -----------------------
router.put("/api/revenda/logo/:usuarioId", upload.single("logo"), converterWebp, async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Selecione uma imagem." });

    const logoPath = `/uploads/logos/${file.filename}`;

    // Busca logo antiga
    const [rows] = await db.query(
      "SELECT logo FROM revendas_logos WHERE usuario_id = ?",
      [usuarioId]
    );

    if (rows.length === 0) {
      // Se não tiver, insere
      await db.query(
        "INSERT INTO revendas_logos (usuario_id, logo) VALUES (?, ?)",
        [usuarioId, logoPath]
      );
    } else {
      const logoAntiga = rows[0].logo;
      if (logoAntiga && !logoAntiga.includes("logo_pad_revenda.jpg")) {
        const caminhoAntigo = path.join("public", logoAntiga);
        if (fs.existsSync(caminhoAntigo)) fs.unlinkSync(caminhoAntigo);
      }

      await db.query(
        "UPDATE revendas_logos SET logo = ? WHERE usuario_id = ?",
        [logoPath, usuarioId]
      );
    }

    res.json({ logo: logoPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar logo." });
  }
});

// -----------------------
// DELETE: Excluir logo
// -----------------------
router.delete("/api/revenda/logo/:usuarioId", async (req, res) => {
  try {
    const { usuarioId } = req.params;

    const [rows] = await db.query(
      "SELECT logo FROM revendas_logos WHERE usuario_id = ?",
      [usuarioId]
    );

    if (rows.length === 0) return res.status(400).json({ error: "Nenhuma logo para excluir." });

    const logoAtual = rows[0].logo;
    if (logoAtual && !logoAtual.includes("logo_pad_revenda.jpg")) {
      const caminho = path.join("public", logoAtual);
      if (fs.existsSync(caminho)) fs.unlinkSync(caminho);
    }

    await db.query("DELETE FROM revendas_logos WHERE usuario_id = ?", [usuarioId]);

    res.json({ message: "Logo excluída com sucesso.", logo: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao excluir logo." });
  }
});

module.exports = router;
