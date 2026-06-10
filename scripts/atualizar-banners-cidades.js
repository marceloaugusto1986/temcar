const db = require('../database/pool_connection');

const DEFAULT_DESKTOP = '/imagens/img/banner-cidade-default.png';
const DEFAULT_MOBILE = '/imagens/img/banner-cidade-default-mobile.png';

function obterArg(nome, padrao = '') {
  const prefixo = `--${nome}=`;
  const arg = process.argv.find(item => item.startsWith(prefixo));
  return arg ? arg.slice(prefixo.length).trim() : padrao;
}

function temFlag(nome) {
  return process.argv.includes(`--${nome}`);
}

function normalizarCaminho(caminho) {
  const valor = String(caminho || '').trim();
  if (!valor) return '';
  if (/^https?:\/\//i.test(valor)) return valor;
  return valor.startsWith('/') ? valor : `/${valor}`;
}

async function garantirColunaImagemMobileCidades() {
  const [colunas] = await db.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'cidades'
      AND COLUMN_NAME = 'imagem_mobile'
  `);

  if (!colunas.length) {
    await db.query(`
      ALTER TABLE cidades
      ADD COLUMN imagem_mobile varchar(255) DEFAULT NULL AFTER imagem
    `);
  }
}

async function main() {
  const desktop = normalizarCaminho(obterArg('desktop', DEFAULT_DESKTOP));
  const mobile = normalizarCaminho(obterArg('mobile', DEFAULT_MOBILE));
  const estado = obterArg('estado').toUpperCase();
  const onlyEmpty = temFlag('only-empty');
  const dryRun = temFlag('dry-run');

  if (!desktop || !mobile) {
    throw new Error('Informe --desktop=/caminho/imagem.png e --mobile=/caminho/imagem-mobile.png');
  }

  await garantirColunaImagemMobileCidades();

  const where = [];
  const params = [];

  if (estado) {
    where.push('UPPER(estado) = ?');
    params.push(estado);
  }

  if (onlyEmpty) {
    where.push(`(
      imagem IS NULL OR imagem = ''
      OR imagem_mobile IS NULL OR imagem_mobile = ''
    )`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM cidades ${whereSql}`, params);

  console.log(`Cidades encontradas: ${total}`);
  console.log(`Desktop: ${desktop}`);
  console.log(`Mobile: ${mobile}`);
  console.log(`Filtro estado: ${estado || 'todos'}`);
  console.log(`Somente vazias: ${onlyEmpty ? 'sim' : 'nao'}`);

  if (dryRun) {
    console.log('Dry-run ativo: nenhuma cidade foi atualizada.');
    return;
  }

  const [resultado] = await db.query(
    `
    UPDATE cidades
    SET imagem = ?,
        imagem_mobile = ?,
        updated_at = NOW()
    ${whereSql}
    `,
    [desktop, mobile, ...params]
  );

  console.log(`Cidades atualizadas: ${resultado.affectedRows}`);
}

main()
  .catch(error => {
    console.error('Erro ao atualizar banners das cidades:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
  });
