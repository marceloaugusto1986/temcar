const express = require('express');
const router = express.Router();
const { getSeo } = require('../../helpers/seo');

router.get('/criar-conta', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const seo = await getSeo('criar_conta');
  res.render('criar-conta', { seo });
});

module.exports = router;
