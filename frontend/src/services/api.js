import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (email, password) => 
    api.post('/auth/login', { email, password }),
  
  register: (userData) => 
    api.post('/auth/register', userData),
  
  getProfile: () => 
    api.get('/auth/profile'),
};

export const inventoryService = {
  getProducts: () => 
    api.get('/inventory'),
  
  getProduct: (id) => 
    api.get(`/inventory/${id}`),
  
  createProduct: (productData) => 
    api.post('/inventory', productData),
  
  updateProduct: (id, productData) => 
    api.put(`/inventory/${id}`, productData),
  
  deleteProduct: (id) => 
    api.delete(`/inventory/${id}`),
  
  getLowStockProducts: () => 
    api.get('/inventory/low-stock'),
  
  updateQuantity: (id, quantityData) => 
    api.post(`/inventory/${id}/quantity`, quantityData),
  
  triggerAutoRestock: () => 
    api.post('/inventory/auto-restock'),
};

export const employeeService = {
  getEmployees: () => 
    api.get('/employees'),
  
  getEmployee: (id) => 
    api.get(`/employees/${id}`),
  
  createEmployee: (employeeData) => 
    api.post('/employees', employeeData),
  
  updateEmployee: (id, employeeData) => 
    api.put(`/employees/${id}`, employeeData),
  
  deleteEmployee: (id) => 
    api.delete(`/employees/${id}`),
  
  getAttendance: (id) => 
    api.get(`/employees/${id}/attendance`),
  
  markAttendance: (id, attendanceData) => 
    api.post(`/employees/${id}/attendance`, attendanceData),
  
  getTasks: (id) => 
    api.get(`/employees/${id}/tasks`),
  
  assignTask: (taskData) => 
    api.post('/employees/tasks', taskData),
  
  getTools: (id) => 
    api.get(`/employees/${id}/tools`),
  
  assignTool: (toolData) => 
    api.post('/employees/tools', toolData),
  
  getComplaints: () => 
    api.get('/employees/complaints'),
  
  submitComplaint: (complaintData) => 
    api.post('/employees/complaints', complaintData),
};

export const paymentService = {
  getPayments: (filters = {}) => 
    api.get('/payments', { params: filters }),
  
  createPayment: (paymentData) => 
    api.post('/payments', paymentData),
  
  updatePayment: (id, paymentData) => 
    api.put(`/payments/${id}`, paymentData),
  
  deletePayment: (id) => 
    api.delete(`/payments/${id}`),
  
  getSalaries: () => 
    api.get('/payments/salaries'),
  
  createSalary: (salaryData) => 
    api.post('/payments/salaries', salaryData),
  
  updateSalary: (id, salaryData) => 
    api.put(`/payments/salaries/${id}`, salaryData),
  
  getFinancialSummary: (startDate, endDate) => 
    api.get('/payments/summary', { params: { startDate, endDate } }),
};

export const dashboardService = {
  getStats: () => 
    api.get('/dashboard/stats'),
  
  getInventoryTrends: () => 
    api.get('/dashboard/inventory-trends'),
  
  getAttendanceStats: () => 
    api.get('/dashboard/attendance-stats'),
  
  getPaymentStats: () => 
    api.get('/dashboard/payment-stats'),
};

export default api;