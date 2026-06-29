// Geração de texto SEO único por cidade a partir dos anúncios reais.
// Usado como fallback do getSeoCidade quando a cidade não tem texto manual
// (cidades.descricao). Retorna '' quando não há anúncios — respeitando a regra
// de não emitir conteúdo em página vazia.

const db = require('../database/pool_connection');
const { construirFiltroVeiculos } = require('./filtro-veiculos');

function formatarPreco(valor) {
  return Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  });
}

function listarPorExtenso(itens) {
  if (itens.length <= 1) return itens[0] || '';
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

async function gerarTextoCidade({ nome, estado } = {}) {
  if (!nome || !estado) return '';

  try {
    const { where, params } = construirFiltroVeiculos({ cidade: nome, uf: estado });
    const base = `FROM anuncios a INNER JOIN usuarios u ON u.id = a.usuario_id WHERE ${where}`;

    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total ${base}`, params);
    if (!total) return '';

    const [[{ menor }]] = await db.query(`SELECT MIN(a.preco) AS menor ${base}`, params);
    const [marcasRows] = await db.query(
      `SELECT a.marca AS marca, COUNT(*) AS qtd ${base}
       AND a.marca IS NOT NULL AND a.marca <> ''
       GROUP BY a.marca ORDER BY qtd DESC LIMIT 3`,
      params
    );

    const marcas = marcasRows.map(r => r.marca).filter(Boolean);
    const local = `${nome}, ${estado}`;

    let texto = total === 1
      ? `Há 1 veículo à venda em ${local} no TEMCAR.`
      : `Atualmente há ${total} veículos à venda em ${local} no TEMCAR.`;

    if (marcas.length) {
      texto += total === 1
        ? ` A marca disponível é ${listarPorExtenso(marcas)}.`
        : ` Entre as marcas mais anunciadas estão ${listarPorExtenso(marcas)}.`;
    }

    if (menor && Number(menor) > 0) {
      texto += ` Os preços começam a partir de ${formatarPreco(menor)}.`;
    }

    texto += ` Compare ofertas de carros novos, seminovos e usados de lojas e particulares e encontre o veículo ideal em ${nome}.`;

    return texto;
  } catch (error) {
    console.error('Erro ao gerar texto SEO da cidade', nome, error);
    return '';
  }
}

module.exports = { gerarTextoCidade };
