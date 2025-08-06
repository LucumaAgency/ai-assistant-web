import bcrypt from 'bcrypt';
import db from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface UserData {
  id?: number;
  email: string;
  password?: string;
  password_hash?: string;
  name: string;
  avatar_url?: string;
  email_verified?: boolean;
  created_at?: Date;
  updated_at?: Date;
  last_login?: Date;
  is_active?: boolean;
  role?: 'user' | 'admin' | 'premium';
  google_id?: string;
  facebook_id?: string;
}

export interface LoginAttempt {
  email: string;
  ip_address: string;
  success: boolean;
}

class User {
  // Crear nuevo usuario
  static async create(userData: UserData): Promise<number> {
    const { email, password, name, role = 'user' } = userData;
    
    if (!password) {
      throw new Error('Password is required');
    }

    // Hash de la contraseña
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const query = `
      INSERT INTO users (email, password_hash, name, role, email_verified)
      VALUES (?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await db.execute<ResultSetHeader>(query, [
        email,
        password_hash,
        name,
        role,
        false
      ]);

      return result.insertId;
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('El email ya está registrado');
      }
      throw error;
    }
  }

  // Buscar usuario por email
  static async findByEmail(email: string): Promise<UserData | null> {
    const query = 'SELECT * FROM users WHERE email = ? AND is_active = TRUE';
    const [rows] = await db.execute<RowDataPacket[]>(query, [email]);
    
    if (rows.length === 0) {
      return null;
    }

    return rows[0] as UserData;
  }

  // Buscar usuario por ID
  static async findById(id: number): Promise<UserData | null> {
    const query = 'SELECT * FROM users WHERE id = ? AND is_active = TRUE';
    const [rows] = await db.execute<RowDataPacket[]>(query, [id]);
    
    if (rows.length === 0) {
      return null;
    }

    return rows[0] as UserData;
  }

  // Verificar contraseña
  static async verifyPassword(email: string, password: string): Promise<UserData | null> {
    const user = await this.findByEmail(email);
    
    if (!user || !user.password_hash) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return null;
    }

    // Actualizar último login
    await this.updateLastLogin(user.id!);

    // No devolver el hash de la contraseña
    delete user.password_hash;
    return user;
  }

  // Actualizar último login
  static async updateLastLogin(userId: number): Promise<void> {
    const query = 'UPDATE users SET last_login = NOW() WHERE id = ?';
    await db.execute(query, [userId]);
  }

  // Registrar intento de login
  static async logLoginAttempt(attempt: LoginAttempt): Promise<void> {
    const query = `
      INSERT INTO login_attempts (email, ip_address, success)
      VALUES (?, ?, ?)
    `;
    await db.execute(query, [attempt.email, attempt.ip_address, attempt.success]);
  }

  // Verificar intentos de login (para rate limiting)
  static async getRecentLoginAttempts(email: string, ip_address: string, minutes: number = 15): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM login_attempts
      WHERE (email = ? OR ip_address = ?)
      AND success = FALSE
      AND attempted_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)
    `;
    
    const [rows] = await db.execute<RowDataPacket[]>(query, [email, ip_address, minutes]);
    return rows[0].count;
  }

  // Actualizar usuario
  static async update(userId: number, userData: Partial<UserData>): Promise<boolean> {
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
    
    const [result] = await db.execute<ResultSetHeader>(query, values);
    return result.affectedRows > 0;
  }

  // Cambiar contraseña
  static async changePassword(userId: number, newPassword: string): Promise<boolean> {
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    const query = 'UPDATE users SET password_hash = ? WHERE id = ?';
    const [result] = await db.execute<ResultSetHeader>(query, [password_hash, userId]);
    
    return result.affectedRows > 0;
  }

  // Verificar email
  static async verifyEmail(userId: number): Promise<boolean> {
    const query = 'UPDATE users SET email_verified = TRUE, email_verification_token = NULL WHERE id = ?';
    const [result] = await db.execute<ResultSetHeader>(query, [userId]);
    
    return result.affectedRows > 0;
  }

  // Crear token de verificación de email
  static async createEmailVerificationToken(userId: number): Promise<string> {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const query = 'UPDATE users SET email_verification_token = ? WHERE id = ?';
    
    await db.execute(query, [token, userId]);
    return token;
  }

  // Buscar por token de verificación
  static async findByVerificationToken(token: string): Promise<UserData | null> {
    const query = 'SELECT * FROM users WHERE email_verification_token = ?';
    const [rows] = await db.execute<RowDataPacket[]>(query, [token]);
    
    if (rows.length === 0) {
      return null;
    }

    return rows[0] as UserData;
  }
}

export default User;