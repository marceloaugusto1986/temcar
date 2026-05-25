const mysql = require('mysql2/promise');
require('dotenv').config();

const {
    DB_HOST,
    HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_NAME
} = process.env;

const pool = mysql.createPool({
    host: DB_HOST || HOST || 'localhost',
    port: Number(DB_PORT || 3306),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
