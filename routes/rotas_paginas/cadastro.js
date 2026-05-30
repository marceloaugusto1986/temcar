const express = require('express');
const db = require('../../database/pool_connection');
const bcrypt = require('bcryptjs');
const { getSeo } = require('../../helpers/seo');
const router = express.Router();

async function garantirTabelaCidadesRevendas(conn = db) {
  await conn.query(`
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

// cadastro.ejs não existe; redireciona para criar-conta
router.get('/cadastro', (req, res) => {
  res.redirect(301, '/criar-conta');
});

router.get('/api/permissao-atual', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT status_acesso FROM permissoes_paginas WHERE id = 1 LIMIT 1
    `);

    if (!rows.length) {
      return res.status(404).json({ message: 'Permissão não encontrada.' });
    }

    res.json({ status_acesso: rows[0].status_acesso });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: 'Erro ao buscar permissão.' });
  }
});

router.post('/api/page-access', async (req, res) => {
  try {
    const { opcaoDePermissao } = req.body;

    if (!['public', 'private'].includes(opcaoDePermissao)) {
      return res.status(400).json({ message: 'Valor inválido para permissão.' });
    }

    await db.query(`
      UPDATE permissoes_paginas 
      SET status_acesso = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = 1
    `, [opcaoDePermissao]);

    return res.status(200).json({ message: "Permissão atualizada com sucesso." });

  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ message: "Erro no servidor." });
  }
});

router.post('/api/usuarios', async (req, res) => {
  try {
    const {
      tipo,
      nome,
      email,
      whatsapp,
      senha,

      // Particular
      cpf,
      plano_desejado,

      // Revenda
      telefone,
      cnpj,
      cep,
      rua,
      numero,
      bairro,
      cidade,
      estado,
      cidadesAtendimento = []
    } = req.body;

    // 🔹 Validação básica
    if (!tipo || !nome || !email || !whatsapp || !senha) {
      return res.status(400).json({
        message: 'Campos obrigatórios não informados.'
      });
    }

    if (!['particular', 'revenda'].includes(tipo)) {
      return res.status(400).json({
        message: 'Tipo de usuário inválido.'
      });
    }

    // 🔹 Validações específicas
    if (tipo === 'particular') {
      if (!cpf || !plano_desejado) {
        return res.status(400).json({
          message: 'Dados obrigatórios do cadastro particular ausentes.'
        });
      }
    }

    if (tipo === 'revenda') {
      if (!cnpj || !cep || !rua || !numero || !bairro || !cidade || !estado) {
        return res.status(400).json({
          message: 'Dados obrigatórios do cadastro de revenda ausentes.'
        });
      }
    }

    // 🔹 Verifica e-mail duplicado
    const [userExists] = await db.query(
      'SELECT id FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );

    if (userExists.length > 0) {
      return res.status(400).json({
        message: 'Este e-mail já está cadastrado.'
      });
    }

    const cidadesAtendimentoValidas = Array.isArray(cidadesAtendimento)
      ? cidadesAtendimento
        .map(item => ({
          cidade: String(item?.nome || item?.cidade || '').trim(),
          estado: String(item?.estado || '').trim().toUpperCase()
        }))
        .filter(item => item.cidade && /^[A-Z]{2}$/.test(item.estado))
      : [];

    // 🔹 Criptografa senha
    const senhaHash = await bcrypt.hash(senha, 10);

    await garantirTabelaCidadesRevendas();

    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      // 🔹 Insere no banco
      const [resultado] = await conn.query(
        `
        INSERT INTO usuarios (
          tipo,
          nome,
          email,
          whatsapp,
          senha,

          cpf,
          plano_desejado,

          telefone,
          cnpj,
          cep,
          rua,
          numero,
          bairro,
          cidade,
          estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          tipo,
          nome,
          email,
          whatsapp,
          senhaHash,

          tipo === 'particular' ? cpf : null,
          tipo === 'particular' ? plano_desejado : null,

          tipo === 'revenda' ? telefone : null,
          tipo === 'revenda' ? cnpj : null,

          cep,
          rua,
          numero,
          bairro,
          cidade,
          estado
        ]
      );

      if (tipo === 'revenda' && cidadesAtendimentoValidas.length) {
        const valores = cidadesAtendimentoValidas.map(item => [
          resultado.insertId,
          item.cidade,
          item.estado
        ]);

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

    return res.status(201).json({
      message: 'Cadastro realizado com sucesso.',
      redirectUrl: '/login'
    });

  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);
    return res.status(500).json({
      message: 'Erro interno do servidor.'
    });
  }
});


module.exports = router;
