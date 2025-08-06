import crypto from 'crypto';
import db from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface PasswordResetToken {
  id?: number;
  user_id: number;
  token: string;
  expires_at: Date;
  used?: boolean;
}

export interface RefreshToken {
  id?: number;
  user_id: number;
  token: string;
  expires_at: Date;
  revoked?: boolean;
  replaced_by_token?: string;
}

export interface SessionToken {
  id?: number;
  user_id: number;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: Date;
}

class Token {
  // Crear token de recuperación de contraseña
  static async createPasswordResetToken(userId: number): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hora

    const query = `
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `;

    await db.execute(query, [userId, token, expiresAt]);
    return token;
  }

  // Verificar token de recuperación
  static async verifyPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    const query = `
      SELECT * FROM password_reset_tokens 
      WHERE token = ? 
      AND expires_at > NOW() 
      AND used = FALSE
    `;

    const [rows] = await db.execute<RowDataPacket[]>(query, [token]);
    
    if (rows.length === 0) {
      return null;
    }

    return rows[0] as PasswordResetToken;
  }

  // Marcar token como usado
  static async markPasswordTokenAsUsed(token: string): Promise<boolean> {
    const query = 'UPDATE password_reset_tokens SET used = TRUE WHERE token = ?';
    const [result] = await db.execute<ResultSetHeader>(query, [token]);
    
    return result.affectedRows > 0;
  }

  // Crear refresh token
  static async createRefreshToken(userId: number): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600000); // 30 días

    const query = `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `;

    await db.execute(query, [userId, token, expiresAt]);
    return token;
  }

  // Verificar refresh token
  static async verifyRefreshToken(token: string): Promise<RefreshToken | null> {
    const query = `
      SELECT * FROM refresh_tokens 
      WHERE token = ? 
      AND expires_at > NOW() 
      AND revoked = FALSE
    `;

    const [rows] = await db.execute<RowDataPacket[]>(query, [token]);
    
    if (rows.length === 0) {
      return null;
    }

    return rows[0] as RefreshToken;
  }

  // Revocar refresh token
  static async revokeRefreshToken(token: string, replacedByToken?: string): Promise<boolean> {
    const query = `
      UPDATE refresh_tokens 
      SET revoked = TRUE, 
          revoked_at = NOW(),
          replaced_by_token = ?
      WHERE token = ?
    `;

    const [result] = await db.execute<ResultSetHeader>(query, [replacedByToken || null, token]);
    return result.affectedRows > 0;
  }

  // Revocar todos los refresh tokens de un usuario
  static async revokeAllUserRefreshTokens(userId: number): Promise<boolean> {
    const query = `
      UPDATE refresh_tokens 
      SET revoked = TRUE, revoked_at = NOW()
      WHERE user_id = ? AND revoked = FALSE
    `;

    const [result] = await db.execute<ResultSetHeader>(query, [userId]);
    return result.affectedRows > 0;
  }

  // Crear sesión
  static async createSession(sessionData: SessionToken): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = sessionData.expires_at || new Date(Date.now() + 24 * 3600000); // 24 horas por defecto

    const query = `
      INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    await db.execute(query, [
      sessionData.user_id,
      token,
      sessionData.ip_address || null,
      sessionData.user_agent || null,
      expiresAt
    ]);

    return token;
  }

  // Verificar sesión
  static async verifySession(token: string): Promise<SessionToken | null> {
    const query = `
      SELECT * FROM user_sessions 
      WHERE session_token = ? 
      AND expires_at > NOW()
    `;

    const [rows] = await db.execute<RowDataPacket[]>(query, [token]);
    
    if (rows.length === 0) {
      return null;
    }

    // Actualizar última actividad
    await this.updateSessionActivity(token);

    return rows[0] as SessionToken;
  }

  // Actualizar actividad de sesión
  static async updateSessionActivity(token: string): Promise<void> {
    const query = 'UPDATE user_sessions SET last_activity = NOW() WHERE session_token = ?';
    await db.execute(query, [token]);
  }

  // Eliminar sesión
  static async deleteSession(token: string): Promise<boolean> {
    const query = 'DELETE FROM user_sessions WHERE session_token = ?';
    const [result] = await db.execute<ResultSetHeader>(query, [token]);
    
    return result.affectedRows > 0;
  }

  // Eliminar todas las sesiones de un usuario
  static async deleteAllUserSessions(userId: number): Promise<boolean> {
    const query = 'DELETE FROM user_sessions WHERE user_id = ?';
    const [result] = await db.execute<ResultSetHeader>(query, [userId]);
    
    return result.affectedRows > 0;
  }

  // Limpiar tokens expirados (para ejecutar periódicamente)
  static async cleanupExpiredTokens(): Promise<void> {
    await db.execute('CALL cleanup_expired_tokens()');
  }
}

export default Token;