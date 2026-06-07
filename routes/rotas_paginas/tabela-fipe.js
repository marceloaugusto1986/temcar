const express = require('express');
const https = require('https');
const { URL } = require('url');
const { getSeo } = require('../../helpers/seo');

const router = express.Router();
const SITE_URL = (process.env.SITE_URL || 'https://www.temcar.com.br').replace(/\/$/, '');
const FIPE_BASE_URL = 'https://parallelum.com.br/fipe/api/v1';
const CACHE_TTL = 6 * 60 * 60 * 1000;
const cache = new Map();

const tiposValidos = new Set(['carros', 'motos', 'caminhoes']);

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);

    const req = https.get({
      hostname: parsedUrl.hostname,
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'TEMCAR/1.0'
      },
      timeout: 10000
    }, (response) => {
      let body = '';

      response.setEncoding('utf8');
      response.on('data', chunk => {
        body += chunk;
      });

      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const error = new Error(`FIPE respondeu com status ${response.statusCode}`);
          error.statusCode = response.statusCode;
          return reject(error);
        }

        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error('Resposta inválida da API FIPE'));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Tempo esgotado ao consultar a API FIPE'));
    });

    req.on('error', reject);
  });
}

async function getCachedJson(path) {
  const cached = cache.get(path);
  const now = Date.now();

  if (cached && now - cached.createdAt < CACHE_TTL) {
    return cached.data;
  }

  const data = await requestJson(`${FIPE_BASE_URL}${path}`);
  cache.set(path, { data, createdAt: now });
  return data;
}

function validateTipo(req, res, next) {
  if (!tiposValidos.has(req.params.tipo)) {
    return res.status(400).json({ message: 'Tipo de veículo inválido.' });
  }

  next();
}

function encodePathValue(value) {
  return encodeURIComponent(String(value || '').trim());
}

router.get('/tabela-fipe', async (req, res) => {
  const seo = await getSeo('tabela_fipe');
  const breadcrumbs = [
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Tabela FIPE', url: `${SITE_URL}/tabela-fipe` }
  ];

  res.render('tabela-fipe', { seo, breadcrumbs });
});

router.get('/api/fipe/:tipo/marcas', validateTipo, async (req, res) => {
  try {
    const data = await getCachedJson(`/${req.params.tipo}/marcas`);
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar marcas FIPE:', error.message);
    res.status(502).json({ message: 'Não foi possível carregar as marcas da Tabela FIPE.' });
  }
});

router.get('/api/fipe/:tipo/marcas/:marca/modelos', validateTipo, async (req, res) => {
  try {
    const { tipo, marca } = req.params;
    const data = await getCachedJson(`/${tipo}/marcas/${encodePathValue(marca)}/modelos`);
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar modelos FIPE:', error.message);
    res.status(502).json({ message: 'Não foi possível carregar os modelos da Tabela FIPE.' });
  }
});

router.get('/api/fipe/:tipo/marcas/:marca/modelos/:modelo/anos', validateTipo, async (req, res) => {
  try {
    const { tipo, marca, modelo } = req.params;
    const data = await getCachedJson(`/${tipo}/marcas/${encodePathValue(marca)}/modelos/${encodePathValue(modelo)}/anos`);
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar anos FIPE:', error.message);
    res.status(502).json({ message: 'Não foi possível carregar os anos da Tabela FIPE.' });
  }
});

router.get('/api/fipe/:tipo/marcas/:marca/modelos/:modelo/anos/:ano', validateTipo, async (req, res) => {
  try {
    const { tipo, marca, modelo, ano } = req.params;
    const data = await getCachedJson(`/${tipo}/marcas/${encodePathValue(marca)}/modelos/${encodePathValue(modelo)}/anos/${encodePathValue(ano)}`);
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar valor FIPE:', error.message);
    res.status(502).json({ message: 'Não foi possível consultar o valor da Tabela FIPE.' });
  }
});

module.exports = router;
