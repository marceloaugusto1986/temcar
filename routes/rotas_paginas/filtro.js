const express = require('express');
const router = express.Router();

// filtro.ejs não existe; redireciona para home
router.get('/filtro', (req, res) => {
  res.redirect(301, '/');
});

module.exports = router;
