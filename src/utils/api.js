// src/utils/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// export const BASE_URL = 'https://chat-backend-production-644a.up.railway.app';
// export const WS_URL   = 'wss://chat-backend-production-644a.up.railway.app';
export const BASE_URL = 'http://192.168.1.3:4000';
export const WS_URL = 'ws://192.168.1.3:4000';

const api = axios.create({baseURL: `${BASE_URL}/api`});

// Attach token automatically
api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Log the request (Clean version)
    console.log(
      `🚀 [${config.method.toUpperCase()}] ${config.baseURL+config.url}`,
      config.data || '',
    );

    return config;
  },
  error => {
    console.log('❌ Request Error:', error);
    return Promise.reject(error);
  },
);

// Auth
export const login = (email, password) =>
  api.post('/auth/login', {email, password});
export const register = data => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');
export const updateProfile = data => api.put('/auth/profile', data);
export const changePassword = data => api.put('/auth/password', data);

// Users
export const getUsers = () => api.get('/users');
export const searchUsers = q => api.get('/users/search', {params: {q}});
export const createUser = data => api.post('/users', data);
export const updateUser = (id, d) => api.put(`/users/${id}`, d);
export const deleteUser = id => api.delete(`/users/${id}`);

// Companies
export const getCompanies = () => api.get('/companies');
export const createCompany = data => api.post('/companies', data);
export const updateCompany = (id, d) => api.put(`/companies/${id}`, d);
export const deleteCompany = id => api.delete(`/companies/${id}`);

// Branches
export const getBranches = companyId =>
  api.get('/branches', {params: {company_id: companyId}});
export const createBranch = data => api.post('/branches', data);
export const updateBranch = (id, d) => api.put(`/branches/${id}`, d);

// Departments
export const getDepartments = () => api.get('/departments');
export const createDepartment = d => api.post('/departments', d);

// Chat groups
export const getChatGroups = () => api.get('/chat-groups');

// Messages
export const getMessages = (type, id, params) =>
  api.get(`/messages/${type}/${id}`, {params});
export const searchMessages = (q, chatType, chatId) =>
  api.get('/messages/search', { params: { q, chat_type: chatType, chat_id: chatId } });
export const editMessage = (id, content) => api.put(`/messages/${id}`, { content });
export const deleteMessage = id => api.delete(`/messages/${id}`);
export const sendMessage = data => api.post('/messages', data);
export const uploadFile = formData =>
  api.post('/messages/upload', formData, {
    headers: {'Content-Type': 'multipart/form-data'},
  });

// Conversations (DM list)
export const getConversations = () => api.get('/conversations');

// Calls
export const getCalls = () => api.get('/calls');
export const logCall = data => api.post('/calls', data);

// Reminders
export const getReminders = view => api.get('/reminders', {params: {view}});
export const createReminder = data => api.post('/reminders', data);
export const updateReminder = (id, data) => api.put(`/reminders/${id}`, data);
export const setReminderStatus = (id, status, rejection_reason) =>
  api.patch(`/reminders/${id}/status`, { status, ...(rejection_reason ? { rejection_reason } : {}) });
export const deleteReminder = id => api.delete(`/reminders/${id}`);

// Chat group permissions
export const setGroupPermission = (id, permission) =>
  api.patch(`/chat-groups/${id}/permission`, { send_permission: permission });

// Stats
export const getStats = () => api.get('/stats');

export default api;
