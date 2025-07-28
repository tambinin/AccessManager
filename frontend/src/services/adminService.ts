import { apiClient } from './api';
import {
  User,
  Device,
  AuditLog,
  SystemConfig,
  DashboardStats,
  AdminCreateUserRequest,
  AdminUpdateUserRequest,
  PaginatedResponse,
  PaginationParams,
} from '../types';

export const adminService = {
  // Get dashboard statistics
  getDashboard: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/admin/dashboard');
    return response.data;
  },

  // Get all users with pagination
  getUsers: async (params?: PaginationParams & { status?: 'active' | 'inactive' }): Promise<PaginatedResponse<User & { _count: { devices: number; sessions: number } }>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const response = await apiClient.get(`/admin/users?${queryParams}`);
    return response.data;
  },

  // Get specific user details
  getUser: async (userId: string): Promise<{ user: User & { devices: Device[]; sessions: any[]; connections: any[] } }> => {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  },

  // Create new user
  createUser: async (userData: AdminCreateUserRequest): Promise<{ message: string; user: User; generatedPassword?: string }> => {
    const response = await apiClient.post('/admin/users', userData);
    return response.data;
  },

  // Update user
  updateUser: async (userId: string, userData: AdminUpdateUserRequest): Promise<{ message: string; user: User }> => {
    const response = await apiClient.put(`/admin/users/${userId}`, userData);
    return response.data;
  },

  // Delete user
  deleteUser: async (userId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/admin/users/${userId}`);
    return response.data;
  },

  // Reset user password
  resetUserPassword: async (userId: string): Promise<{ message: string; newPassword: string }> => {
    const response = await apiClient.post(`/admin/users/${userId}/reset-password`);
    return response.data;
  },

  // Get audit logs
  getAuditLogs: async (params?: PaginationParams & { action?: string; userId?: string }): Promise<PaginatedResponse<AuditLog>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.action) queryParams.append('action', params.action);
    if (params?.userId) queryParams.append('userId', params.userId);

    const response = await apiClient.get(`/admin/audit-logs?${queryParams}`);
    return response.data;
  },

  // Get system configuration
  getConfig: async (): Promise<{ config: SystemConfig[] }> => {
    const response = await apiClient.get('/admin/config');
    return response.data;
  },

  // Update system configuration
  updateConfig: async (key: string, value: string): Promise<{ message: string; config: SystemConfig }> => {
    const response = await apiClient.put(`/admin/config/${key}`, { value });
    return response.data;
  },
};