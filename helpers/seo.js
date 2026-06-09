const db = require('../database/pool_connection');
const { montarUrlVenda } = require('./anuncio-url');
const { montarUrlRevenda } = require('./revenda-url');
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
    titulo: 'TEMCAR - Compra e Venda de Veículos Novos e Usados',
    descricao: 'Compre e venda carros e motos no TEMCAR. Encontre veículos novos, seminovos e usados anunciados por revendas e particulares.',
    keywords: 'comprar carro, vender carro, carros usados, carros seminovos, motos usadas, temcar',
    texto_h1: 'TEMCAR - Compre e Venda Veículos Novos e Seminovos',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/`
  },
  carros: {
    titulo: 'Carros à Venda Novos, Seminovos e Usados | TEMCAR',
    descricao: 'Encontre carros à venda no TEMCAR. Compare ofertas de revendas e particulares para comprar carros novos, seminovos e usados.',
    keywords: 'carros à venda, comprar carro, carros usados, carros seminovos',
    texto_h1: 'Carros à Venda no TEMCAR',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/carros`
  },
  motos: {
    titulo: 'Motos à Venda Novas, Seminovas e Usadas | TEMCAR',
    descricao: 'Encontre motos à venda no TEMCAR. Veja ofertas de motos novas, seminovas e usadas anunciadas por revendas e particulares.',
    keywords: 'motos à venda, comprar moto, motos usadas, motos seminovas',
    texto_h1: 'Motos à Venda no TEMCAR',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/motos`
  },
  utilitarios: {
    titulo: 'Utilitários à Venda Novos, Seminovos e Usados | TEMCAR',
    descricao: 'Encontre utilitários à venda no TEMCAR. Compare ofertas de utilitários novos, seminovos e usados anunciados por revendas e particulares.',
    keywords: 'utilitários à venda, comprar utilitário, utilitários usados, utilitários seminovos',
    texto_h1: 'Utilitários à Venda no TEMCAR',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/utilitarios`
  },
  comprar: {
    titulo: 'Comprar Veículos Novos e Usados | TEMCAR',
    descricao: 'Busque carros, motos e utilitários à venda no TEMCAR. Encontre veículos novos, seminovos e usados com filtros por cidade, preço e categoria.',
    keywords: 'comprar veículos, comprar carro, comprar moto, comprar utilitário, veículos usados',
    texto_h1: 'Comprar Veículos no TEMCAR',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/comprar`
  },
  vender: {
    titulo: 'Vender Veículo Online | Anuncie no TEMCAR',
    descricao: 'Anuncie seu carro, moto ou utilitário no TEMCAR e alcance compradores interessados em veículos novos, seminovos e usados.',
    keywords: 'vender carro, vender moto, vender utilitário, anunciar veículo, anunciar carro',
    texto_h1: 'Venda seu Veículo no TEMCAR',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/vender`
  },
  tabela_fipe: {
    titulo: 'Tabela FIPE de Carros, Motos e Caminhões | TEMCAR',
    descricao: 'Consulte grátis o valor FIPE de carros, motos e caminhões no TEMCAR. Veja marca, modelo, ano, combustível, código FIPE e mês de referência.',
    keywords: 'tabela fipe, consulta fipe, valor fipe, fipe carros, fipe motos, fipe caminhões',
    texto_h1: 'Tabela FIPE TEMCAR',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/tabela-fipe`
  },
  buscar_cidades: {
    titulo: 'Buscar Veículos por Cidade | TEMCAR',
    descricao: 'Encontre carros e motos à venda por cidade no TEMCAR. Veja ofertas próximas de você.',
    keywords: 'veículos por cidade, carros por cidade, motos por cidade',
    texto_h1: 'Buscar Veículos por Cidade',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/buscar-cidades`
  },
  buscar_revendas: {
    titulo: 'Revendas de Veículos no Brasil | TEMCAR',
    descricao: 'Encontre revendas, lojas e concessionárias de veículos no TEMCAR. Veja carros, motos e utilitários anunciados por lojistas.',
    keywords: 'revendas de veículos, lojas de carros, lojas de motos, concessionárias, buscar revendas',
    texto_h1: 'Buscar Revendas de Veículos',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/buscar-revendas`
  },
  revenda: {
    titulo: '#revenda - Veículos à Venda em #cidade | TEMCAR',
    descricao: 'Confira os veículos à venda na #revenda em #cidade, #estado. Encontre carros, motos e utilitários com preços de revenda.',
    keywords: 'revenda de veículos, carros de revenda, motos de revenda, utilitários de revenda',
    texto_h1: '#revenda no TEMCAR',
    texto_conteudo: '',
    link_canonico: ''
  },
  particular: {
    titulo: 'Veículos de Particular à Venda | TEMCAR',
    descricao: 'Compre carros, motos e utilitários direto de particulares no TEMCAR. Compare ofertas e negocie diretamente com o proprietário.',
    keywords: 'carros de particular, motos de particular, veículos de particular, comprar direto do proprietário',
    texto_h1: 'Veículos de Particular à Venda',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/particular`
  },
  venda: {
    titulo: 'Veículo à Venda | TEMCAR',
    descricao: 'Veja detalhes, fotos e informações do veículo anunciado no TEMCAR.',
    keywords: 'veículo à venda, comprar veículo, anúncio de veículo',
    texto_h1: 'Detalhes do Veículo à Venda',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/venda`
  }
};

function makeDefaultSeo(pagina, overrides = {}) {
  return {
    titulo: 'TEMCAR - Compra e Venda de Veículos',
    descricao: 'Compre e venda veículos novos, seminovos e usados no TEMCAR. Encontre carros e motos com ofertas de revendas e particulares.',
    keywords: 'comprar carro, vender carro, veículos usados, carros novos, motos usadas, temcar',
    texto_h1: 'TEMCAR - Compra e Venda de Veículos',
    texto_conteudo: '',
    link_canonico: `${SITE_URL}/${pagina && pagina !== 'home' ? pagina.replace(/_/g, '-') : ''}`,
    og_type: 'website',
    og_image: `${SITE_URL}/imagens/img/og-temcar.jpg`,
    robots: 'index, follow',
    ...(SEO_DEFAULTS[pagina] || {}),
    ...overrides
  };
}

function limparTextoSeo(texto) {
  return (texto || '')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/\s+-\s*-/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Busca SEO server-side para páginas estáticas.
 * Replica a lógica de /api/seo-dinamico/:pagina
 */
async function getSeo(pagina, dadosContexto = {}, fallbackOverrides = {}) {
  const fallbackSeo = makeDefaultSeo(pagina, fallbackOverrides);

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

    const dados = {
      marca: '', versao: '', tipo: '', cidade: '', estado: '', condicao: '', bairro: ''
    };

    Object.assign(dados, anuncio || {}, dadosContexto || {});

    if (dados.modelo && !dados.versao) {
      dados.versao = dados.modelo;
    }

    if (dados.veiculo && !dados.tipo) {
      dados.tipo = dados.veiculo;
    }

    function aplicarPlaceholders(texto) {
      if (!texto) return texto;
      return limparTextoSeo(texto
        .replaceAll('#marca', dados.marca || '')
        .replaceAll('#modelo', dados.versao || '')
        .replaceAll('#veiculo', dados.veiculo || dados.tipo || '')
        .replaceAll('#cidade', dados.cidade || '')
        .replaceAll('#estado', dados.estado || '')
        .replaceAll('#bairro', dados.bairro || ''));
    }

    function aplicarPlaceholdersUrl(texto) {
      if (!texto) return texto;
      return texto
        .replaceAll('#marca', slugify(dados.marca))
        .replaceAll('#modelo', slugify(dados.versao))
        .replaceAll('#veiculo', slugify(dados.veiculo || dados.tipo))
        .replaceAll('#cidade', slugify(dados.cidade))
        .replaceAll('#estado', slugify(dados.estado))
        .replaceAll('#condicao', slugify(dados.condicao))
        .replaceAll('#bairro', slugify(dados.bairro))
        .replace(/,\s*/g, '/');
    }

    const deveUsarFallbackLocal = (campo) => {
      const template = seo[campo] || '';
      return (dados.bairro && !template.includes('#bairro'))
        || (dados.cidade && !template.includes('#cidade'));
    };

    const templateCanonico = seo.link_canonico || '';
    const linkCanonico = (
      (dados.bairro && !templateCanonico.includes('#bairro'))
      || (dados.cidade && !templateCanonico.includes('#cidade'))
    )
      ? fallbackSeo.link_canonico
      : aplicarPlaceholdersUrl(templateCanonico) || fallbackSeo.link_canonico;

    const aplicarCampo = (campo, fallback) => {
      if (deveUsarFallbackLocal(campo)) return fallback;
      return aplicarPlaceholders(seo[campo] || '') || fallback;
    };

    return {
      titulo: aplicarCampo('titulo', fallbackSeo.titulo),
      descricao: aplicarCampo('descricao', fallbackSeo.descricao),
      keywords: aplicarCampo('keywords', fallbackSeo.keywords),
      texto_h1: aplicarCampo('texto_h1', fallbackSeo.texto_h1),
      texto_conteudo: aplicarCampo('texto_conteudo', fallbackSeo.texto_conteudo),
      link_canonico: linkCanonico,
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
        titulo: `${anuncio.marca || 'Veículo'} ${anuncio.versao || ''} à venda | TEMCAR`.replace(/\s+/g, ' ').trim(),
        descricao: `Veja detalhes de ${anuncio.marca || 'veículo'} ${anuncio.versao || ''} à venda em ${anuncio.cidade || ''} ${anuncio.estado || ''} no TEMCAR.`.replace(/\s+/g, ' ').trim(),
        texto_h1: `${anuncio.marca || 'Veículo'} ${anuncio.versao || ''} à venda`.replace(/\s+/g, ' ').trim(),
        link_canonico: montarUrlVenda(anuncio),
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
      link_canonico: montarUrlVenda(anuncio),
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
async function getSeoCidade(cidade, bairro = '') {
  if (!cidade) return makeDefaultSeo('cidade');

  const slug = (cidade.nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
  const uf = (cidade.estado || '').toLowerCase();
  const bairroNome = typeof bairro === 'string' ? bairro : (bairro?.nome || '');
  const bairroSlug = slugify(bairroNome);
  const localTitulo = bairroNome
    ? `${bairroNome}, ${cidade.nome} - ${cidade.estado}`
    : `${cidade.nome}, ${cidade.estado}`;
  const localDescricao = bairroNome
    ? `no bairro ${bairroNome}, em ${cidade.nome}, ${cidade.estado}`
    : `em ${cidade.nome}, ${cidade.estado}`;

  const fallbackSeo = makeDefaultSeo('cidade', {
    titulo: `Veículos à Venda em ${localTitulo} | TEMCAR`,
    descricao: `Encontre carros, motos e utilitários à venda ${localDescricao}. Veja ofertas de veículos novos, seminovos e usados no TEMCAR.`,
    keywords: bairroNome
      ? `veículos em ${bairroNome}, carros em ${bairroNome}, motos em ${bairroNome}, ${cidade.nome}, ${cidade.estado}`
      : `veículos em ${cidade.nome}, carros em ${cidade.nome}, motos em ${cidade.nome}, utilitários em ${cidade.nome}`,
    texto_h1: `Veículos à Venda em ${localTitulo}`,
    link_canonico: bairroSlug
      ? `${SITE_URL}/veiculos/${uf}/${slug}/${bairroSlug}`
      : `${SITE_URL}/cidade/${slug}/${uf}`
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
      return limparTextoSeo(texto
        .replace(/#bairro/g, bairroNome || '')
        .replace(/#cidade/g, cidade.nome || '')
        .replace(/#estado/g, cidade.estado || ''));
    };

    const substituirUrl = (texto) => {
      if (!texto) return '';
      return texto
        .replace(/#bairro/g, slugify(bairroNome))
        .replace(/#cidade/g, slugify(cidade.nome))
        .replace(/#estado/g, slugify(cidade.estado));
    };

    const templateCanonico = seo.link_canonico || '';
    const linkCanonico = bairroNome && !templateCanonico.includes('#bairro')
      ? fallbackSeo.link_canonico
      : substituirUrl(templateCanonico) || fallbackSeo.link_canonico;

    const aplicarCampo = (campo, fallback) => {
      const template = seo[campo] || '';
      if (bairroNome && !template.includes('#bairro')) return fallback;
      return substituir(template) || fallback;
    };

    return {
      titulo: aplicarCampo('titulo', fallbackSeo.titulo),
      descricao: aplicarCampo('descricao', fallbackSeo.descricao),
      keywords: aplicarCampo('keywords', fallbackSeo.keywords),
      texto_h1: aplicarCampo('texto_h1', fallbackSeo.texto_h1),
      texto_conteudo: aplicarCampo('texto_conteudo', fallbackSeo.texto_conteudo),
      link_canonico: linkCanonico,
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
      titulo: `${revenda.nome} - Revenda de Veículos | TEMCAR`,
      descricao: `Veja veículos anunciados por ${revenda.nome} em ${revenda.cidade || ''}, ${revenda.estado || ''} no TEMCAR.`.replace(/\s+/g, ' ').trim(),
      keywords: `${revenda.nome}, revenda de veículos, carros à venda, motos à venda`,
      texto_h1: `${revenda.nome} no TEMCAR`,
      link_canonico: montarUrlRevenda({ id, nome: revenda.nome })
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
