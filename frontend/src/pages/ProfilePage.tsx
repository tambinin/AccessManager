import React from 'react';
import { Typography, Box } from '@mui/material';

const ProfilePage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        User Profile
      </Typography>
      <Typography variant="body1">
        Profile management functionality will be implemented here.
      </Typography>
    </Box>
  );
};

export default ProfilePage;