import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Devices as DevicesIcon,
  NetworkCheck as NetworkIcon,
  DataUsage as DataIcon,
  Schedule as TimeIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query';

import { userService } from '../services/userService';
import { deviceService } from '../services/deviceService';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Dashboard: React.FC = () => {
  const { data: userStats, isLoading: statsLoading } = useQuery(
    'userStats',
    userService.getStats,
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  const { data: devicesData, isLoading: devicesLoading } = useQuery(
    'userDevices',
    deviceService.getDevices,
    {
      refetchInterval: 30000,
    }
  );

  if (statsLoading || devicesLoading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const maxDevices = 4;
  const deviceUsagePercentage = ((userStats?.activeDevices || 0) / maxDevices) * 100;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Device Usage Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <DevicesIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Devices</Typography>
              </Box>
              <Typography variant="h4" gutterBottom>
                {userStats?.activeDevices || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                of {maxDevices} devices used
              </Typography>
              <LinearProgress
                variant="determinate"
                value={deviceUsagePercentage}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Network Status Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <NetworkIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Network</Typography>
              </Box>
              <Chip
                label="Connected"
                color="success"
                variant="outlined"
                sx={{ mb: 2 }}
              />
              <Typography variant="body2" color="text.secondary">
                {userStats?.activeConnections || 0} active connections
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Data Usage Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <DataIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Data Usage</Typography>
              </Box>
              <Typography variant="body1" gutterBottom>
                ↓ {formatBytes(userStats?.totalDataUsage?.download || 0)}
              </Typography>
              <Typography variant="body1" gutterBottom>
                ↑ {formatBytes(userStats?.totalDataUsage?.upload || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Session Info Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <TimeIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Sessions</Typography>
              </Box>
              <Typography variant="h4" gutterBottom>
                {userStats?.totalConnections || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total connections
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Devices */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                My Devices
              </Typography>
              {devicesData?.devices?.length ? (
                devicesData.devices.map((device) => (
                  <Box
                    key={device.id}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    py={1}
                  >
                    <Box>
                      <Typography variant="body1">
                        {device.deviceName || 'Unnamed Device'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {device.macAddress}
                      </Typography>
                    </Box>
                    <Chip
                      label={device.isActive ? 'Active' : 'Inactive'}
                      color={device.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No devices registered yet
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Info */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Info
              </Typography>
              <Box sx={{ '& > *': { mb: 1 } }}>
                <Typography variant="body2">
                  • Maximum 4 devices per account
                </Typography>
                <Typography variant="body2">
                  • Automatic device whitelisting
                </Typography>
                <Typography variant="body2">
                  • 24/7 network monitoring
                </Typography>
                <Typography variant="body2">
                  • Secure captive portal access
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;