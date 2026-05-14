const express = require('express');
const router = express.Router();
const checkAuth = require('../../../middlewares/authMiddleware');

router.get('/painel/anuncio-em-analise', checkAuth('user'), (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.render('painel/anuncio-em-analise', { user: req.user });
});

module.exports = router;
