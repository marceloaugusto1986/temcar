// Seleção de banners de uma cidade em `regioes_imagens`.
//
// Fonte ÚNICA de verdade compartilhada entre o painel admin
// (routes/rotas_paginas/rotas_admin/home.js) e o endpoint público
// (routes/rotas_paginas/cidade.js), para que a página pública mostre exatamente
// os mesmos banners que o admin gerencia — evitando registros "fantasma".
//
// Regra: além dos banners com `cidade_id` da cidade, também casamos linhas
// legadas (sem `cidade_id`) pelo nome. Linhas legadas com `estado IS NULL` só
// entram quando NÃO há cidade homônima (ex.: existe Mesquita-RJ e Mesquita-MG);
// nesse caso exigimos o estado exato, senão um banner órfão apareceria na UF
// errada.
async function buscarBannersRegioesCidade(db, cidade, colunas = 'id, imagem, imagem_mobile, link') {
  const [[duplicidade]] = await db.query(
    'SELECT COUNT(*) AS total FROM cidades WHERE nome = ?',
    [cidade.nome]
  );

  let whereLegado = 'cidade = ? AND estado = ?';
  if (Number(duplicidade.total) <= 1) {
    whereLegado = '(cidade = ? AND (estado = ? OR estado IS NULL))';
  }

  const [linhas] = await db.query(
    `SELECT ${colunas}
       FROM regioes_imagens
      WHERE cidade_id = ?
         OR (cidade_id IS NULL AND ${whereLegado})
      ORDER BY id ASC`,
    [cidade.id, cidade.nome, cidade.estado]
  );

  return linhas;
}

module.exports = { buscarBannersRegioesCidade };
