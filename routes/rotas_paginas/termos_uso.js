const express = require('express');
const router = express.Router();
const { getSeo } = require('../../helpers/seo');

router.get('/termos-de-uso', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const seo = await getSeo('termos_uso');
  res.render('termos-de-uso', { seo });
});

module.exports = router;
