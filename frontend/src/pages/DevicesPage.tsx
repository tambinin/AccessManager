import React from 'react';
import { Typography, Box } from '@mui/material';

const DevicesPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My Devices
      </Typography>
      <Typography variant="body1">
        Device management functionality will be implemented here.
      </Typography>
    </Box>
  );
};

export default DevicesPage;