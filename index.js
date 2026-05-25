const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const { SESSION_SECRET } = process.env;

const start_DB = require('./database/start_db');

/* Sitemap */
const RotasSitemap = require('./routes/sitemap');

/* Rotas Gerais */
const RotasDeLogout = require('./routes/logout');
const RotasPoliticaDePrivacidade = require('./routes/rotas_paginas/politica-de-privacidade');
const RotasCadastro = require('./routes/rotas_paginas/cadastro');

const RotasHome = require('./routes/rotas_paginas/home');
const RotasVenda = require('./routes/rotas_paginas/venda');
const RotasFiltro = require('./routes/rotas_paginas/filtro');
const RotasBuscarRevendas = require('./routes/rotas_paginas/buscar-revendas');
const RotasBuscarCidades = require('./routes/rotas_paginas/buscar-cidades');
const RotasCidade = require('./routes/rotas_paginas/cidade');
const RotasRevenda = require('./routes/rotas_paginas/revenda');
const RotasParticular = require('./routes/rotas_paginas/particular');
const RotasLogin = require('./routes/rotas_paginas/login');
const RotasMinhaAnunciar = require('./routes/rotas_paginas/anunciar');
const RotasCriarConta = require('./routes/rotas_paginas/criar-conta');
const RotasCadastroParticular = require('./routes/rotas_paginas/cadastro-particular');
const RotasCadastroRevenda = require('./routes/rotas_paginas/cadastro-revenda');
const RotasAnuncioAnalise = require("./routes/rotas_paginas/rotas_painel/anuncio-em-analise");
const RotasInfoAnunciantes = require('./routes/rotas_paginas/rotas_painel/info_usuario');

const RotasQuemSomos = require('./routes/rotas_paginas/quem_somos');
const RotasFaleConosco = require('./routes/rotas_paginas/fale_conosco');
const RotasRegrasGerais = require('./routes/rotas_paginas/regras_gerais');
const RotasTermosUso = require('./routes/rotas_paginas/termos_uso');
const RotasPlanosParticular = require('./routes/rotas_paginas/planos-particular');
const RotasPlanosRevenda = require('./routes/rotas_paginas/planos-revenda');
const RotasVeiculos = require('./routes/rotas_paginas/veiculos');
const RotasBairros = require('./routes/bairros'); // ← BAIRROS


/* Rotas Admin */
const RotasDoAdminHome = require('./routes/rotas_paginas/rotas_admin/home');

/* Rotas Painel */
const RotasPainelHome = require('./routes/rotas_paginas/rotas_painel/home');

const RotasCrudAnuncios = require("./routes/rotas_paginas/rotas_painel/crud-anuncios");

const app = express();
const PORT = process.env.PORT || 3000;
const DOMAIN = "localhost";
const SITE_URL = (process.env.SITE_URL || 'https://www.temcar.com.br').replace(/\/$/, '');

app.set('trust proxy', 1);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public/paginas'));

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Defina como true se estiver usando HTTPS
}));

/* Configurações do site (favicon/logo) - cache de 5 minutos */
let siteConfigCache = null;
let siteConfigCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

app.use(async (req, res, next) => {
    try {
        const agora = Date.now();
        if (!siteConfigCache || agora - siteConfigCacheTime > CACHE_TTL) {
            const db = require('./database/pool_connection');
            const [[config]] = await db.query('SELECT logo, favicon FROM configuracoes_site LIMIT 1');
            siteConfigCache = config || {};
            siteConfigCacheTime = agora;
        }
        res.locals.siteConfig = siteConfigCache;
    } catch (e) {
        res.locals.siteConfig = {};
    }
    next();
});

/* SEO: URL pública/canônica disponível em todos os templates */
app.use((req, res, next) => {
    const canonicalPath = req.originalUrl.split('?')[0] || '/';
    res.locals.siteUrl = SITE_URL;
    res.locals.currentUrl = `${SITE_URL}${canonicalPath === '/' ? '/' : canonicalPath}`;
    next();
});

/* Normalização de URL: remove trailing slash e força lowercase */
app.use((req, res, next) => {
    // Ignora arquivos estáticos e API
    if (req.path.startsWith('/api/') || req.path.includes('.')) return next();

    const original = req.path;
    let normalized = original;

    // Remove trailing slash (exceto raiz)
    if (normalized.length > 1 && normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
    }

    // Força lowercase
    const lower = normalized.toLowerCase();
    if (lower !== normalized) {
        normalized = lower;
    }

    if (normalized !== original) {
        const query = req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?')[1] : '';
        return res.redirect(301, normalized + query);
    }

    next();
});

/* Sitemap */
app.use('/', RotasSitemap);

app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`);
});

/* Rotas Gerais */
app.use('/', RotasLogin);
app.use('/', RotasDeLogout);
app.use('/', RotasPoliticaDePrivacidade);
app.use('/', RotasCadastro);

app.use('/', RotasHome);
app.use('/', RotasVenda);
app.use('/', RotasFiltro);
app.use('/', RotasBuscarRevendas);
app.use('/', RotasBuscarCidades);
// Rotas de /carros e /motos precisam vir antes das rotas regionais/cidade.
app.use('/', RotasVeiculos);
app.use('/', RotasCidade);
app.use('/', RotasRevenda);
app.use('/', RotasParticular);
app.use('/', RotasMinhaAnunciar);
app.use('/', RotasCriarConta);
app.use('/', RotasCadastroParticular);
app.use('/', RotasCadastroRevenda);
app.use('/', RotasAnuncioAnalise);

app.use('/', RotasQuemSomos);
app.use('/', RotasFaleConosco);
app.use('/', RotasRegrasGerais);
app.use('/', RotasTermosUso);
app.use('/', RotasPlanosParticular);
app.use('/', RotasPlanosRevenda);
app.use('/', RotasBairros); // ← BAIRROS

/* Rotas Admin */
app.use('/', RotasDoAdminHome);
app.use('/admin', RotasDoAdminHome);

/* Rotas Painel */
app.use('/', RotasPainelHome);
app.use('/', RotasCrudAnuncios);
app.use('/', RotasInfoAnunciantes);

app.use((req, res, next) => {
    res.status(404).render('error-page');
});

(async () => {
    await start_DB();

    app.listen(PORT, () => {
        console.log(`Servidor iniciado: http://${DOMAIN}:${PORT}`);
    });
})();
