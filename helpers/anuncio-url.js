const SITE_URL = (process.env.SITE_URL || 'https://www.temcar.com.br').replace(/\/$/, '');

function slugify(texto) {
  return (texto || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function montarSlugMarcaModelo(anuncio = {}) {
  return slugify([anuncio.marca, anuncio.versao || anuncio.modelo].filter(Boolean).join(' '));
}

function montarCaminhoVenda(anuncio = {}) {
  const marcaModelo = montarSlugMarcaModelo(anuncio) || 'veiculo';
  const cidade = slugify(anuncio.cidade) || 'cidade';
  const estado = slugify(anuncio.estado) || 'estado';

  return `/venda/${marcaModelo}/${cidade}/${estado}`;
}

function montarUrlVenda(anuncio = {}) {
  return `${SITE_URL}${montarCaminhoVenda(anuncio)}`;
}

module.exports = {
  slugify,
  montarSlugMarcaModelo,
  montarCaminhoVenda,
  montarUrlVenda
};
