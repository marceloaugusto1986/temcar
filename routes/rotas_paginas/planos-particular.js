const express = require('express');
const router = express.Router();
const { getSeo } = require('../../helpers/seo');

router.get('/planos-particular', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const seo = await getSeo('planos_particular');
  res.render('planos-particular', { seo });
});

module.exports = router;
