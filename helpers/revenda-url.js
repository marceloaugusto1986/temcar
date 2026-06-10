const SITE_URL = (process.env.SITE_URL || 'https://www.temcar.com.br').replace(/\/$/, '');
const { slugify } = require('./anuncio-url');

function montarSlugRevenda(revenda = {}) {
  return slugify(revenda.nome) || String(revenda.id || '').trim();
}

function montarSegmentosRevenda(revenda = {}) {
  const nome = montarSlugRevenda(revenda);
  const bairro = slugify(revenda.bairro);
  const cidade = slugify(revenda.cidade);
  const estado = slugify(revenda.estado);

  return [nome, bairro, cidade, estado].filter(Boolean);
}

function montarSlugRevendaLegado(revenda = {}) {
  const partes = [
    revenda.nome,
    revenda.bairro,
    revenda.cidade,
    revenda.estado
  ].filter(Boolean);

  return slugify(partes.join(' ')) || String(revenda.id || '').trim();
}

function montarCaminhoRevenda(revenda = {}) {
  return `/revenda/${montarSegmentosRevenda(revenda).join('/')}`;
}

function montarUrlRevenda(revenda = {}) {
  return `${SITE_URL}${montarCaminhoRevenda(revenda)}`;
}

module.exports = {
  montarSlugRevenda,
  montarSegmentosRevenda,
  montarSlugRevendaLegado,
  montarCaminhoRevenda,
  montarUrlRevenda
};
