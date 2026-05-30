require('dotenv').config();
const mysql = require('mysql2/promise');
const { HOST, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, PRIMARY_PASSWORD } = process.env;
const bcrypt = require('bcryptjs');

async function start_DB() {
    let db;

    try {
        db = await mysql.createConnection({
            host: DB_HOST || HOST || 'localhost',
            port: Number(DB_PORT || 3306),
            user: DB_USER,
            password: DB_PASSWORD
        });

        const createDatabaseQuery = `CREATE DATABASE IF NOT EXISTS ${DB_NAME}`;

        await db.query(createDatabaseQuery);

        await db.query(`USE ${DB_NAME}`);

        const criarTabelaDeUsuarios = `
    CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,

        -- Dados comuns
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        whatsapp VARCHAR(20),
        senha VARCHAR(255),
        tipo ENUM('revenda', 'particular'),

        -- Dados revenda
        telefone VARCHAR(20),
        cnpj VARCHAR(20),
        cep VARCHAR(10),
        rua VARCHAR(100),
        numero VARCHAR(10),
        bairro VARCHAR(50),
        cidade VARCHAR(50),
        estado VARCHAR(2),

        -- Dados particular
        cpf VARCHAR(14),
        plano_desejado VARCHAR(50),

        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`;

        await db.query(criarTabelaDeUsuarios);

        const criarTabelaCidadesRevendas = `
CREATE TABLE IF NOT EXISTS revendas_cidades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    cidade VARCHAR(150) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uniq_revenda_cidade (usuario_id, cidade, estado),
    CONSTRAINT fk_revenda_cidade_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
);
`;

        await db.query(criarTabelaCidadesRevendas);

        const criarTabelaDeAnuncios = `
CREATE TABLE IF NOT EXISTS anuncios (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Relacionamento com usuário
    usuario_id INT NOT NULL,

    -- Status do anúncio
    status ENUM('analise', 'ativo') 
        DEFAULT 'analise',

    -- Dados principais
    preco DECIMAL(10,2) NOT NULL,
    descricao TEXT NOT NULL,

    -- Destaque
    destaque BOOLEAN DEFAULT FALSE,
    destaque_ate DATETIME NULL,

    tipo VARCHAR(50),
    marca VARCHAR(50),
    versao VARCHAR(100),

    ano_fabricacao INT,
    ano_modelo INT,
    km INT,

    condicao ENUM('novo', 'usado', 'seminovo'),
    cambio VARCHAR(50),
    motorizacao VARCHAR(20),
    portas INT,
    carroceria VARCHAR(50),
    combustivel VARCHAR(50),
    tracao VARCHAR(20),
    cor VARCHAR(30),

    -- Acessórios (JSON)
    acessorios JSON,

    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Chave estrangeira
    CONSTRAINT fk_anuncios_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
);
`;

        await db.query(criarTabelaDeAnuncios);


        const criarTabelaImagens = `
CREATE TABLE IF NOT EXISTS anuncios_imagens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    anuncio_id INT NOT NULL,
    imagem VARCHAR(255) NOT NULL,
    principal BOOLEAN DEFAULT false,

    CONSTRAINT fk_imagem_anuncio
        FOREIGN KEY (anuncio_id)
        REFERENCES anuncios(id)
        ON DELETE CASCADE
);
`;

        await db.query(criarTabelaImagens);


        const criarTabelaCarouselHome = `
CREATE TABLE IF NOT EXISTS home_carousel_imagens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    imagem VARCHAR(255) NOT NULL,
    imagem_mobile VARCHAR(255),
    titulo VARCHAR(150),
    descricao VARCHAR(255),
    link VARCHAR(255),
    ordem INT DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

        await db.query(criarTabelaCarouselHome);

        const criarTabelaConfiguracoesSite = `
CREATE TABLE IF NOT EXISTS configuracoes_site (
    id INT AUTO_INCREMENT PRIMARY KEY,
    logo VARCHAR(255),
    favicon VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);
`;

        await db.query(criarTabelaConfiguracoesSite);

        await db.query(`
  INSERT INTO configuracoes_site (logo, favicon)
  SELECT NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM configuracoes_site)
`);

        const criarTabelaLogosRevendas = `
CREATE TABLE IF NOT EXISTS revendas_logos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    logo VARCHAR(255) NOT NULL,
    padrao BOOLEAN DEFAULT false,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_logo_revenda_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_logo_por_usuario
        UNIQUE (usuario_id)
);
`;

        await db.query(criarTabelaLogosRevendas);


                const criarTabelaLogoPadraoRevenda = `
        CREATE TABLE IF NOT EXISTS revenda_logo_padrao (
            id INT AUTO_INCREMENT PRIMARY KEY,
            caminho VARCHAR(255) NOT NULL,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_logo_padrao UNIQUE (caminho)
        );
        `;
        
                await db.query(criarTabelaLogoPadraoRevenda);
        
        
                const inserirLogoPadrao = `
        INSERT INTO revenda_logo_padrao (caminho)
        SELECT '/icones/logo_pad_revenda.jpg'
        WHERE NOT EXISTS (
          SELECT 1 FROM revenda_logo_padrao
        );
        `;
        
                await db.query(inserirLogoPadrao);

        const criarTabelaOpcoesSelect = `
CREATE TABLE IF NOT EXISTS servicos_select (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    url VARCHAR(255) NOT NULL,
    ordem INT DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

        await db.query(criarTabelaOpcoesSelect);

        const criarTabelaSeoDinamico = `
CREATE TABLE IF NOT EXISTS seo_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pagina VARCHAR(100) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    keywords TEXT,
    texto_h1 VARCHAR(255),
    texto_conteudo TEXT,
    link_canonico VARCHAR(255),
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

        await db.query(criarTabelaSeoDinamico);

        const criarTabelaQuemSomos = `
CREATE TABLE IF NOT EXISTS quem_somos_blocos (
    id INT AUTO_INCREMENT PRIMARY KEY,

    titulo VARCHAR(255),
    subtitulo VARCHAR(255),
    texto TEXT NOT NULL,

    ordem INT DEFAULT 0,
    ativo BOOLEAN DEFAULT true,

    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

        await db.query(criarTabelaQuemSomos);

        const criarTabelaFaleConosco = `
CREATE TABLE IF NOT EXISTS fale_conosco_blocos (
    id INT AUTO_INCREMENT PRIMARY KEY,

    titulo VARCHAR(255),
    subtitulo VARCHAR(255),
    texto TEXT NOT NULL,

    ordem INT DEFAULT 0,
    ativo BOOLEAN DEFAULT true,

    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

        await db.query(criarTabelaFaleConosco);

        const criarTabelaRegrasGerais = `
CREATE TABLE IF NOT EXISTS regras_gerais_blocos (
    id INT AUTO_INCREMENT PRIMARY KEY,

    titulo VARCHAR(255),
    subtitulo VARCHAR(255),
    texto TEXT NOT NULL,

    ordem INT DEFAULT 0,
    ativo BOOLEAN DEFAULT true,

    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

        await db.query(criarTabelaRegrasGerais);

        const criarTabelaPoliticaPrivacidade = `
CREATE TABLE IF NOT EXISTS politica_privacidade_blocos (
    id INT AUTO_INCREMENT PRIMARY KEY,

    titulo VARCHAR(255),
    subtitulo VARCHAR(255),
    texto TEXT NOT NULL,

    ordem INT DEFAULT 0,
    ativo BOOLEAN DEFAULT true,

    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

        await db.query(criarTabelaPoliticaPrivacidade);

        const criarTabelaTermosUso = `
CREATE TABLE IF NOT EXISTS termos_uso_blocos (
    id INT AUTO_INCREMENT PRIMARY KEY,

    titulo VARCHAR(255),
    subtitulo VARCHAR(255),
    texto TEXT NOT NULL,

    ordem INT DEFAULT 0,
    ativo BOOLEAN DEFAULT true,

    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

        await db.query(criarTabelaTermosUso);


        const criarTabelaRegioesImagens = `
CREATE TABLE IF NOT EXISTS regioes_imagens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cidade VARCHAR(150) NOT NULL,
  imagem VARCHAR(255) NOT NULL,
  imagem_mobile VARCHAR(255),
  link VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

        await db.query(criarTabelaRegioesImagens);

        const criarTabelaCidades = `
CREATE TABLE IF NOT EXISTS cidades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    estado VARCHAR(100) NOT NULL,
    descricao TEXT,
    imagem VARCHAR(255),
    imagem_mobile VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

await db.query(criarTabelaCidades);




        const saltRounds = 10;
        const hashedSenha = await bcrypt.hash(PRIMARY_PASSWORD, saltRounds);

        const [verificar_se_usuario_lider_existe] = await db.query('SELECT * FROM usuarios WHERE id = 1');
        if (verificar_se_usuario_lider_existe.length > 0) {
            return //console.log("Usuário lider já cadastrado.");
        } else {
            const criarPrimeiroUsuario = `
                INSERT INTO usuarios (nome, email, senha)
                VALUES ('admin', 'admin@temcar.com.br', '${hashedSenha}');
            `;

            await db.query(criarPrimeiroUsuario);
        }

    } catch (err) {
        console.error('Erro ao configurar o banco de dados:', err);
    } finally {
        if (db) {
            await db.end();
        }
    }
}

module.exports = start_DB;
