"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = __importDefault(require("../config/database"));
class User {
    // Crear nuevo usuario
    static async create(userData) {
        const { email, password, name, role = 'user' } = userData;
        if (!password) {
            throw new Error('Password is required');
        }
        // Hash de la contraseña
        const saltRounds = 10;
        const password_hash = await bcrypt_1.default.hash(password, saltRounds);
        const query = `
      INSERT INTO users (email, password_hash, name, role, email_verified)
      VALUES (?, ?, ?, ?, ?)
    `;
        try {
            const [result] = await database_1.default.execute(query, [
                email,
                password_hash,
                name,
                role,
                false
            ]);
            return result.insertId;
        }
        catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('El email ya está registrado');
            }
            throw error;
        }
    }
    // Buscar usuario por email
    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = ? AND is_active = TRUE';
        const [rows] = await database_1.default.execute(query, [email]);
        if (rows.length === 0) {
            return null;
        }
        return rows[0];
    }
    // Buscar usuario por ID
    static async findById(id) {
        const query = 'SELECT * FROM users WHERE id = ? AND is_active = TRUE';
        const [rows] = await database_1.default.execute(query, [id]);
        if (rows.length === 0) {
            return null;
        }
        return rows[0];
    }
    // Verificar contraseña
    static async verifyPassword(email, password) {
        const user = await this.findByEmail(email);
        if (!user || !user.password_hash) {
            return null;
        }
        const isValid = await bcrypt_1.default.compare(password, user.password_hash);
        if (!isValid) {
            return null;
        }
        // Actualizar último login
        await this.updateLastLogin(user.id);
        // No devolver el hash de la contraseña
        delete user.password_hash;
        return user;
    }
    // Actualizar último login
    static async updateLastLogin(userId) {
        const query = 'UPDATE users SET last_login = NOW() WHERE id = ?';
        await database_1.default.execute(query, [userId]);
    }
    // Registrar intento de login
    static async logLoginAttempt(attempt) {
        const query = `
      INSERT INTO login_attempts (email, ip_address, success)
      VALUES (?, ?, ?)
    `;
        await database_1.default.execute(query, [attempt.email, attempt.ip_address, attempt.success]);
    }
    // Verificar intentos de login (para rate limiting)
    static async getRecentLoginAttempts(email, ip_address, minutes = 15) {
        const query = `
      SELECT COUNT(*) as count
      FROM login_attempts
      WHERE (email = ? OR ip_address = ?)
      AND success = FALSE
      AND attempted_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)
    `;
        const [rows] = await database_1.default.execute(query, [email, ip_address, minutes]);
        return rows[0].count;
    }
    // Actualizar usuario
    static async update(userId, userData) {
        const fields = [];
        const values = [];
        // Construir la consulta dinámicamente
        for (const [key, value] of Object.entries(userData)) {
            if (key !== 'id' && key !== 'password' && value !== undefined) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        if (fields.length === 0) {
            return false;
        }
        values.push(userId);
        const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await database_1.default.execute(query, values);
        return result.affectedRows > 0;
    }
    // Cambiar contraseña
    static async changePassword(userId, newPassword) {
        const saltRounds = 10;
        const password_hash = await bcrypt_1.default.hash(newPassword, saltRounds);
        const query = 'UPDATE users SET password_hash = ? WHERE id = ?';
        const [result] = await database_1.default.execute(query, [password_hash, userId]);
        return result.affectedRows > 0;
    }
    // Verificar email
    static async verifyEmail(userId) {
        const query = 'UPDATE users SET email_verified = TRUE, email_verification_token = NULL WHERE id = ?';
        const [result] = await database_1.default.execute(query, [userId]);
        return result.affectedRows > 0;
    }
    // Crear token de verificación de email
    static async createEmailVerificationToken(userId) {
        const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const query = 'UPDATE users SET email_verification_token = ? WHERE id = ?';
        await database_1.default.execute(query, [token, userId]);
        return token;
    }
    // Buscar por token de verificación
    static async findByVerificationToken(token) {
        const query = 'SELECT * FROM users WHERE email_verification_token = ?';
        const [rows] = await database_1.default.execute(query, [token]);
        if (rows.length === 0) {
            return null;
        }
        return rows[0];
    }
}
exports.default = User;
