"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const database_1 = __importDefault(require("../config/database"));
class Token {
    // Crear token de recuperación de contraseña
    static async createPasswordResetToken(userId) {
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hora
        const query = `
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `;
        await database_1.default.execute(query, [userId, token, expiresAt]);
        return token;
    }
    // Verificar token de recuperación
    static async verifyPasswordResetToken(token) {
        const query = `
      SELECT * FROM password_reset_tokens 
      WHERE token = ? 
      AND expires_at > NOW() 
      AND used = FALSE
    `;
        const [rows] = await database_1.default.execute(query, [token]);
        if (rows.length === 0) {
            return null;
        }
        return rows[0];
    }
    // Marcar token como usado
    static async markPasswordTokenAsUsed(token) {
        const query = 'UPDATE password_reset_tokens SET used = TRUE WHERE token = ?';
        const [result] = await database_1.default.execute(query, [token]);
        return result.affectedRows > 0;
    }
    // Crear refresh token
    static async createRefreshToken(userId) {
        const token = crypto_1.default.randomBytes(64).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 24 * 3600000); // 30 días
        const query = `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `;
        await database_1.default.execute(query, [userId, token, expiresAt]);
        return token;
    }
    // Verificar refresh token
    static async verifyRefreshToken(token) {
        const query = `
      SELECT * FROM refresh_tokens 
      WHERE token = ? 
      AND expires_at > NOW() 
      AND revoked = FALSE
    `;
        const [rows] = await database_1.default.execute(query, [token]);
        if (rows.length === 0) {
            return null;
        }
        return rows[0];
    }
    // Revocar refresh token
    static async revokeRefreshToken(token, replacedByToken) {
        const query = `
      UPDATE refresh_tokens 
      SET revoked = TRUE, 
          revoked_at = NOW(),
          replaced_by_token = ?
      WHERE token = ?
    `;
        const [result] = await database_1.default.execute(query, [replacedByToken || null, token]);
        return result.affectedRows > 0;
    }
    // Revocar todos los refresh tokens de un usuario
    static async revokeAllUserRefreshTokens(userId) {
        const query = `
      UPDATE refresh_tokens 
      SET revoked = TRUE, revoked_at = NOW()
      WHERE user_id = ? AND revoked = FALSE
    `;
        const [result] = await database_1.default.execute(query, [userId]);
        return result.affectedRows > 0;
    }
    // Crear sesión
    static async createSession(sessionData) {
        const token = crypto_1.default.randomBytes(64).toString('hex');
        const expiresAt = sessionData.expires_at || new Date(Date.now() + 24 * 3600000); // 24 horas por defecto
        const query = `
      INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `;
        await database_1.default.execute(query, [
            sessionData.user_id,
            token,
            sessionData.ip_address || null,
            sessionData.user_agent || null,
            expiresAt
        ]);
        return token;
    }
    // Verificar sesión
    static async verifySession(token) {
        const query = `
      SELECT * FROM user_sessions 
      WHERE session_token = ? 
      AND expires_at > NOW()
    `;
        const [rows] = await database_1.default.execute(query, [token]);
        if (rows.length === 0) {
            return null;
        }
        // Actualizar última actividad
        await this.updateSessionActivity(token);
        return rows[0];
    }
    // Actualizar actividad de sesión
    static async updateSessionActivity(token) {
        const query = 'UPDATE user_sessions SET last_activity = NOW() WHERE session_token = ?';
        await database_1.default.execute(query, [token]);
    }
    // Eliminar sesión
    static async deleteSession(token) {
        const query = 'DELETE FROM user_sessions WHERE session_token = ?';
        const [result] = await database_1.default.execute(query, [token]);
        return result.affectedRows > 0;
    }
    // Eliminar todas las sesiones de un usuario
    static async deleteAllUserSessions(userId) {
        const query = 'DELETE FROM user_sessions WHERE user_id = ?';
        const [result] = await database_1.default.execute(query, [userId]);
        return result.affectedRows > 0;
    }
    // Limpiar tokens expirados (para ejecutar periódicamente)
    static async cleanupExpiredTokens() {
        await database_1.default.execute('CALL cleanup_expired_tokens()');
    }
}
exports.default = Token;
