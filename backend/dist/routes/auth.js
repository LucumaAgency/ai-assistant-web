"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const Token_1 = __importDefault(require("../models/Token"));
const router = express_1.default.Router();
// Configuración JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '30d';
// Función para generar JWT
const generateAccessToken = (user) => {
    return jsonwebtoken_1.default.sign({
        userId: user.id,
        email: user.email,
        role: user.role
    }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};
// =============================================
// POST /api/auth/register - Registro de usuario
// =============================================
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        // Validaciones
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos'
            });
        }
        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Email inválido'
            });
        }
        // Validar longitud de contraseña
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres'
            });
        }
        // Crear usuario
        const userId = await User_1.default.create({
            email,
            password,
            name
        });
        // Crear token de verificación de email
        const verificationToken = await User_1.default.createEmailVerificationToken(userId);
        // TODO: Enviar email de verificación
        console.log('Verification token:', verificationToken);
        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente. Por favor verifica tu email.',
            userId
        });
    }
    catch (error) {
        console.error('Error en registro:', error);
        if (error.message === 'El email ya está registrado') {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error al registrar usuario'
        });
    }
});
// =============================================
// POST /api/auth/login - Inicio de sesión
// =============================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const ip_address = req.ip || req.connection.remoteAddress || '';
        // Validaciones
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son requeridos'
            });
        }
        // Verificar intentos de login (rate limiting)
        const recentAttempts = await User_1.default.getRecentLoginAttempts(email, ip_address, 15);
        if (recentAttempts >= 5) {
            return res.status(429).json({
                success: false,
                message: 'Demasiados intentos fallidos. Por favor intenta más tarde.'
            });
        }
        // Verificar credenciales
        const user = await User_1.default.verifyPassword(email, password);
        if (!user) {
            // Registrar intento fallido
            await User_1.default.logLoginAttempt({
                email,
                ip_address,
                success: false
            });
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }
        // Verificar si el email está verificado
        if (!user.email_verified) {
            return res.status(403).json({
                success: false,
                message: 'Por favor verifica tu email antes de iniciar sesión'
            });
        }
        // Registrar intento exitoso
        await User_1.default.logLoginAttempt({
            email,
            ip_address,
            success: true
        });
        // Generar tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = await Token_1.default.createRefreshToken(user.id);
        // Crear sesión
        const sessionToken = await Token_1.default.createSession({
            user_id: user.id,
            session_token: '',
            ip_address,
            user_agent: req.headers['user-agent'],
            expires_at: new Date(Date.now() + 24 * 3600000)
        });
        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            token: accessToken,
            refreshToken,
            sessionToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatar_url: user.avatar_url
            }
        });
    }
    catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión'
        });
    }
});
// =============================================
// POST /api/auth/logout - Cerrar sesión
// =============================================
router.post('/logout', async (req, res) => {
    try {
        const { sessionToken, refreshToken } = req.body;
        if (sessionToken) {
            await Token_1.default.deleteSession(sessionToken);
        }
        if (refreshToken) {
            await Token_1.default.revokeRefreshToken(refreshToken);
        }
        res.json({
            success: true,
            message: 'Sesión cerrada exitosamente'
        });
    }
    catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cerrar sesión'
        });
    }
});
// =============================================
// POST /api/auth/forgot-password - Solicitar recuperación
// =============================================
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'El email es requerido'
            });
        }
        // Buscar usuario
        const user = await User_1.default.findByEmail(email);
        // Siempre devolver éxito para no revelar si el email existe
        if (!user) {
            return res.json({
                success: true,
                message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
            });
        }
        // Crear token de recuperación
        const resetToken = await Token_1.default.createPasswordResetToken(user.id);
        // TODO: Enviar email con el token
        console.log('Reset token:', resetToken);
        console.log('Reset URL:', `https://aiassistant.pruebalucuma.site/reset-password?token=${resetToken}`);
        res.json({
            success: true,
            message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
        });
    }
    catch (error) {
        console.error('Error en forgot-password:', error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar la solicitud'
        });
    }
});
// =============================================
// POST /api/auth/reset-password - Restablecer contraseña
// =============================================
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token y nueva contraseña son requeridos'
            });
        }
        // Validar longitud de contraseña
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres'
            });
        }
        // Verificar token
        const resetToken = await Token_1.default.verifyPasswordResetToken(token);
        if (!resetToken) {
            return res.status(400).json({
                success: false,
                message: 'Token inválido o expirado'
            });
        }
        // Cambiar contraseña
        const success = await User_1.default.changePassword(resetToken.user_id, newPassword);
        if (!success) {
            return res.status(500).json({
                success: false,
                message: 'Error al cambiar la contraseña'
            });
        }
        // Marcar token como usado
        await Token_1.default.markPasswordTokenAsUsed(token);
        // Revocar todos los refresh tokens del usuario
        await Token_1.default.revokeAllUserRefreshTokens(resetToken.user_id);
        res.json({
            success: true,
            message: 'Contraseña restablecida exitosamente'
        });
    }
    catch (error) {
        console.error('Error en reset-password:', error);
        res.status(500).json({
            success: false,
            message: 'Error al restablecer la contraseña'
        });
    }
});
// =============================================
// POST /api/auth/refresh - Renovar access token
// =============================================
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token es requerido'
            });
        }
        // Verificar refresh token
        const tokenData = await Token_1.default.verifyRefreshToken(refreshToken);
        if (!tokenData) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token inválido o expirado'
            });
        }
        // Obtener usuario
        const user = await User_1.default.findById(tokenData.user_id);
        if (!user || !user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado o inactivo'
            });
        }
        // Generar nuevo access token
        const newAccessToken = generateAccessToken(user);
        // Opcionalmente, rotar el refresh token
        await Token_1.default.revokeRefreshToken(refreshToken);
        const newRefreshToken = await Token_1.default.createRefreshToken(user.id);
        res.json({
            success: true,
            token: newAccessToken,
            refreshToken: newRefreshToken
        });
    }
    catch (error) {
        console.error('Error en refresh:', error);
        res.status(500).json({
            success: false,
            message: 'Error al renovar el token'
        });
    }
});
// =============================================
// GET /api/auth/verify-email - Verificar email
// =============================================
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Token de verificación es requerido'
            });
        }
        // Buscar usuario por token
        const user = await User_1.default.findByVerificationToken(token);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Token de verificación inválido'
            });
        }
        // Verificar email
        await User_1.default.verifyEmail(user.id);
        res.json({
            success: true,
            message: 'Email verificado exitosamente'
        });
    }
    catch (error) {
        console.error('Error en verify-email:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar el email'
        });
    }
});
// =============================================
// GET /api/auth/verify-token - Verificar si token es válido
// =============================================
router.get('/verify-token', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token no proporcionado'
            });
        }
        const token = authHeader.substring(7);
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            // Obtener usuario actualizado
            const user = await User_1.default.findById(decoded.userId);
            if (!user || !user.is_active) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no encontrado o inactivo'
                });
            }
            res.json({
                success: true,
                valid: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    avatar_url: user.avatar_url
                }
            });
        }
        catch (jwtError) {
            return res.status(401).json({
                success: false,
                valid: false,
                message: 'Token inválido o expirado'
            });
        }
    }
    catch (error) {
        console.error('Error en verify-token:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar el token'
        });
    }
});
exports.default = router;
