# Ambiente Local

## Primeira vez

```bash
cp .env.example .env
npm install
npm run db:up
npm run dev
```

A aplicação fica em:

```text
http://localhost:3000
```

O MySQL local fica em:

```text
127.0.0.1:3307
database: temcar
user: temcar
password: temcar
```

Na primeira subida, o Docker importa o arquivo `temcar.sql` automaticamente.

## Comandos úteis

```bash
npm run db:logs
npm run db:down
```

Para recriar o banco do zero e importar novamente o `temcar.sql`:

```bash
npm run db:reset
```

## Validar SEO local

```bash
curl -s http://localhost:3000/carros/colatina/es | grep -Ei "<title>|description|canonical|og:title|og:description|og:url"
```
