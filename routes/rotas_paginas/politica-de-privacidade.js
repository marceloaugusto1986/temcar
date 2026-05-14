const express = require('express');
const router = express.Router();
const { getSeo } = require('../../helpers/seo');

router.get('/politica-de-privacidade', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const seo = await getSeo('politica_privacidade');
  res.render('politica-de-privacidade', { seo });
});

module.exports = router;
