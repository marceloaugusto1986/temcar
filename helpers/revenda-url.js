const SITE_URL = (process.env.SITE_URL || 'https://www.temcar.com.br').replace(/\/$/, '');
const { slugify } = require('./anuncio-url');

function montarSlugRevenda(revenda = {}) {
  return slugify(revenda.nome) || String(revenda.id || '').trim();
}

function montarCaminhoRevenda(revenda = {}) {
  const slug = montarSlugRevenda(revenda);
  return `/revenda/${slug}`;
}

function montarUrlRevenda(revenda = {}) {
  return `${SITE_URL}${montarCaminhoRevenda(revenda)}`;
}

module.exports = {
  montarSlugRevenda,
  montarCaminhoRevenda,
  montarUrlRevenda
};
