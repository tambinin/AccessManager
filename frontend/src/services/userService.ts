import { apiClient } from './api';
import {
  User,
  UpdateUserRequest,
  ChangePasswordRequest,
  UserStats,
  Device,
  Connection,
  PaginatedResponse,
  PaginationParams,
} from '../types';

export const userService = {
  // Get current user profile
  getProfile: async (): Promise<{ user: User }> => {
    const response = await apiClient.get('/users/profile');
    return response.data;
  },

  // Update user profile
  updateProfile: async (userData: UpdateUserRequest): Promise<{ message: string; user: User }> => {
    const response = await apiClient.put('/users/profile', userData);
    return response.data;
  },

  // Change password
  changePassword: async (passwordData: ChangePasswordRequest): Promise<{ message: string }> => {
    const response = await apiClient.put('/users/change-password', passwordData);
    return response.data;
  },

  // Get user devices
  getDevices: async (): Promise<{ devices: Device[] }> => {
    const response = await apiClient.get('/users/devices');
    return response.data;
  },

  // Get user connections
  getConnections: async (params?: PaginationParams): Promise<PaginatedResponse<Connection>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get(`/users/connections?${queryParams}`);
    return response.data;
  },

  // Get user statistics
  getStats: async (): Promise<UserStats> => {
    const response = await apiClient.get('/users/stats');
    return response.data;
  },
};