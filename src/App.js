import React, { useEffect, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { 
  Container, 
  CssBaseline, 
  Box, 
  Typography,
  LinearProgress,
  CircularProgress
} from '@mui/material';
import Header from './components/Header';
import Profile from './components/Profile';
import Publications from './components/Publications';
import { getPublications, checkServerStatus } from './services/scholarService';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [scholarData, setScholarData] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, latest: 'Initializing...' });
  const [serverStatus, setServerStatus] = useState('checking'); // 'checking', 'ready', 'error'

  useEffect(() => {
    const checkServer = async () => {
      try {
        await checkServerStatus();
        setServerStatus('ready');
        fetchData();
      } catch (err) {
        // If server isn't ready, retry after 1 second
        setTimeout(checkServer, 1000);
      }
    };

    const fetchData = async () => {
      try {
        const data = await getPublications((progressData) => {
          setProgress(progressData);
        });
        setScholarData(data);
      } catch (err) {
        setError(err.message);
      }
    };

    checkServer();
  }, []);

  if (serverStatus === 'checking') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container 
          maxWidth="lg" 
          sx={{ 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2
          }}
        >
          <CircularProgress size={60} />
          <Typography variant="h6" color="text.secondary">
            Starting server...
          </Typography>
          <Box sx={{ width: '300px' }}>
            <LinearProgress />
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {error ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="error" variant="h6">
              Error loading publications: {error}
            </Typography>
          </Box>
        ) : (
          <>
            <Header />
            <Profile 
              name={scholarData?.author?.name}
              citations={scholarData?.author?.citations}
              hIndex={scholarData?.author?.hIndex}
              i10Index={scholarData?.author?.i10Index}
            />
            <Publications 
              publications={scholarData?.publications || []} 
              fromCache={scholarData?.fromCache}
              isFresh={scholarData?.isFresh}
              lastUpdated={scholarData?.lastUpdated}
              progress={progress}
            />
          </>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;
