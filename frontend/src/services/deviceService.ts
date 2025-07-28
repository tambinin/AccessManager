import { apiClient } from './api';
import {
  Device,
  Connection,
  DeviceUpdateRequest,
  DeviceTrafficStats,
  PaginatedResponse,
  PaginationParams,
} from '../types';

export const deviceService = {
  // Get user's devices
  getDevices: async (): Promise<{ devices: Device[] }> => {
    const response = await apiClient.get('/devices');
    return response.data;
  },

  // Get specific device details
  getDevice: async (deviceId: string): Promise<{ device: Device }> => {
    const response = await apiClient.get(`/devices/${deviceId}`);
    return response.data;
  },

  // Update device name
  updateDevice: async (deviceId: string, data: DeviceUpdateRequest): Promise<{ message: string; device: Device }> => {
    const response = await apiClient.put(`/devices/${deviceId}`, data);
    return response.data;
  },

  // Disconnect device
  disconnectDevice: async (deviceId: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/devices/${deviceId}/disconnect`);
    return response.data;
  },

  // Delete device
  deleteDevice: async (deviceId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/devices/${deviceId}`);
    return response.data;
  },

  // Get device connection history
  getDeviceConnections: async (deviceId: string, params?: PaginationParams): Promise<PaginatedResponse<Connection>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get(`/devices/${deviceId}/connections?${queryParams}`);
    return response.data;
  },

  // Get device traffic statistics
  getDeviceStats: async (deviceId: string): Promise<DeviceTrafficStats> => {
    const response = await apiClient.get(`/devices/${deviceId}/stats`);
    return response.data;
  },
};