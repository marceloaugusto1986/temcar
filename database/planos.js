const PLANOS_PADRAO = [
  {
    codigo: "particular-plano-1",
    nome: "PLANO 1",
    tipo_usuario: "particular",
    limite_anuncios: 1,
    limite_motos: null,
    limite_fotos: 4,
    limite_destaques: 0,
    dias_publicacao: 30,
    destaque: false,
    ordem: 1,
    descricao: "30 dias de anúncio com até 4 fotos"
  },
  {
    codigo: "particular-plano-2",
    nome: "PLANO 2",
    tipo_usuario: "particular",
    limite_anuncios: 1,
    limite_motos: null,
    limite_fotos: null,
    limite_destaques: 0,
    dias_publicacao: 60,
    destaque: false,
    ordem: 2,
    descricao: "60 dias de anúncio sem limites de fotos"
  },
  {
    codigo: "particular-plano-3",
    nome: "PLANO 3",
    tipo_usuario: "particular",
    limite_anuncios: 1,
    limite_motos: null,
    limite_fotos: null,
    limite_destaques: 1,
    dias_publicacao: 90,
    destaque: true,
    ordem: 3,
    descricao: "90 dias de anúncio em destaque sem limites de fotos"
  },
  {
    codigo: "particular-plano-4",
    nome: "PLANO 4",
    tipo_usuario: "particular",
    limite_anuncios: 1,
    limite_motos: null,
    limite_fotos: null,
    limite_destaques: 1,
    dias_publicacao: null,
    destaque: true,
    ordem: 4,
    descricao: "Anúncio em destaque até vender sem limites de fotos"
  },
  {
    codigo: "revenda-plano-10",
    nome: "PLANO 10",
    tipo_usuario: "revenda",
    limite_anuncios: 10,
    limite_motos: 1,
    limite_fotos: null,
    limite_destaques: 3,
    dias_publicacao: null,
    destaque: false,
    ordem: 10,
    descricao: "10 veículos, 1 moto e 3 destaques"
  },
  {
    codigo: "revenda-plano-15",
    nome: "PLANO 15",
    tipo_usuario: "revenda",
    limite_anuncios: 15,
    limite_motos: 2,
    limite_fotos: null,
    limite_destaques: 4,
    dias_publicacao: null,
    destaque: false,
    ordem: 15,
    descricao: "15 veículos, 2 motos e 4 destaques"
  },
  {
    codigo: "revenda-plano-20",
    nome: "PLANO 20",
    tipo_usuario: "revenda",
    limite_anuncios: 20,
    limite_motos: 3,
    limite_fotos: null,
    limite_destaques: 5,
    dias_publicacao: null,
    destaque: false,
    ordem: 20,
    descricao: "20 veículos, 3 motos e 5 destaques"
  },
  {
    codigo: "revenda-plano-25",
    nome: "PLANO 25",
    tipo_usuario: "revenda",
    limite_anuncios: 25,
    limite_motos: 4,
    limite_fotos: null,
    limite_destaques: 6,
    dias_publicacao: null,
    destaque: false,
    ordem: 25,
    descricao: "25 veículos, 4 motos e 6 destaques"
  },
  {
    codigo: "revenda-plano-30",
    nome: "PLANO 30",
    tipo_usuario: "revenda",
    limite_anuncios: 30,
    limite_motos: 5,
    limite_fotos: null,
    limite_destaques: 6,
    dias_publicacao: null,
    destaque: false,
    ordem: 30,
    descricao: "30 veículos, 5 motos e 6 destaques"
  }
];

async function colunaExiste(db, tabela, coluna) {
  const [rows] = await db.query(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    LIMIT 1
    `,
    [tabela, coluna]
  );

  return rows.length > 0;
}

async function garantirEstruturaPlanos(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS planos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      codigo VARCHAR(80) NOT NULL UNIQUE,
      nome VARCHAR(100) NOT NULL,
      tipo_usuario ENUM('particular', 'revenda') NOT NULL,
      limite_anuncios INT DEFAULT NULL,
      limite_motos INT DEFAULT NULL,
      limite_fotos INT DEFAULT NULL,
      limite_destaques INT DEFAULT 0,
      dias_publicacao INT DEFAULT NULL,
      destaque BOOLEAN DEFAULT FALSE,
      descricao TEXT,
      ordem INT DEFAULT 0,
      ativo BOOLEAN DEFAULT TRUE,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  if (!await colunaExiste(db, "usuarios", "plano_id")) {
    await db.query("ALTER TABLE usuarios ADD COLUMN plano_id INT NULL AFTER plano_desejado");
  }

  if (!await colunaExiste(db, "anuncios", "publicado_ate")) {
    await db.query("ALTER TABLE anuncios ADD COLUMN publicado_ate DATETIME NULL AFTER destaque_ate");
  }
}

async function semearPlanosPadrao(db) {
  for (const plano of PLANOS_PADRAO) {
    await db.query(
      `
      INSERT INTO planos (
        codigo,
        nome,
        tipo_usuario,
        limite_anuncios,
        limite_motos,
        limite_fotos,
        limite_destaques,
        dias_publicacao,
        destaque,
        descricao,
        ordem,
        ativo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
      ON DUPLICATE KEY UPDATE
        nome = VALUES(nome),
        tipo_usuario = VALUES(tipo_usuario),
        limite_anuncios = VALUES(limite_anuncios),
        limite_motos = VALUES(limite_motos),
        limite_fotos = VALUES(limite_fotos),
        limite_destaques = VALUES(limite_destaques),
        dias_publicacao = VALUES(dias_publicacao),
        destaque = VALUES(destaque),
        descricao = VALUES(descricao),
        ordem = VALUES(ordem),
        ativo = VALUES(ativo)
      `,
      [
        plano.codigo,
        plano.nome,
        plano.tipo_usuario,
        plano.limite_anuncios,
        plano.limite_motos,
        plano.limite_fotos,
        plano.limite_destaques,
        plano.dias_publicacao,
        plano.destaque,
        plano.descricao,
        plano.ordem
      ]
    );
  }
}

async function garantirPlanos(db) {
  await garantirEstruturaPlanos(db);
  await semearPlanosPadrao(db);
  await vincularUsuariosSemPlano(db);
}

async function vincularUsuariosSemPlano(db) {
  await db.query(`
    UPDATE usuarios u
    JOIN planos p ON p.codigo = 'particular-plano-1'
    SET u.plano_id = p.id,
        u.plano_desejado = COALESCE(NULLIF(u.plano_desejado, ''), p.nome)
    WHERE u.tipo = 'particular'
      AND u.plano_id IS NULL
  `);

  await db.query(`
    UPDATE usuarios u
    JOIN planos p ON p.codigo = 'revenda-plano-10'
    SET u.plano_id = p.id,
        u.plano_desejado = COALESCE(NULLIF(u.plano_desejado, ''), p.nome)
    WHERE u.tipo = 'revenda'
      AND u.plano_id IS NULL
  `);
}

async function listarPlanos(db, tipoUsuario = null) {
  await garantirPlanos(db);

  const params = [];
  let filtro = "WHERE ativo = TRUE";

  if (tipoUsuario) {
    filtro += " AND tipo_usuario = ?";
    params.push(tipoUsuario);
  }

  const [planos] = await db.query(
    `
    SELECT *
    FROM planos
    ${filtro}
    ORDER BY tipo_usuario ASC, ordem ASC, id ASC
    `,
    params
  );

  return planos;
}

async function buscarPlanoPorCodigoOuId(db, { codigo, id, tipoUsuario }) {
  await garantirPlanos(db);

  const params = [];
  const where = ["ativo = TRUE"];

  if (id) {
    where.push("id = ?");
    params.push(id);
  } else if (codigo) {
    where.push("codigo = ?");
    params.push(codigo);
  }

  if (tipoUsuario) {
    where.push("tipo_usuario = ?");
    params.push(tipoUsuario);
  }

  const [[plano]] = await db.query(
    `
    SELECT *
    FROM planos
    WHERE ${where.join(" AND ")}
    LIMIT 1
    `,
    params
  );

  return plano || null;
}

async function buscarPlanoDoUsuario(db, usuarioId) {
  await garantirPlanos(db);

  const [[usuario]] = await db.query(
    `
    SELECT
      u.id,
      u.tipo,
      u.plano_id,
      u.plano_desejado,
      p.*
    FROM usuarios u
    LEFT JOIN planos p ON p.id = u.plano_id
    WHERE u.id = ?
    LIMIT 1
    `,
    [usuarioId]
  );

  if (!usuario) return null;

  if (usuario.codigo) return usuario;

  const codigoPadrao = usuario.tipo === "revenda"
    ? "revenda-plano-10"
    : "particular-plano-1";

  const planoPadrao = await buscarPlanoPorCodigoOuId(db, {
    codigo: codigoPadrao,
    tipoUsuario: usuario.tipo
  });

  if (!planoPadrao) return null;

  await db.query(
    "UPDATE usuarios SET plano_id = ?, plano_desejado = ? WHERE id = ?",
    [planoPadrao.id, planoPadrao.nome, usuarioId]
  );

  return {
    ...planoPadrao,
    tipo: usuario.tipo,
    plano_id: planoPadrao.id,
    plano_desejado: planoPadrao.nome
  };
}

function tipoEhMoto(tipo) {
  return String(tipo || "").trim().toLowerCase() === "moto";
}

async function validarCriacaoAnuncio(db, usuarioId, { tipo, totalFotos }) {
  const plano = await buscarPlanoDoUsuario(db, usuarioId);

  if (!plano) {
    return { permitido: false, message: "Plano do usuário não encontrado." };
  }

  const [contagensRows] = await db.query(
    `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN LOWER(tipo) = 'moto' THEN 0 ELSE 1 END) AS veiculos,
      SUM(CASE WHEN LOWER(tipo) = 'moto' THEN 1 ELSE 0 END) AS motos,
      SUM(CASE WHEN destaque = TRUE THEN 1 ELSE 0 END) AS destaques
    FROM anuncios
    WHERE usuario_id = ?
      AND (
        status = 'analise'
        OR (
          status = 'ativo'
          AND (publicado_ate IS NULL OR publicado_ate >= NOW())
        )
      )
    `,
    [usuarioId]
  );

  const contagens = contagensRows[0] || {};
  const totalAtual = Number(contagens.total || 0);
  const veiculosAtual = Number(contagens.veiculos || 0);
  const motosAtual = Number(contagens.motos || 0);

  if (
    plano.tipo_usuario === "particular" &&
    plano.limite_anuncios != null &&
    totalAtual >= Number(plano.limite_anuncios)
  ) {
    return {
      permitido: false,
      message: `Seu plano ${plano.nome} permite até ${plano.limite_anuncios} anúncio(s).`
    };
  }

  if (
    plano.tipo_usuario === "revenda" &&
    !tipoEhMoto(tipo) &&
    plano.limite_anuncios != null &&
    veiculosAtual >= Number(plano.limite_anuncios)
  ) {
    return {
      permitido: false,
      message: `Seu plano ${plano.nome} permite até ${plano.limite_anuncios} veículo(s).`
    };
  }

  if (
    tipoEhMoto(tipo) &&
    plano.limite_motos != null &&
    motosAtual >= Number(plano.limite_motos)
  ) {
    return {
      permitido: false,
      message: `Seu plano ${plano.nome} permite até ${plano.limite_motos} moto(s).`
    };
  }

  if (plano.limite_fotos != null && Number(totalFotos || 0) > Number(plano.limite_fotos)) {
    return {
      permitido: false,
      message: `Seu plano ${plano.nome} permite até ${plano.limite_fotos} foto(s) por anúncio.`
    };
  }

  return { permitido: true, plano };
}

async function validarEdicaoAnuncio(db, usuarioId, anuncioId, { totalFotosFinal }) {
  const plano = await buscarPlanoDoUsuario(db, usuarioId);

  if (!plano) {
    return { permitido: false, message: "Plano do usuário não encontrado." };
  }

  if (plano.limite_fotos != null && Number(totalFotosFinal || 0) > Number(plano.limite_fotos)) {
    return {
      permitido: false,
      message: `Seu plano ${plano.nome} permite até ${plano.limite_fotos} foto(s) por anúncio.`
    };
  }

  const [[anuncio]] = await db.query(
    "SELECT tipo FROM anuncios WHERE id = ? AND usuario_id = ? LIMIT 1",
    [anuncioId, usuarioId]
  );

  if (!anuncio) {
    return { permitido: false, message: "Acesso negado ou anúncio não encontrado" };
  }

  return { permitido: true, plano };
}

function calcularDatasPublicacao(plano) {
  if (!plano) {
    return {
      destaque: false,
      destaqueAteSql: null,
      publicadoAteSql: null
    };
  }

  const agora = new Date();
  const publicadoAte = plano.dias_publicacao
    ? new Date(agora.getTime() + Number(plano.dias_publicacao) * 24 * 60 * 60 * 1000)
    : null;

  return {
    destaque: Boolean(plano.destaque),
    destaqueAteSql: Boolean(plano.destaque) && publicadoAte ? toMysqlDateTime(publicadoAte) : null,
    publicadoAteSql: publicadoAte ? toMysqlDateTime(publicadoAte) : null
  };
}

function toMysqlDateTime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

module.exports = {
  PLANOS_PADRAO,
  garantirPlanos,
  listarPlanos,
  buscarPlanoPorCodigoOuId,
  buscarPlanoDoUsuario,
  validarCriacaoAnuncio,
  validarEdicaoAnuncio,
  calcularDatasPublicacao
};
