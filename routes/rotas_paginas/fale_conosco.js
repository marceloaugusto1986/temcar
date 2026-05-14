const express = require('express');
const router = express.Router();
const { getSeo } = require('../../helpers/seo');

router.get('/fale-conosco', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const seo = await getSeo('fale_conosco');
  res.render('fale-conosco', { seo });
});

module.exports = router;
