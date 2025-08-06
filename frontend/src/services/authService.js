import axios from 'axios';

const API_URL = 'https://ai-assistant-web-backend.onrender.com/api';

class AuthService {
  async login(email, password) {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al iniciar sesión' };
    }
  }

  async register(name, email, password) {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        name,
        email,
        password
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al registrarse' };
    }
  }

  async forgotPassword(email) {
    try {
      const response = await axios.post(`${API_URL}/auth/forgot-password`, {
        email
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al enviar el email' };
    }
  }

  async resetPassword(token, newPassword) {
    try {
      const response = await axios.post(`${API_URL}/auth/reset-password`, {
        token,
        newPassword
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al restablecer la contraseña' };
    }
  }

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) return JSON.parse(userStr);
    return null;
  }

  getAuthToken() {
    return localStorage.getItem('authToken');
  }

  isAuthenticated() {
    return !!this.getAuthToken();
  }

  // Configure axios interceptor to add auth token to requests
  setupInterceptors() {
    axios.interceptors.request.use(
      (config) => {
        const token = this.getAuthToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    axios.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }
}

const authService = new AuthService();
authService.setupInterceptors();

export default authService;