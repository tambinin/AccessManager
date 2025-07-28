import { apiClient } from './api';
import {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  User,
} from '../types';

export const authService = {
  // Login user
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  // Refresh access token
  refreshToken: async (request: RefreshTokenRequest): Promise<RefreshTokenResponse> => {
    const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', request);
    return response.data;
  },

  // Logout user
  logout: async (refreshToken?: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/logout', { refreshToken });
    return response.data;
  },

  // Get current user info
  getCurrentUser: async (): Promise<{ authenticated: boolean; user?: User }> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return apiClient.isAuthenticated();
  },

  // Set auth tokens
  setTokens: (accessToken: string, refreshToken: string): void => {
    apiClient.setAuthTokens(accessToken, refreshToken);
  },

  // Clear auth tokens
  clearTokens: (): void => {
    apiClient.clearAuthTokens();
  },
};