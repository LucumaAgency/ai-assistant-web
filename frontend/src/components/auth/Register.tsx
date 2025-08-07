import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);

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
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }
    
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Por favor confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
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
      const { confirmPassword, ...registerData } = formData;
      
      // Debug logs
      console.log('=== REGISTER DEBUG ===');
      console.log('1. Starting registration request');
      console.log('2. Register data:', registerData);
      console.log('3. Request URL:', '/api/auth/register');
      console.log('4. Full URL:', window.location.origin + '/api/auth/register');
      
      // Crear promesa con timeout aumentado
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('5. TIMEOUT: Request aborted after 30 seconds');
        controller.abort();
      }, 30000); // 30 segundos
      
      console.log('6. Sending fetch request...');
      const startTime = Date.now();
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const endTime = Date.now();
      console.log(`7. Response received in ${endTime - startTime}ms`);
      console.log('8. Response status:', response.status);
      console.log('9. Response ok:', response.ok);
      console.log('10. Response headers:', response.headers);

      const data = await response.json();
      console.log('11. Response data:', data);

      if (data.success) {
        console.log('12. Registration successful!');
        // Mostrar mensaje de éxito y redirigir al login
        alert('Registro exitoso! Por favor verifica tu email antes de iniciar sesión.');
        navigate('/login');
      } else {
        console.log('13. Registration failed:', data.message);
        setErrors({ general: data.message || 'Error al registrarse' });
      }
    } catch (error: any) {
      console.error('=== REGISTER ERROR ===');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Full error object:', error);
      
      if (error.name === 'AbortError') {
        console.error('Request was aborted - timeout after 30 seconds');
        setErrors({ general: 'El servidor no está respondiendo. Por favor intente más tarde o contacte al administrador.' });
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.error('Network error - could not connect to server');
        setErrors({ general: 'No se pudo conectar con el servidor. Verifica que el backend esté funcionando.' });
      } else {
        console.error('Unknown error type');
        setErrors({ general: 'Error al conectar con el servidor. Por favor intente nuevamente.' });
      }
    } finally {
      console.log('=== END REGISTER DEBUG ===');
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Crear Cuenta</h2>
          <p>Únete a nuestra plataforma</p>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {errors.general && (
            <div className="error-message">{errors.general}</div>
          )}
          
          <div className="form-group">
            <label htmlFor="name">Nombre completo</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Juan Pérez"
              className={errors.name ? 'error' : ''}
            />
            {errors.name && (
              <span className="field-error">{errors.name}</span>
            )}
          </div>
          
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
          
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className={errors.password ? 'error' : ''}
            />
            {errors.password && (
              <span className="field-error">{errors.password}</span>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className={errors.confirmPassword ? 'error' : ''}
            />
            {errors.confirmPassword && (
              <span className="field-error">{errors.confirmPassword}</span>
            )}
          </div>
          
          <div className="form-options">
            <label className="checkbox-label">
              <input type="checkbox" required />
              <span>Acepto los términos y condiciones</span>
            </label>
          </div>
          
          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="link">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;