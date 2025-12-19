// API Configuration Helper for Internet Access
// Place this file at: frontend/src/config/apiConfig.js

// Auto-detect API URL based on current location
const getApiUrl = () => {
  // If REACT_APP_API_URL is set, use it
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // If we're on ngrok (or any remote domain), use the same origin
  if (window.location.hostname.includes('ngrok')) {
    return window.location.origin;
  }
  
  // Default to localhost for local development
  return 'http://localhost:5001';
};

const API_URL = getApiUrl();
const DEBUG = process.env.REACT_APP_DEBUG === 'true';

export const apiConfig = {
  baseURL: API_URL,
  timeout: 10000,
  withCredentials: true, // Important for cookies/authentication
};

export const apiClient = {
  /**
   * Make an API request with proper error handling
   * @param {string} endpoint - API endpoint path (e.g., '/api/auth/login')
   * @param {object} options - Fetch options
   * @returns {Promise<object>} Response data
   */
  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    
    if (DEBUG) {
      console.log(`[API] ${options.method || 'GET'} ${url}`, options.body);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...options.headers,
        },
        credentials: 'include', // Send cookies with requests
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (DEBUG) {
        console.error(`[API] Error:`, error);
      }
      throw error;
    }
  },

  // Helper methods
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },
};

// ML-specific API helpers
export const mlAPI = {
  /**
   * Get all sensor data with ML predictions
   */
  getAllDevices() {
    return apiClient.get('/api/sensor-data');
  },

  /**
   * Get sensor data for specific device
   * @param {string} deviceId - Device identifier
   * @param {number} limit - Number of recent readings to fetch
   */
  getDeviceData(deviceId, limit = 10) {
    return apiClient.get(`/api/sensor-data/${deviceId}?limit=${limit}`);
  },

  /**
   * Submit sensor data (used by Arduino devices)
   * @param {object} sensorData - Sensor reading object
   */
  submitSensorData(sensorData) {
    return apiClient.post('/api/sensor-data', sensorData);
  },
};

export default apiConfig;
