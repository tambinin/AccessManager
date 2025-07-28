import { apiClient } from './api';
import {
  NetworkRule,
  NetworkStatus,
  MonitoringData,
  NetworkRuleRequest,
  PaginatedResponse,
} from '../types';

export const networkService = {
  // Get current network status
  getStatus: async (): Promise<NetworkStatus> => {
    const response = await apiClient.get('/network/status');
    return response.data;
  },

  // Initialize captive portal
  initialize: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/network/initialize');
    return response.data;
  },

  // Setup NAT rules
  setupNAT: async (networkInterface?: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/network/setup-nat', { interface: networkInterface });
    return response.data;
  },

  // Get network rules
  getRules: async (): Promise<{ rules: NetworkRule[] }> => {
    const response = await apiClient.get('/network/rules');
    return response.data;
  },

  // Create network rule
  createRule: async (ruleData: NetworkRuleRequest): Promise<{ message: string; rule: NetworkRule }> => {
    const response = await apiClient.post('/network/rules', ruleData);
    return response.data;
  },

  // Update network rule
  updateRule: async (ruleId: string, ruleData: NetworkRuleRequest & { isActive?: boolean }): Promise<{ message: string; rule: NetworkRule }> => {
    const response = await apiClient.put(`/network/rules/${ruleId}`, ruleData);
    return response.data;
  },

  // Delete network rule
  deleteRule: async (ruleId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/network/rules/${ruleId}`);
    return response.data;
  },

  // Get device traffic statistics
  getDeviceTraffic: async (deviceId: string): Promise<{
    device: {
      id: string;
      name: string;
      macAddress: string;
      ipAddress: string;
      user: any;
    };
    traffic: {
      totalBytes: number;
      totalPackets: number;
      timestamp: string;
    };
  }> => {
    const response = await apiClient.get(`/network/traffic/${deviceId}`);
    return response.data;
  },

  // Get real-time monitoring data
  getMonitoring: async (): Promise<MonitoringData> => {
    const response = await apiClient.get('/network/monitor');
    return response.data;
  },

  // Disconnect all devices (emergency)
  disconnectAll: async (): Promise<{ message: string; disconnectedDevices: number }> => {
    const response = await apiClient.post('/network/disconnect-all');
    return response.data;
  },
};