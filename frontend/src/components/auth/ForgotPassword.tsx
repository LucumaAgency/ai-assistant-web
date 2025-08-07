import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: ''
  });
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('https://ai-assistant-web-backend.onrender.com/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        
        // Redirigir después de 3 segundos
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setErrors({ general: data.message || 'Error al enviar el email' });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setErrors({ general: 'Error al conectar con el servidor. Por favor intente nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="success-container">
            <div className="success-icon">✓</div>
            <h2>Email Enviado</h2>
            <p>
              Hemos enviado instrucciones para restablecer tu contraseña a {formData.email}
            </p>
            <p className="text-muted">
              Serás redirigido al inicio de sesión en unos segundos...
            </p>
            <Link to="/login" className="btn-secondary">
              Ir a Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>¿Olvidaste tu contraseña?</h2>
          <p>No te preocupes, te enviaremos instrucciones para restablecerla</p>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {errors.general && (
            <div className="error-message">{errors.general}</div>
          )}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              className={errors.email ? 'error' : ''}
            />
            {errors.email && (
              <span className="field-error">{errors.email}</span>
            )}
          </div>
          
          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Enviando...' : 'Enviar Instrucciones'}
          </button>
        </form>
        
        <div className="auth-footer">
          <Link to="/login" className="link">
            ← Volver a Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;