const express = require('express');
const router = express.Router();
const { getSeo } = require('../../helpers/seo');

router.get('/quem-somos', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const seo = await getSeo('quem_somos');
  res.render('quem-somos', { seo });
});

module.exports = router;
