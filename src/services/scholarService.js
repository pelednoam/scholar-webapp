import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export const getPublications = (onProgress) => {
  return new Promise((resolve, reject) => {
    fetch(`${API_URL}/publications`)
      .then(response => {
        if (response.status === 307) {
          console.log('Using streaming endpoint...');
          const eventSource = new EventSource(`${API_URL}/publications/stream`);
          
          eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Received event:', data);  // Debug log
            
            if (data.error) {
              console.error('Stream error:', data.error);
              eventSource.close();
              reject(new Error(data.error));
            } else if (data.progress) {
              console.log('Progress update:', data.progress);  // Debug log
              onProgress?.(data.progress);
            } else if (data.done) {
              console.log('Stream complete');  // Debug log
              eventSource.close();
              resolve(data.data);
            }
          };
          
          eventSource.onerror = (error) => {
            console.error('EventSource error:', error);  // Debug log
            eventSource.close();
            reject(new Error('Failed to connect to server'));
          };
        } else {
          // If not redirected, use regular response
          response.json().then(result => {
            console.log('Using cached data:', result);  // Debug log
            if (result.error) {
              reject(new Error(result.error));
            } else {
              resolve({
                ...result.data,
                fromCache: result.fromCache,
                isFresh: result.isFresh,
                lastUpdated: result.lastUpdated
              });
            }
          });
        }
      })
      .catch(error => {
        console.error('Fetch error:', error);  // Debug log
        reject(new Error('Failed to fetch publications'));
      });
  });
};

export const updatePublications = async () => {
  try {
    const response = await fetch(`${API_URL}/publications/update`, {
      method: 'POST'
    });
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message);
    }
    
    return {
      success: true,
      lastUpdated: result.lastUpdated,
      data: result.data
    };
  } catch (error) {
    throw new Error('Failed to update publications');
  }
};

export const getCacheStatus = async () => {
  try {
    const response = await fetch(`${API_URL}/publications/status`);
    return await response.json();
  } catch (error) {
    throw new Error('Failed to get cache status');
  }
};

export const checkServerStatus = async () => {
  try {
    const response = await fetch(`${API_URL}/status`);
    return await response.json();
  } catch (error) {
    throw new Error('Server not ready');
  }
}; 