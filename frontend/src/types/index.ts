export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  macAddress: string;
  ipAddress?: string;
  deviceName?: string;
  userAgent?: string;
  isActive: boolean;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user?: User;
}

export interface Connection {
  id: string;
  startTime: string;
  endTime?: string;
  ipAddress: string;
  bytesDownload: number;
  bytesUpload: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  deviceId: string;
  user?: User;
  device?: Device;
}

export interface Session {
  id: string;
  refreshToken: string;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user?: User;
}

export interface NetworkRule {
  id: string;
  name: string;
  description?: string;
  ruleType: 'ALLOW' | 'BLOCK' | 'REDIRECT';
  target: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description?: string;
  isEditable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  userId?: string;
  user?: User;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: User;
  device: Device;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AdminCreateUserRequest {
  email: string;
  username: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
}

export interface AdminUpdateUserRequest {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  isAdmin?: boolean;
}

export interface NetworkRuleRequest {
  name: string;
  description?: string;
  ruleType: 'ALLOW' | 'BLOCK' | 'REDIRECT';
  target: string;
  priority?: number;
}

export interface DeviceUpdateRequest {
  deviceName: string;
}

export interface DashboardStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalDevices: number;
    activeDevices: number;
    totalConnections: number;
    activeConnections: number;
  };
  recentLogins: AuditLog[];
  userRegistrations: Array<{
    createdAt: string;
    _count: number;
  }>;
  connectionStats: Array<{
    startTime: string;
    _count: number;
    _sum: {
      bytesDownload: number;
      bytesUpload: number;
    };
  }>;
}

export interface UserStats {
  totalDevices: number;
  activeDevices: number;
  totalConnections: number;
  activeConnections: number;
  totalDataUsage: {
    download: number;
    upload: number;
  };
  recentActivity: Array<{
    startTime: string;
    _count: number;
  }>;
}

export interface DeviceTrafficStats {
  totalUsage: {
    download: number;
    upload: number;
  };
  averageUsage: {
    download: number;
    upload: number;
  };
  totalConnections: number;
  dailyUsage: Array<{
    startTime: string;
    _sum: {
      bytesDownload: number;
      bytesUpload: number;
    };
  }>;
}

export interface NetworkStatus {
  iptablesRules: string;
  connectedDevices: Array<{
    ipAddress: string;
    macAddress: string;
    lastSeen: string;
  }>;
  activeDevices: Device[];
}

export interface MonitoringData {
  connectedDevices: Array<{
    ipAddress: string;
    macAddress: string;
    lastSeen: string;
  }>;
  activeConnections: Connection[];
  recentTraffic: Connection[];
  timestamp: string;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
  details?: any;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}