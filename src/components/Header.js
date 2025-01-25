import React from 'react';
import { AppBar, Toolbar, Typography } from '@mui/material';

function Header() {
  return (
    <AppBar position="static" sx={{ mb: 4 }}>
      <Toolbar>
        <Typography variant="h6" component="div">
          Academic Profile - Noam Peled
        </Typography>
      </Toolbar>
    </AppBar>
  );
}

export default Header; 