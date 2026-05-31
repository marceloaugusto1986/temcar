const express = require('express');
const router = express.Router();
const { getSeo } = require('../../helpers/seo');
const db = require('../../database/pool_connection');
const { listarPlanos } = require('../../database/planos');

router.get('/planos-particular', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const seo = await getSeo('planos_particular');
  const planos = await listarPlanos(db, 'particular');
  res.render('planos-particular', { seo, planos });
});

module.exports = router;
