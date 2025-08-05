"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Create connection pool for better performance
const pool = promise_1.default.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 'carlosm_ai_assistant',
    user: process.env.DB_USER || 'carlosm_ai_assistant',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
// Test database connection
pool.getConnection()
    .then(connection => {
    console.log('✅ Database connected successfully');
    connection.release();
})
    .catch(err => {
    console.error('❌ Database connection failed:', err);
});
exports.default = pool;
