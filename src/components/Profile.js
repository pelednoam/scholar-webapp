import React from 'react';
import { Paper, Typography, Box, Chip } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';

function Profile() {
  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <SchoolIcon sx={{ mr: 2 }} />
        <Typography variant="h5">Academic Profile</Typography>
      </Box>
      
      <Typography variant="body1" paragraph>
        MGH/HST Martinos Center for Biomedical Imaging
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Research Interests</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label="Neuroimaging" />
          <Chip label="Epilepsy" />
          <Chip label="Preop Surgical Planning" />
        </Box>
      </Box>

      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>Citations</Typography>
        <Typography variant="body1">
          Total Citations: 847
        </Typography>
        <Typography variant="body1">
          h-index: 16
        </Typography>
        <Typography variant="body1">
          i10-index: 21
        </Typography>
      </Box>
    </Paper>
  );
}

export default Profile; 