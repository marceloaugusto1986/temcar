const db = require('../database/pool_connection');

function slugify(texto) {
  return (texto || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const NOMES_ESTADOS = {
  ac: 'Acre', al: 'Alagoas', ap: 'Amapá', am: 'Amazonas', ba: 'Bahia',
  ce: 'Ceará', df: 'Distrito Federal', es: 'Espírito Santo', go: 'Goiás',
  ma: 'Maranhão', mt: 'Mato Grosso', ms: 'Mato Grosso do Sul', mg: 'Minas Gerais',
  pa: 'Pará', pb: 'Paraíba', pr: 'Paraná', pe: 'Pernambuco', pi: 'Piauí',
  rj: 'Rio de Janeiro', rn: 'Rio Grande do Norte', rs: 'Rio Grande do Sul',
  ro: 'Rondônia', rr: 'Roraima', sc: 'Santa Catarina', sp: 'São Paulo',
  se: 'Sergipe', to: 'Tocantins'
};

// Filtro base: carros ativos e publicados, com anunciante localizado
const WHERE_CARROS_ATIVOS = `
  LOWER(a.tipo) = 'carro'
  AND a.status = 'ativo'
  AND (a.publicado_ate IS NULL OR a.publicado_ate >= NOW())
`;

// Retorna estados, cidades e bairros mais populares (com anúncios de carros ativos),
// já com URLs prontas para os blocos de SEO da home. Em caso de erro, devolve vazio.
async function obterLocaisPopulares({ limiteEstados = 12, limiteCidades = 12, limiteBairros = 12 } = {}) {
  try {
    const [estados] = await db.query(`
      SELECT u.estado, COUNT(*) AS total
      FROM anuncios a
      INNER JOIN usuarios u ON u.id = a.usuario_id
      WHERE ${WHERE_CARROS_ATIVOS}
        AND u.estado IS NOT NULL AND u.estado <> ''
      GROUP BY u.estado
      ORDER BY total DESC
      LIMIT ?
    `, [limiteEstados]);

    const [cidades] = await db.query(`
      SELECT u.cidade, u.estado, COUNT(*) AS total
      FROM anuncios a
      INNER JOIN usuarios u ON u.id = a.usuario_id
      WHERE ${WHERE_CARROS_ATIVOS}
        AND u.cidade IS NOT NULL AND u.cidade <> ''
        AND u.estado IS NOT NULL AND u.estado <> ''
      GROUP BY u.cidade, u.estado
      ORDER BY total DESC
      LIMIT ?
    `, [limiteCidades]);

    const [bairros] = await db.query(`
      SELECT u.bairro, u.cidade, u.estado, COUNT(*) AS total
      FROM anuncios a
      INNER JOIN usuarios u ON u.id = a.usuario_id
      WHERE ${WHERE_CARROS_ATIVOS}
        AND u.bairro IS NOT NULL AND u.bairro <> ''
        AND u.cidade IS NOT NULL AND u.cidade <> ''
        AND u.estado IS NOT NULL AND u.estado <> ''
      GROUP BY u.bairro, u.cidade, u.estado
      ORDER BY total DESC
      LIMIT ?
    `, [limiteBairros]);

    return {
      estados: estados.map(e => {
        const uf = String(e.estado).toLowerCase();
        return {
          nome: NOMES_ESTADOS[uf] || e.estado.toUpperCase(),
          url: `/carros/${uf}`,
          total: e.total
        };
      }),
      cidades: cidades.map(c => ({
        nome: `${c.cidade} - ${c.estado.toUpperCase()}`,
        url: `/carros/${slugify(c.cidade)}/${slugify(c.estado)}`,
        total: c.total
      })),
      bairros: bairros.map(b => ({
        nome: `${b.bairro}, ${b.cidade} - ${b.estado.toUpperCase()}`,
        url: `/carros/${slugify(b.bairro)}/${slugify(b.cidade)}/${slugify(b.estado)}`,
        total: b.total
      }))
    };
  } catch (error) {
    console.error('Erro ao obter locais populares para a home:', error);
    return { estados: [], cidades: [], bairros: [] };
  }
}

module.exports = { obterLocaisPopulares };
