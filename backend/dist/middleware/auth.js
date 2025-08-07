"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireRole = exports.authenticateSession = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const Token_1 = __importDefault(require("../models/Token"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
// Middleware para verificar JWT token
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : null;
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token de autenticación no proporcionado'
            });
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            // Obtener usuario actualizado de la BD
            const user = await User_1.default.findById(decoded.userId);
            if (!user || !user.is_active) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no encontrado o inactivo'
                });
            }
            // Agregar usuario al request
            req.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            };
            next();
        }
        catch (jwtError) {
            return res.status(401).json({
                success: false,
                message: 'Token inválido o expirado'
            });
        }
    }
    catch (error) {
        console.error('Error en autenticación:', error);
        return res.status(500).json({
            success: false,
            message: 'Error en el servidor durante la autenticación'
        });
    }
};
exports.authenticateToken = authenticateToken;
// Middleware para verificar sesión (alternativa a JWT)
const authenticateSession = async (req, res, next) => {
    try {
        const sessionToken = req.headers['x-session-token'];
        if (!sessionToken) {
            return res.status(401).json({
                success: false,
                message: 'Token de sesión no proporcionado'
            });
        }
        const session = await Token_1.default.verifySession(sessionToken);
        if (!session) {
            return res.status(401).json({
                success: false,
                message: 'Sesión inválida o expirada'
            });
        }
        // Obtener usuario
        const user = await User_1.default.findById(session.user_id);
        if (!user || !user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado o inactivo'
            });
        }
        // Agregar datos al request
        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        };
        req.session = session;
        next();
    }
    catch (error) {
        console.error('Error en autenticación de sesión:', error);
        return res.status(500).json({
            success: false,
            message: 'Error en el servidor durante la autenticación'
        });
    }
};
exports.authenticateSession = authenticateSession;
// Middleware para verificar roles específicos
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para acceder a este recurso'
            });
        }
        next();
    };
};
exports.requireRole = requireRole;
// Middleware opcional: si hay token lo verifica, si no, continúa
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : null;
        if (token) {
            try {
                const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
                const user = await User_1.default.findById(decoded.userId);
                if (user && user.is_active) {
                    req.user = {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role
                    };
                }
            }
            catch (jwtError) {
                // Token inválido, pero continuamos sin usuario
                console.log('Token inválido en auth opcional');
            }
        }
        next();
    }
    catch (error) {
        console.error('Error en autenticación opcional:', error);
        next();
    }
};
exports.optionalAuth = optionalAuth;
