const express = require('express');
const router = express.Router();
const { getSeo } = require('../../helpers/seo');
const { obterLocaisPopulares } = require('../../helpers/home-locais');

router.get('/', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const seo = await getSeo('home');
  const locais = await obterLocaisPopulares();
  res.render('home', { seo, locais });
});


module.exports = router;
