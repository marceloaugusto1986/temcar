const express = require('express');
const router = express.Router();
const checkAuth = require('../../../middlewares/authMiddleware');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;
const db = require('../../../database/pool_connection');

router.get('/painel/home', checkAuth('user'), (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.render('painel/home', { user: req.user });
});

router.get('/api/usuario', async (req, res) => {
  try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ message: 'Token não fornecido ou formato inválido.' });
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
          return res.status(401).json({ message: 'Token não fornecido.' });
      }

      const decoded = jwt.verify(token, JWT_SECRET);

      const [usuarios] = await db.query('SELECT * FROM usuarios WHERE id = ?', [decoded.id]);

      if (usuarios.length > 0) {
          const usuario = usuarios[0];
          res.status(200).json({ infoUsuarioLogado: usuario });
      } else {
          res.status(404).json({ message: 'Usuário não encontrado.' });
      }
  } catch (error) {
      console.error('Erro ao buscar o usuário:', error);
      res.status(500).json({ message: 'Erro no servidor ao buscar o usuário.' });
  }
});

module.exports = router;