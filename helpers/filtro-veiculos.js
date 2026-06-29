// Construção do filtro de anúncios por localização/tipo/marca/etc.
// Fonte única reaproveitada pela listagem (routes/rotas_paginas/veiculos.js) e
// pela geração de texto SEO por cidade (helpers/texto-cidade-auto.js), para que
// a contagem do texto bata exatamente com o que a página lista.

function slugify(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function obterTiposConsulta(tipo) {
  const tipoNormalizado = slugify(tipo);
  const tiposPorSlug = {
    carro: ['Carro'],
    carros: ['Carro'],
    moto: ['Moto'],
    motos: ['Moto'],
    utilitario: ['Utilitário', 'Utilitario'],
    utilitarios: ['Utilitário', 'Utilitario']
  };

  return tiposPorSlug[tipoNormalizado] || (tipo ? [tipo] : []);
}

// Monta o WHERE e os params para `FROM anuncios a INNER JOIN usuarios u ON u.id = a.usuario_id`.
function construirFiltroVeiculos({ tipo, cidade, uf, bairro, marca, carroceria, busca } = {}) {
  let where = "a.status = 'ativo' AND (a.publicado_ate IS NULL OR a.publicado_ate >= NOW())";
  const params = [];

  const tiposConsulta = obterTiposConsulta(tipo);
  if (tiposConsulta.length) {
    where += ` AND LOWER(a.tipo) IN (${tiposConsulta.map(() => 'LOWER(?)').join(', ')})`;
    params.push(...tiposConsulta);
  }

  if (cidade) {
    const cidadeNorm = `%${cidade.toLowerCase().replace(/-/g, ' ')}%`;
    if (uf) {
      where += ` AND (
        (LOWER(u.cidade) LIKE ? AND LOWER(u.estado) = ?)
        OR EXISTS (
          SELECT 1 FROM anuncios_cidades ac
          WHERE ac.anuncio_id = a.id
          AND LOWER(ac.cidade) LIKE ?
          AND LOWER(ac.estado) = ?
        )
        OR EXISTS (
          SELECT 1 FROM revendas_cidades rc
          WHERE rc.usuario_id = u.id
          AND LOWER(rc.cidade) LIKE ?
          AND LOWER(rc.estado) = ?
        )
      )`;
      params.push(cidadeNorm, uf.toLowerCase(), cidadeNorm, uf.toLowerCase(), cidadeNorm, uf.toLowerCase());
    } else {
      where += ` AND (
        LOWER(u.cidade) LIKE ?
        OR EXISTS (
          SELECT 1 FROM anuncios_cidades ac
          WHERE ac.anuncio_id = a.id AND LOWER(ac.cidade) LIKE ?
        )
        OR EXISTS (
          SELECT 1 FROM revendas_cidades rc
          WHERE rc.usuario_id = u.id AND LOWER(rc.cidade) LIKE ?
        )
      )`;
      params.push(cidadeNorm, cidadeNorm, cidadeNorm);
    }
  } else if (uf) {
    where += ` AND (
      LOWER(u.estado) = ?
      OR EXISTS (
        SELECT 1 FROM anuncios_cidades ac
        WHERE ac.anuncio_id = a.id AND LOWER(ac.estado) = ?
      )
      OR EXISTS (
        SELECT 1 FROM revendas_cidades rc
        WHERE rc.usuario_id = u.id AND LOWER(rc.estado) = ?
      )
    )`;
    params.push(uf.toLowerCase(), uf.toLowerCase(), uf.toLowerCase());
  }

  if (bairro) {
    const bairroNorm = `%${bairro.toLowerCase().replace(/-/g, ' ')}%`;
    where += ` AND (
      LOWER(u.bairro) LIKE ?
      OR EXISTS (
        SELECT 1 FROM revendas_cidades rc
        WHERE rc.usuario_id = u.id
        AND LOWER(rc.bairro) LIKE ?
      )
    )`;
    params.push(bairroNorm, bairroNorm);
  }

  if (marca) {
    const marcaNorm = marca.toLowerCase().replace(/-/g, ' ');
    where += ' AND (LOWER(a.marca) = ? OR LOWER(a.versao) LIKE ?)';
    params.push(marcaNorm, `%${marcaNorm}%`);
  }

  if (carroceria) {
    where += ' AND LOWER(a.carroceria) = ?';
    params.push(carroceria.toLowerCase());
  }

  if (busca) {
    const termo = `%${busca.toLowerCase().replace(/-/g, ' ')}%`;
    where += ` AND (
      LOWER(a.marca) LIKE ?
      OR LOWER(a.versao) LIKE ?
      OR LOWER(a.descricao) LIKE ?
    )`;
    params.push(termo, termo, termo);
  }

  return { where, params };
}

module.exports = { slugify, obterTiposConsulta, construirFiltroVeiculos };
