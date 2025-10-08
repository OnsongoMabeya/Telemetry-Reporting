// Determine the backend URL based on the current hostname
const getBackendUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return ''; // Use relative URLs in production
  }
  
  // If running on localhost, use localhost:5000
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  
  // For network access, use the current hostname with port 5000
  return `http://${window.location.hostname}:5000`;
};

export const API_BASE_URL = getBackendUrl();
