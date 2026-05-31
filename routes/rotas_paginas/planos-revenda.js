const express = require('express');
const router = express.Router();
const { getSeo } = require('../../helpers/seo');
const db = require('../../database/pool_connection');
const { listarPlanos } = require('../../database/planos');

router.get('/planos-revenda', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const seo = await getSeo('planos_revenda');
  const planos = await listarPlanos(db, 'revenda');
  res.render('planos-revenda', { seo, planos });
});

module.exports = router;
