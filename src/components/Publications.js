import React, { useState, useMemo, useEffect } from 'react';
import { 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  Box, 
  Link,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Pagination,
  Stack,
  Collapse,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import { updatePublications, getCacheStatus } from '../services/scholarService';

function Publications({ 
  publications = [], 
  fromCache, 
  isFresh, 
  lastUpdated,
  progress = { current: 0, total: 0, latest: '' }  // Add progress prop with default value
}) {
  const [currentTab, setCurrentTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('citations');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const itemsPerPage = 10;
  const [selectedAbstract, setSelectedAbstract] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Define categories/tags for publications
  const categories = {
    'epilepsy': 'Epilepsy',
    'neuromodulation': 'Neuromodulation',
    'neuroimaging': 'Neuroimaging',
    'psychiatry': 'Psychiatry',
    'methods': 'Methods & Algorithms',
    'clinical': 'Clinical Studies'
  };

  function assignCategories(title) {
    const categoriesSet = new Set();
    
    if (!title) return [];
    
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('epilep')) categoriesSet.add('epilepsy');
    if (lowerTitle.includes('meg') || lowerTitle.includes('eeg')) categoriesSet.add('neuroimaging');
    if (lowerTitle.includes('closed-loop') || lowerTitle.includes('stimulation')) categoriesSet.add('neuromodulation');
    if (lowerTitle.includes('ptsd') || lowerTitle.includes('psychiatric') || lowerTitle.includes('depression')) categoriesSet.add('psychiatry');
    if (lowerTitle.includes('algorithm') || lowerTitle.includes('detection') || lowerTitle.includes('classification')) categoriesSet.add('methods');
    if (lowerTitle.includes('clinical') || lowerTitle.includes('patient')) categoriesSet.add('clinical');
    
    return Array.from(categoriesSet);
  }

  const publicationsWithCategories = useMemo(() => {
    return publications.map(pub => ({
      ...pub,
      categories: assignCategories(pub?.title)
    }));
  }, [publications]);

  const topPublications = useMemo(() => {
    return [...publicationsWithCategories]
      .sort((a, b) => b.citations - a.citations)
      .slice(0, 4);
  }, [publicationsWithCategories]);

  // Filter and sort publications
  const filteredAndSortedPublications = useMemo(() => {
    let filtered = currentTab === 0 ? topPublications : publicationsWithCategories;

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(pub => pub?.categories?.includes(selectedCategory));
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(pub => {
        const title = pub?.title?.toLowerCase() || '';
        const authors = pub?.authors?.toLowerCase() || '';
        const venue = pub?.venue?.toLowerCase() || '';
        
        return title.includes(query) ||
               authors.includes(query) ||
               venue.includes(query);
      });
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'year':
          return (b?.year || 0) - (a?.year || 0);
        case 'citations':
          return (b?.citations || 0) - (a?.citations || 0);
        case 'title':
          return (a?.title || '').localeCompare(b?.title || '');
        default:
          return 0;
      }
    });
  }, [currentTab, searchQuery, sortBy, selectedCategory, publicationsWithCategories, topPublications]);

  // Pagination
  const pageCount = Math.ceil(filteredAndSortedPublications.length / itemsPerPage);
  const currentPublications = filteredAndSortedPublications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setCurrentPage(1);
  };

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  const handleExpandClick = (pub) => {
    setSelectedAbstract(pub);
  };

  const handleCloseAbstract = () => {
    setSelectedAbstract(null);
  };

  useEffect(() => {
    setIsLoading(publications.length === 0);
  }, [publications]);

  const handleRefresh = async () => {
    setIsUpdating(true);
    try {
      const result = await updatePublications();
      if (result.success) {
        window.location.reload(); // Reload to get new data
      }
    } catch (error) {
      console.error('Failed to update:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getCitationUrl = (title) => {
    // Create Google Scholar search URL for citations
    return `https://scholar.google.com/scholar?cites=${encodeURIComponent(title)}`;
  };

  const PublicationList = ({ publications }) => (
    <List>
      {publications?.map((pub, index) => (
        <ListItem 
          key={index} 
          divider={index !== publications.length - 1}
          sx={{ flexDirection: 'column', alignItems: 'flex-start' }}
        >
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <ListItemText
              primary={
                <span>
                  <Link 
                    href={pub.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    sx={{ 
                      color: 'primary.main',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    {pub.title}
                  </Link>
                  <Box component="span" sx={{ display: 'block', mt: 1 }}>
                    {pub.categories?.map(cat => (
                      <Chip 
                        key={cat}
                        label={categories[cat]}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                </span>
              }
              secondary={
                <>
                  <Typography component="span" sx={{ color: 'text.secondary' }}>
                    {pub.authors}
                  </Typography>
                  <br />
                  <Typography component="span" sx={{ color: 'text.secondary' }}>
                    {pub.venue} ({pub.year}) | 
                    <Link
                      href={getCitationUrl(pub.title)}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        color: 'primary.main',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        ml: 0.5,
                        '&:hover': {
                          textDecoration: 'underline'
                        }
                      }}
                    >
                      Citations: {pub.citations}
                      <OpenInNewIcon sx={{ fontSize: 14, ml: 0.5 }} />
                    </Link>
                  </Typography>
                </>
              }
            />
            <IconButton 
              onClick={() => handleExpandClick(pub)}
              sx={{ ml: 1, mt: 1 }}
              size="small"
              aria-label="Show abstract"
            >
              <ExpandMoreIcon />
            </IconButton>
          </Box>
        </ListItem>
      ))}
    </List>
  );

  if (isLoading) {
    return (
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ width: '100%' }}>
          <Typography variant="h5" sx={{ mb: 3 }}>
            Loading Publications...
          </Typography>
          {progress.total > 0 && (
            <>
              <LinearProgress 
                variant="determinate"
                value={(progress.current / progress.total) * 100}
                sx={{ 
                  height: 10,
                  borderRadius: 5,
                  mb: 2,
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 5,
                  }
                }} 
              />
              <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 1 }}>
                {progress.current} of {progress.total} publications processed
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ 
                fontStyle: 'italic',
                maxWidth: '80%',
                mx: 'auto',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}>
                Currently processing: {progress.latest}
              </Typography>
            </>
          )}
        </Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="div">
          Publications
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {lastUpdated && (
            <Typography variant="body2" color="text.secondary">
              {fromCache ? (
                <>
                  Cached data from: {new Date(lastUpdated).toLocaleString()}
                  {!isFresh && " (outdated)"}
                </>
              ) : (
                `Last updated: ${new Date(lastUpdated).toLocaleString()}`
              )}
            </Typography>
          )}
          <IconButton 
            onClick={handleRefresh} 
            disabled={isUpdating}
            title={fromCache && !isFresh ? "Update recommended" : "Refresh publications"}
            color={fromCache && !isFresh ? "warning" : "default"}
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      <Box component="div">
        <Typography variant="h5" component="div" sx={{ mb: 2 }}>
          Publications
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Most Cited" />
            <Tab label="All Publications" />
          </Tabs>
        </Box>

        <Stack spacing={2} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              size="small"
              placeholder="Search publications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Sort by</InputLabel>
              <Select
                value={sortBy}
                label="Sort by"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="citations">Citations</MenuItem>
                <MenuItem value="year">Year</MenuItem>
                <MenuItem value="title">Title</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {Object.entries(categories).map(([key, value]) => (
                  <MenuItem key={key} value={key}>{value}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Stack>

        <Box component="div">
          <PublicationList publications={currentPublications} />
        </Box>

        {pageCount > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination 
              count={pageCount} 
              page={currentPage} 
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
      </Box>

      <Dialog
        open={Boolean(selectedAbstract)}
        onClose={handleCloseAbstract}
        maxWidth="md"
        fullWidth
      >
        {selectedAbstract && (
          <>
            <DialogTitle>
              <Box sx={{ pr: 6 }}>  {/* Add padding for close button */}
                {selectedAbstract.title}
                <IconButton
                  onClick={handleCloseAbstract}
                  sx={{
                    position: 'absolute',
                    right: 8,
                    top: 8,
                  }}
                >
                  <ExpandLessIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography 
                variant="body1" 
                sx={{ 
                  mt: 2,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-line'  // Preserve line breaks
                }}
              >
                {selectedAbstract.abstract || 'Abstract not available'}
              </Typography>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Paper>
  );
}

export default Publications; 