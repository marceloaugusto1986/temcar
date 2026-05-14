const express = require('express');
const router = express.Router();
const db = require('./../../database/pool_connection');
const { getSeoAnuncio, getSeo } = require('../../helpers/seo');

router.get('/venda', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const id = req.query.id;
  const seo = id ? await getSeoAnuncio(id) : await getSeo('venda');
  const breadcrumbs = [
    { name: 'Home', url: 'https://www.temcar.com.br/' },
    { name: 'Veículo', url: `https://www.temcar.com.br/venda?id=${id || ''}` }
  ];
  res.render('venda', { seo, breadcrumbs });
});

router.get("/api/venda-contexto", (req, res) => {
  const usuario = req.session?.usuario;

  // 👤 Não logado
  if (!usuario) {
    return res.json({ context: "public" });
  }

  // 👑 Admin
  if (usuario.id === 1) {
    return res.json({ context: "admin" });
  }

  // 🧑‍💼 Usuário logado comum / anunciante
  return res.json({ context: "painel" });
});

router.get('/api/public/anuncios/:id', async (req, res) => {
 try {
    const anuncioId = req.params.id;
    const usuarioId = req.session.usuario.id;

    const [[anuncio]] = await db.query(`
      SELECT
        a.*,
        a.usuario_id,
        u.nome,
        u.email,
        u.whatsapp,
        u.telefone,
        u.cnpj,
        u.cpf,
        u.cep,
        u.rua,
        u.numero,
        u.bairro,
        u.cidade,
        u.estado,
        u.tipo
      FROM anuncios a
      INNER JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.id = ?
        AND a.usuario_id = ?
      LIMIT 1
    `, [anuncioId, usuarioId]);

    if (!anuncio) {
      return res.status(404).json({ message: 'Anúncio não encontrado' });
    }

    const [imagens] = await db.query(`
      SELECT imagem, principal
      FROM anuncios_imagens
      WHERE anuncio_id = ?
      ORDER BY principal DESC, id ASC
    `, [anuncioId]);

    anuncio.imagens = imagens;

    return res.json({
      anuncio,
      anunciante: {
        id: anuncio.usuario_id,
        nome: anuncio.nome,
        email: anuncio.email,
        whatsapp: anuncio.whatsapp,
        telefone: anuncio.telefone,
        cpf: anuncio.cpf,
        cnpj: anuncio.cnpj,
        tipo: anuncio.tipo,
        plano: anuncio.plano_desejado,
        endereco: {
          cep: anuncio.cep,
          rua: anuncio.rua,
          numero: anuncio.numero,
          bairro: anuncio.bairro,
          cidade: anuncio.cidade,
          estado: anuncio.estado
        }
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno' });
  }
});

router.get('/api/painel/anuncios/:id', async (req, res) => {
  try {
    const anuncioId = req.params.id;
    const usuarioId = req.session.usuario.id;

    const [[anuncio]] = await db.query(`
      SELECT
        a.*,
        a.usuario_id,
        u.nome,
        u.email,
        u.whatsapp,
        u.telefone,
        u.cnpj,
        u.cpf,
        u.cep,
        u.rua,
        u.numero,
        u.bairro,
        u.cidade,
        u.estado,
        u.tipo
      FROM anuncios a
      INNER JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.id = ?
        AND a.usuario_id = ?
      LIMIT 1
    `, [anuncioId, usuarioId]);

    if (!anuncio) {
      return res.status(404).json({ message: 'Anúncio não encontrado' });
    }

    const [imagens] = await db.query(`
      SELECT imagem, principal
      FROM anuncios_imagens
      WHERE anuncio_id = ?
      ORDER BY principal DESC, id ASC
    `, [anuncioId]);

    anuncio.imagens = imagens;

    return res.json({
      anuncio,
      anunciante: {
        id: anuncio.usuario_id,
        nome: anuncio.nome,
        email: anuncio.email,
        whatsapp: anuncio.whatsapp,
        telefone: anuncio.telefone,
        cpf: anuncio.cpf,
        cnpj: anuncio.cnpj,
        tipo: anuncio.tipo,
        plano: anuncio.plano_desejado,
        endereco: {
          cep: anuncio.cep,
          rua: anuncio.rua,
          numero: anuncio.numero,
          bairro: anuncio.bairro,
          cidade: anuncio.cidade,
          estado: anuncio.estado
        }
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno' });
  }
});

router.get('/api/anuncios-admin/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [[anuncio]] = await db.query(`
      SELECT
        a.*,
        a.usuario_id,
        u.nome,
        u.email,
        u.whatsapp,
        u.telefone,
        u.cnpj,
        u.cpf,
        u.cep,
        u.rua,
        u.numero,
        u.bairro,
        u.cidade,
        u.estado,
        u.tipo,
        u.plano_desejado
      FROM anuncios a
      INNER JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.id = ?
      LIMIT 1
    `, [id]);

    if (!anuncio) {
      return res.status(404).json({ message: 'Anúncio não encontrado' });
    }

    const [imagens] = await db.query(`
      SELECT imagem, principal
      FROM anuncios_imagens
      WHERE anuncio_id = ?
      ORDER BY principal DESC, id ASC
    `, [id]);

    anuncio.imagens = imagens;

    return res.json({
      anuncio,
      anunciante: {
        id: anuncio.usuario_id,
        nome: anuncio.nome,
        email: anuncio.email,
        whatsapp: anuncio.whatsapp,
        telefone: anuncio.telefone,
        cpf: anuncio.cpf,
        cnpj: anuncio.cnpj,
        tipo: anuncio.tipo,
        plano: anuncio.plano_desejado,
        endereco: {
          cep: anuncio.cep,
          rua: anuncio.rua,
          numero: anuncio.numero,
          bairro: anuncio.bairro,
          cidade: anuncio.cidade,
          estado: anuncio.estado
        }
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno' });
  }
});

module.exports = router;