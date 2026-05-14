const jwt = require('jsonwebtoken');
require('dotenv').config();
const db = require('./../database/pool_connection'); // ajuste se necessário

const { JWT_SECRET } = process.env;

function checkAuth(role = null) {
  return async (req, res, next) => {
    try {
      // Se tiver role (admin/user/public), NÃO consulta o db
      if (role) {
        return validarPermissaoEContinuar(role, req, res, next);
      }

      // Caso contrário → consulta o banco para pegar o status_acesso
      const [rows] = await db.query(`
        SELECT status_acesso 
        FROM permissoes_paginas 
        WHERE id = 1 LIMIT 1
      `);

      if (!rows.length) {
        console.log('Nenhum registro encontrado na tabela permissoes_paginas!');
        return res.status(500).send('Configuração de permissão não encontrada.');
      }

      const status = rows[0].status_acesso; //
      //console.log('status_acesso:', status);

      return validarPermissaoEContinuar(status, req, res, next);

    } catch (error) {
      console.error('Erro no middleware checkAuth:', error);
      req.session?.destroy?.();
      return res.status(401).redirect('/login');
    }
  };
}

async function validarPermissaoEContinuar(role, req, res, next) {
  try {
    // Se for PUBLIC → passa direto
    if (role === 'public') {
      return next();
    }

    // Se for PRIVATE → exige login
    if (!req.session.token) {
      return res.status(401).redirect('/login');
    }

    // Decodifica token
    const decoded = jwt.verify(req.session.token, JWT_SECRET);
    req.user = decoded;

    // Se for PRIVATE → precisa ser admin
    if (role === 'private' && decoded.id !== 1) {
      return res.status(403).redirect('/pagina-restrita');
    }

    return next(); // → se for admin, continua

  } catch (error) {
    console.error('Erro na validação de token:', error);
    req.session?.destroy?.();
    return res.status(401).redirect('/login');
  }
}

module.exports = checkAuth;