const db = require('../database/pool_connection');
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

const SEO_DEFAULTS = {
  home: {
    titulo: 'TemCar - Compra e Venda de Veículos Novos e Usados',
    descricao: 'Compre e venda carros e motos no TemCar. Encontre veículos novos, seminovos e usados anunciados por revendas e particulares.',
    keywords: 'comprar carro, vender carro, carros usados, carros seminovos, motos usadas, temcar',
    texto_h1: 'TemCar - Compre e Venda Veículos Novos e Seminovos',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/`
  },
  carros: {
    titulo: 'Carros à Venda Novos, Seminovos e Usados | TemCar',
    descricao: 'Encontre carros à venda no TemCar. Compare ofertas de revendas e particulares para comprar carros novos, seminovos e usados.',
    keywords: 'carros à venda, comprar carro, carros usados, carros seminovos',
    texto_h1: 'Carros à Venda no TemCar',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/carros`
  },
  motos: {
    titulo: 'Motos à Venda Novas, Seminovas e Usadas | TemCar',
    descricao: 'Encontre motos à venda no TemCar. Veja ofertas de motos novas, seminovas e usadas anunciadas por revendas e particulares.',
    keywords: 'motos à venda, comprar moto, motos usadas, motos seminovas',
    texto_h1: 'Motos à Venda no TemCar',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/motos`
  },
  comprar: {
    titulo: 'Comprar Veículos Novos e Usados | TemCar',
    descricao: 'Busque carros e motos à venda no TemCar. Encontre veículos novos, seminovos e usados com filtros por cidade, preço e categoria.',
    keywords: 'comprar veículos, comprar carro, comprar moto, veículos usados',
    texto_h1: 'Comprar Veículos no TemCar',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/comprar`
  },
  vender: {
    titulo: 'Vender Veículo Online | Anuncie no TemCar',
    descricao: 'Anuncie seu carro ou moto no TemCar e alcance compradores interessados em veículos novos, seminovos e usados.',
    keywords: 'vender carro, vender moto, anunciar veículo, anunciar carro',
    texto_h1: 'Venda seu Veículo no TemCar',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/vender`
  },
  buscar_cidades: {
    titulo: 'Buscar Veículos por Cidade | TemCar',
    descricao: 'Encontre carros e motos à venda por cidade no TemCar. Veja ofertas próximas de você.',
    keywords: 'veículos por cidade, carros por cidade, motos por cidade',
    texto_h1: 'Buscar Veículos por Cidade',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/buscar-cidades`
  },
  buscar_revendas: {
    titulo: 'Buscar Revendas de Veículos | TemCar',
    descricao: 'Encontre revendas de veículos no TemCar e veja carros e motos anunciados por lojistas.',
    keywords: 'revendas de veículos, lojas de carros, lojas de motos',
    texto_h1: 'Buscar Revendas no TemCar',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/buscar-revendas`
  },
  venda: {
    titulo: 'Veículo à Venda | TemCar',
    descricao: 'Veja detalhes, fotos e informações do veículo anunciado no TemCar.',
    keywords: 'veículo à venda, comprar veículo, anúncio de veículo',
    texto_h1: 'Detalhes do Veículo à Venda',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/venda`
  }
};

function makeDefaultSeo(pagina, overrides = {}) {
  return {
    titulo: 'TemCar - Compra e Venda de Veículos',
    descricao: 'Compre e venda veículos novos, seminovos e usados no TemCar. Encontre carros e motos com ofertas de revendas e particulares.',
    keywords: 'comprar carro, vender carro, veículos usados, carros novos, motos usadas, temcar',
    texto_h1: 'TemCar - Compra e Venda de Veículos',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/${pagina && pagina !== 'home' ? pagina.replace(/_/g, '-') : ''}`,
    og_type: 'website',
    og_image: `${SITE_URL}/imagens/img/og-temcar.jpg`,
    robots: 'index, follow',
    ...(SEO_DEFAULTS[pagina] || {}),
    ...overrides
  };
}

/**
 * Busca SEO server-side para páginas estáticas.
 * Replica a lógica de /api/seo-dinamico/:pagina
 */
async function getSeo(pagina) {
  const fallbackSeo = makeDefaultSeo(pagina);

  try {
    const [[seo]] = await db.query(`
      SELECT *
      FROM seo_templates
      WHERE pagina = ?
      AND ativo = true
      LIMIT 1
    `, [pagina]);

    if (!seo) return fallbackSeo;

    const [[anuncio]] = await db.query(`
      SELECT
        a.marca,
        a.versao,
        a.tipo,
        a.condicao,
        u.cidade,
        u.estado,
        u.bairro
      FROM anuncios a
      INNER JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.status = 'ativo'
      ORDER BY a.criado_em DESC
      LIMIT 1
    `);

    const dados = anuncio || {
      marca: '', versao: '', tipo: '', cidade: '', estado: '', condicao: '', bairro: ''
    };

    function aplicarPlaceholders(texto) {
      if (!texto) return texto;
      return texto
        .replaceAll('#marca', dados.marca || '')
        .replaceAll('#modelo', dados.versao || '')
        .replaceAll('#veiculo', dados.tipo || '')
        .replaceAll('#cidade', dados.cidade || '')
        .replaceAll('#estado', dados.estado || '')
        .replaceAll('#bairro', dados.bairro || '');
    }

    function aplicarPlaceholdersUrl(texto) {
      if (!texto) return texto;
      return texto
        .replaceAll('#marca', slugify(dados.marca))
        .replaceAll('#modelo', slugify(dados.versao))
        .replaceAll('#veiculo', slugify(dados.tipo))
        .replaceAll('#cidade', slugify(dados.cidade))
        .replaceAll('#estado', slugify(dados.estado))
        .replaceAll('#condicao', slugify(dados.condicao))
        .replaceAll('#bairro', slugify(dados.bairro));
    }

    return {
      titulo: aplicarPlaceholders(seo.titulo) || fallbackSeo.titulo,
      descricao: aplicarPlaceholders(seo.descricao) || fallbackSeo.descricao,
      keywords: aplicarPlaceholders(seo.keywords) || fallbackSeo.keywords,
      texto_h1: aplicarPlaceholders(seo.texto_h1) || fallbackSeo.texto_h1,
      texto_conteudo: aplicarPlaceholders(seo.texto_conteudo) || fallbackSeo.texto_conteudo,
      link_canonico: aplicarPlaceholdersUrl(seo.link_canonico) || fallbackSeo.link_canonico,
      og_type: 'website',
      og_image: fallbackSeo.og_image,
      robots: 'index, follow'
    };
  } catch (error) {
    console.error('Erro ao buscar SEO para', pagina, error);
    return fallbackSeo;
  }
}

/**
 * Busca SEO para página de venda (anúncio específico).
 * Replica a lógica de /api/seo-anuncio/:id
 */
async function getSeoAnuncio(id) {
  const fallbackSeo = makeDefaultSeo('venda', {
    og_type: 'product',
    link_canonico: `${SITE_URL}/venda${id ? `?id=${id}` : ''}`
  });

  if (!id) return fallbackSeo;

  try {
    const [[anuncio]] = await db.query(`
      SELECT
        a.marca,
        a.versao,
        img.imagem AS imagem_principal,
        u.cidade,
        u.estado,
        u.bairro
      FROM anuncios a
      JOIN usuarios u ON u.id = a.usuario_id
      LEFT JOIN anuncios_imagens img
        ON img.anuncio_id = a.id AND img.principal = true
      WHERE a.id = ?
      LIMIT 1
    `, [id]);

    if (!anuncio) return fallbackSeo;

    const [[seo]] = await db.query(`
      SELECT *
      FROM seo_templates
      WHERE pagina = 'venda'
      AND ativo = true
      LIMIT 1
    `);

    if (!seo) {
      return makeDefaultSeo('venda', {
        titulo: `${anuncio.marca || 'Veículo'} ${anuncio.versao || ''} à venda | TemCar`.replace(/\s+/g, ' ').trim(),
        descricao: `Veja detalhes de ${anuncio.marca || 'veículo'} ${anuncio.versao || ''} à venda em ${anuncio.cidade || ''} ${anuncio.estado || ''} no TemCar.`.replace(/\s+/g, ' ').trim(),
        texto_h1: `${anuncio.marca || 'Veículo'} ${anuncio.versao || ''} à venda`.replace(/\s+/g, ' ').trim(),
        link_canonico: `${SITE_URL}/venda?id=${id}`,
        og_type: 'product',
        og_image: anuncio.imagem_principal ? `${SITE_URL}/uploads/anuncios/${anuncio.imagem_principal}` : fallbackSeo.og_image
      });
    }

    const substituir = (texto) => {
      if (!texto) return '';
      return texto
        .replace(/#marca/g, anuncio.marca || '')
        .replace(/#modelo/g, anuncio.versao || '')
        .replace(/#cidade/g, anuncio.cidade || '')
        .replace(/#estado/g, anuncio.estado || '')
        .replace(/#bairro/g, anuncio.bairro || '');
    };

    const ogImage = anuncio.imagem_principal ? `${SITE_URL}/uploads/anuncios/${anuncio.imagem_principal}` : fallbackSeo.og_image;

    return {
      titulo: substituir(seo.titulo) || fallbackSeo.titulo,
      descricao: substituir(seo.descricao) || fallbackSeo.descricao,
      keywords: substituir(seo.keywords) || fallbackSeo.keywords,
      texto_h1: substituir(seo.texto_h1) || fallbackSeo.texto_h1,
      texto_conteudo: substituir(seo.texto_conteudo) || fallbackSeo.texto_conteudo,
      link_canonico: substituir(seo.link_canonico) || `${SITE_URL}/venda?id=${id}`,
      og_type: 'product',
      og_image: ogImage,
      robots: 'index, follow'
    };
  } catch (error) {
    console.error('Erro ao buscar SEO do anúncio', id, error);
    return fallbackSeo;
  }
}

/**
 * Busca SEO para página de cidade.
 * Busca template de 'cidade' e substitui placeholders com dados da cidade.
 */
async function getSeoCidade(cidade) {
  if (!cidade) return makeDefaultSeo('cidade');

  const slug = (cidade.nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
  const uf = (cidade.estado || '').toLowerCase();
  const fallbackSeo = makeDefaultSeo('cidade', {
    titulo: `Veículos à Venda em ${cidade.nome}, ${cidade.estado} | TemCar`,
    descricao: `Encontre carros e motos à venda em ${cidade.nome}, ${cidade.estado}. Veja ofertas de veículos novos, seminovos e usados no TemCar.`,
    keywords: `veículos em ${cidade.nome}, carros em ${cidade.nome}, motos em ${cidade.nome}`,
    texto_h1: `Veículos à Venda em ${cidade.nome} - ${cidade.estado}`,
    link_canonico: `${SITE_URL}/cidade/${slug}/${uf}`
  });

  try {
    const [[seo]] = await db.query(`
      SELECT *
      FROM seo_templates
      WHERE pagina = 'cidade'
      AND ativo = true
      LIMIT 1
    `);

    if (!seo) return fallbackSeo;

    const substituir = (texto) => {
      if (!texto) return '';
      return texto
        .replace(/#bairro/g, '')
        .replace(/#cidade/g, cidade.nome || '')
        .replace(/#estado/g, cidade.estado || '');
    };

    return {
      titulo: substituir(seo.titulo) || fallbackSeo.titulo,
      descricao: substituir(seo.descricao) || fallbackSeo.descricao,
      keywords: substituir(seo.keywords) || fallbackSeo.keywords,
      texto_h1: substituir(seo.texto_h1) || fallbackSeo.texto_h1,
      texto_conteudo: substituir(seo.texto_conteudo) || fallbackSeo.texto_conteudo,
      link_canonico: substituir(seo.link_canonico) || fallbackSeo.link_canonico,
      og_type: 'website',
      og_image: fallbackSeo.og_image,
      robots: 'index, follow'
    };
  } catch (error) {
    console.error('Erro ao buscar SEO da cidade', cidade.nome, error);
    return fallbackSeo;
  }
}

/**
 * Busca SEO para página de revenda específica.
 * Substitui #revenda, #cidade, #estado com dados da revenda.
 */
async function getSeoRevenda(id) {
  const fallbackSeo = makeDefaultSeo('revenda', {
    link_canonico: `${SITE_URL}/revenda/${id || ''}`
  });

  if (!id) return fallbackSeo;

  try {
    const [[revenda]] = await db.query(`
      SELECT u.nome, u.cidade, u.estado
      FROM usuarios u
      WHERE u.id = ? AND u.tipo = 'revenda'
      LIMIT 1
    `, [id]);

    if (!revenda) return fallbackSeo;

    const revendaFallbackSeo = makeDefaultSeo('revenda', {
      titulo: `${revenda.nome} - Revenda de Veículos | TemCar`,
      descricao: `Veja veículos anunciados por ${revenda.nome} em ${revenda.cidade || ''}, ${revenda.estado || ''} no TemCar.`.replace(/\s+/g, ' ').trim(),
      keywords: `${revenda.nome}, revenda de veículos, carros à venda, motos à venda`,
      texto_h1: `${revenda.nome} no TemCar`,
      link_canonico: `${SITE_URL}/revenda/${id}`
    });

    const [[seo]] = await db.query(`
      SELECT * FROM seo_templates
      WHERE pagina = 'revenda' AND ativo = true
      LIMIT 1
    `);

    if (!seo) return revendaFallbackSeo;

    const substituir = (texto) => {
      if (!texto) return '';
      return texto
        .replace(/#revenda/g, revenda.nome || '')
        .replace(/#cidade/g, revenda.cidade || '')
        .replace(/#estado/g, revenda.estado || '');
    };

    return {
      titulo: substituir(seo.titulo) || revendaFallbackSeo.titulo,
      descricao: substituir(seo.descricao) || revendaFallbackSeo.descricao,
      keywords: substituir(seo.keywords) || revendaFallbackSeo.keywords,
      texto_h1: substituir(seo.texto_h1) || revendaFallbackSeo.texto_h1,
      texto_conteudo: substituir(seo.texto_conteudo) || revendaFallbackSeo.texto_conteudo,
      link_canonico: substituir(seo.link_canonico) || revendaFallbackSeo.link_canonico,
      og_type: 'website',
      og_image: revendaFallbackSeo.og_image,
      robots: 'index, follow'
    };
  } catch (error) {
    console.error('Erro ao buscar SEO da revenda', id, error);
    return fallbackSeo;
  }
}

module.exports = { getSeo, getSeoAnuncio, getSeoCidade, getSeoRevenda };
