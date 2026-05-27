const db = require('../database/pool_connection');

/**
 * Busca SEO server-side para páginas estáticas.
 * Replica a lógica de /api/seo-dinamico/:pagina
 */
async function getSeo(pagina) {
  const defaultSeo = {
    titulo: 'TEMCAR - Compra e Venda de Veículos',
    descricao: '',
    keywords: '',
    texto_h1: '',
    texto_conteudo: '',
    link_canonico: '',
    og_type: 'website',
    og_image: '',
    robots: 'index, follow'
  };

  try {
    const [[seo]] = await db.query(`
      SELECT *
      FROM seo_templates
      WHERE pagina = ?
      AND ativo = true
      LIMIT 1
    `, [pagina]);

    if (!seo) return defaultSeo;

    const [[anuncio]] = await db.query(`
      SELECT
        a.marca,
        a.versao,
        a.tipo,
        a.condicao,
        u.cidade,
        u.estado
      FROM anuncios a
      INNER JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.status = 'ativo'
      ORDER BY a.criado_em DESC
      LIMIT 1
    `);

    const dados = anuncio || {
      marca: '', versao: '', tipo: '', cidade: '', estado: '', condicao: ''
    };

    function aplicarPlaceholders(texto) {
      if (!texto) return texto;
      return texto
        .replaceAll('#marca', dados.marca || '')
        .replaceAll('#modelo', dados.versao || '')
        .replaceAll('#veiculo', dados.tipo || '')
        .replaceAll('#cidade', dados.cidade || '')
        .replaceAll('#estado', dados.estado || '')
        .replaceAll('#condicao', dados.condicao || '');
    }

    return {
      titulo: aplicarPlaceholders(seo.titulo) || defaultSeo.titulo,
      descricao: aplicarPlaceholders(seo.descricao) || '',
      keywords: aplicarPlaceholders(seo.keywords) || '',
      texto_h1: aplicarPlaceholders(seo.texto_h1) || '',
      texto_conteudo: aplicarPlaceholders(seo.texto_conteudo) || '',
      link_canonico: seo.link_canonico || '',
      og_type: 'website',
      og_image: '',
      robots: 'index, follow'
    };
  } catch (error) {
    console.error('Erro ao buscar SEO para', pagina, error);
    return defaultSeo;
  }
}

/**
 * Busca SEO para página de venda (anúncio específico).
 * Replica a lógica de /api/seo-anuncio/:id
 */
async function getSeoAnuncio(id) {
  const defaultSeo = {
    titulo: 'TEMCAR - Compra e Venda de Veículos',
    descricao: '',
    keywords: '',
    texto_h1: '',
    texto_conteudo: '',
    link_canonico: '',
    og_type: 'product',
    og_image: '',
    robots: 'index, follow'
  };

  if (!id) return defaultSeo;

  try {
    const [[anuncio]] = await db.query(`
      SELECT
        a.marca,
        a.versao,
        a.imagens,
        u.cidade,
        u.estado
      FROM anuncios a
      JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.id = ?
      LIMIT 1
    `, [id]);

    if (!anuncio) return defaultSeo;

    const [[seo]] = await db.query(`
      SELECT *
      FROM seo_templates
      WHERE pagina = 'venda'
      AND ativo = true
      LIMIT 1
    `);

    if (!seo) return defaultSeo;

    const substituir = (texto) => {
      if (!texto) return '';
      return texto
        .replace(/#marca/g, anuncio.marca || '')
        .replace(/#modelo/g, anuncio.versao || '')
        .replace(/#cidade/g, anuncio.cidade || '')
        .replace(/#estado/g, anuncio.estado || '');
    };

    let ogImage = '';
    if (anuncio.imagens) {
      try {
        const imgs = JSON.parse(anuncio.imagens);
        if (Array.isArray(imgs) && imgs.length > 0) {
          ogImage = `https://temcar.com.br/uploads/${imgs[0]}`;
        }
      } catch (e) {}
    }

    return {
      titulo: substituir(seo.titulo) || defaultSeo.titulo,
      descricao: substituir(seo.descricao) || '',
      keywords: substituir(seo.keywords) || '',
      texto_h1: substituir(seo.texto_h1) || '',
      texto_conteudo: substituir(seo.texto_conteudo) || '',
      link_canonico: substituir(seo.link_canonico) || `https://temcar.com.br/venda?id=${id}`,
      og_type: 'product',
      og_image: ogImage,
      robots: 'index, follow'
    };
  } catch (error) {
    console.error('Erro ao buscar SEO do anúncio', id, error);
    return defaultSeo;
  }
}

/**
 * Busca SEO para página de cidade.
 * Busca template de 'cidade' e substitui placeholders com dados da cidade.
 */
async function getSeoCidade(cidade) {
  const defaultSeo = {
    titulo: 'TEMCAR - Compra e Venda de Veículos',
    descricao: '',
    keywords: '',
    texto_h1: '',
    texto_conteudo: '',
    link_canonico: '',
    og_type: 'website',
    og_image: '',
    robots: 'index, follow'
  };

  if (!cidade) return defaultSeo;

  try {
    const [[seo]] = await db.query(`
      SELECT *
      FROM seo_templates
      WHERE pagina = 'cidade'
      AND ativo = true
      LIMIT 1
    `);

    if (!seo) return defaultSeo;

    const substituir = (texto) => {
      if (!texto) return '';
      return texto
        .replace(/#cidade/g, cidade.nome || '')
        .replace(/#estado/g, cidade.estado || '');
    };

    const slug = (cidade.nome || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
    const uf = (cidade.estado || '').toLowerCase();

    return {
      titulo: substituir(seo.titulo) || defaultSeo.titulo,
      descricao: substituir(seo.descricao) || '',
      keywords: substituir(seo.keywords) || '',
      texto_h1: substituir(seo.texto_h1) || '',
      texto_conteudo: substituir(seo.texto_conteudo) || '',
      link_canonico: substituir(seo.link_canonico) || `https://temcar.com.br/cidade/${slug}/${uf}`,
      og_type: 'website',
      og_image: '',
      robots: 'index, follow'
    };
  } catch (error) {
    console.error('Erro ao buscar SEO da cidade', cidade.nome, error);
    return defaultSeo;
  }
}

module.exports = { getSeo, getSeoAnuncio, getSeoCidade };
