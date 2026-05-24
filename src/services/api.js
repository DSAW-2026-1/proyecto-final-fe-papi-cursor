import axios from 'axios';

// Configuración base de Axios
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? 'https://market-place-dsaw-26-01.vercel.app/api' : 'http://localhost:3000/api'),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación y suspensión
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    if (error.response?.status === 403 && error.response?.data?.suspended) {
      // Cuenta suspendida: cerrar sesión y mostrar mensaje en login
      const msg = encodeURIComponent(error.response.data.error || 'Tu cuenta ha sido suspendida.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = `/login?suspended=${msg}`;
    }
    return Promise.reject(error);
  }
);

// Servicios de autenticación
export const authService = {
  register:        (data) => api.post('/auth/register', data),
  login:           (data) => api.post('/auth/login', data),
  getProfile:      ()     => api.get('/auth/profile'),
  updateProfile:   (data) => api.put('/auth/profile', data),
  changePassword:  (data) => api.put('/auth/change-password', data),
  becomeSeller:    ()     => api.post('/auth/become-seller'),
  leaveSeller:     ()     => api.post('/auth/leave-seller'),
};

// Servicios de productos
export const productService = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getMyProducts: () => api.get('/products/my/products'),
};

// Servicios de carrito
export const cartService = {
  get: () => api.get('/cart'),
  add: (data) => api.post('/cart/add', data),
  update: (itemId, data) => api.put(`/cart/update/${itemId}`, data),
  remove: (itemId) => api.delete(`/cart/remove/${itemId}`),
  clear: () => api.delete('/cart/clear'),
};

// Servicios de órdenes
export const orderService = {
  create: () => api.post('/orders/create'),
  getMyOrders: () => api.get('/orders/my-orders'),
  getById: (id) => api.get(`/orders/${id}`),
  deliver: (id) => api.patch(`/orders/${id}/deliver`),
  confirmReceipt: (id) => api.patch(`/orders/${id}/confirm-receipt`),
  cancel: (id) => api.patch(`/orders/${id}/cancel`),
};

// Servicios de conversaciones
export const conversationService = {
  create: (data) => api.post('/conversations', data),
  getAll: () => api.get('/conversations'),
  getById: (id) => api.get(`/conversations/${id}`),
  getMessages: (id, params) => api.get(`/conversations/${id}/messages`, { params }),
  sendMessage: (id, data) => api.post(`/conversations/${id}/messages`, data),
};

// Servicios de reseñas
export const reviewService = {
  create: (data) => api.post('/reviews', data),
  getBySeller: (sellerId, params) => api.get('/reviews', { params: { sellerId, ...params } }),
  // Reseñas por producto (Prompt 3)
  getByProduct: (productId) => api.get(`/products/${productId}/reviews`),
  createForProduct: (productId, data) => api.post(`/products/${productId}/reviews`, data),
};

// Servicios de notificaciones
export const notificationService = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

// Servicios de reportes
export const reportService = {
  create: (data) => api.post('/reports', data),
};

// Servicios de admin
export const adminService = {
  getDashboard:      () => api.get('/admin/dashboard'),
  getUsers:          (search) => api.get('/admin/users', { params: search ? { search } : {} }),
  createUser:        (data) => api.post('/admin/users', data),
  deleteUser:        (id) => api.delete(`/admin/users/${id}`),
  suspendUser:       (id, days) => api.patch(`/admin/users/${id}/suspend`, { days }),
  updateUserStatus:  (id, data) => api.put(`/admin/users/${id}/status`, data),
  getProducts:       (search) => api.get('/admin/products', { params: search ? { search } : {} }),
  deleteProduct:     (id) => api.delete(`/admin/products/${id}`),
  hideProduct:       (id) => api.patch(`/admin/products/${id}/hide`),
  getOrders:         () => api.get('/admin/orders'),
  getReports:        (params) => api.get('/admin/reports', { params }),
  resolveReport:     (id) => api.put(`/admin/reports/${id}/resolve`),
  adminLogin:        (data) => api.post('/auth/admin-login', data),
};

export default api;
