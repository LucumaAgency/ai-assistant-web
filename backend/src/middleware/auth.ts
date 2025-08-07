import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Token from '../models/Token';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Extender la interfaz Request para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: any;
      session?: any;
    }
  }
}

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

// Middleware para verificar JWT token
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      
      // Obtener usuario actualizado de la BD
      const user = await User.findById(decoded.userId);
      
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
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor durante la autenticación'
    });
  }
};

// Middleware para verificar sesión (alternativa a JWT)
export const authenticateSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const sessionToken = req.headers['x-session-token'] as string;

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: 'Token de sesión no proporcionado'
      });
    }

    const session = await Token.verifySession(sessionToken);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Sesión inválida o expirada'
      });
    }

    // Obtener usuario
    const user = await User.findById(session.user_id);

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
  } catch (error) {
    console.error('Error en autenticación de sesión:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor durante la autenticación'
    });
  }
};

// Middleware para verificar roles específicos
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
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

// Middleware opcional: si hay token lo verifica, si no, continúa
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        const user = await User.findById(decoded.userId);
        
        if (user && user.is_active) {
          req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          };
        }
      } catch (jwtError) {
        // Token inválido, pero continuamos sin usuario
        console.log('Token inválido en auth opcional');
      }
    }

    next();
  } catch (error) {
    console.error('Error en autenticación opcional:', error);
    next();
  }
};