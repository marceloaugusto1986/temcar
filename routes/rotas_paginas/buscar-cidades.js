const express = require('express');
const router = express.Router();
const db = require("./../../database/pool_connection");
const { getSeo } = require('../../helpers/seo');

router.get('/buscar-cidades', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const seo = await getSeo('buscar_cidades');
  res.render('buscar-cidades', { seo });
});

module.exports = router;