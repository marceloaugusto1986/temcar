const express = require('express');
const db = require('../../database/pool_connection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { getSeo } = require('../../helpers/seo');
require('dotenv').config();

const { JWT_SECRET } = process.env;

const rotaInicialAdmin = "/admin/home";
const rotaInicialPainel = "/painel/home";

router.get('/login', async (req, res) => {
  if (req.session.token) {
    try {
      const decoded = jwt.verify(req.session.token, JWT_SECRET);
      if (decoded.id === 1) {
        return res.redirect(`${rotaInicialAdmin}`);
      } else {
        return res.redirect(`${rotaInicialPainel}`);
      }
    } catch (error) {
      console.error(error);
      req.session.destroy();
    }
  }
  const seo = await getSeo('login');
  res.render('login', { seo });
});

router.post('/login/autenticar', async (req, res) => {
  try {
    const { userEmailLogin, senhaLogin } = req.body;

    const [usuarios] = await db.query('SELECT * FROM usuarios WHERE email = ?', [userEmailLogin]);
    if (usuarios.length > 0) {
      const usuario = usuarios[0];

      const isMatch = await bcrypt.compare(senhaLogin, usuario.senha);
      if (isMatch) {
        const token = jwt.sign({ id: usuario.id, email: usuario.email }, JWT_SECRET); //, { expiresIn: '1h' });

        // 🔥 Salvar usuário na sessão
        req.session.token = token;
        req.session.usuario = { id: usuario.id, nome: usuario.nome, email: usuario.email };

        return res.status(200).json({ 
          token, 
          message: "Autenticado com sucesso.", 
          redirectUrl: usuario.id === 1 ? `${rotaInicialAdmin}` : `${rotaInicialPainel}` 
        });
      } else {
        return res.status(401).json({ message: "Senha incorreta." });
      }
    } else {
      return res.status(401).json({ message: "Usuário não cadastrado, ou email incorreto." });
    }
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ message: "Erro no servidor." });
  }
});

router.get('/api/get/usuario/sessao', (req, res) => {
  //console.log("Sessão Atual:", req.session); // 🔥 Depuração: Verifique se a sessão contém "usuario"
  
  if (!req.session.usuario) {
      return res.status(401).json({ erro: "Usuário não autenticado" });
  }
  
  res.json(req.session.usuario);
});

module.exports = router;