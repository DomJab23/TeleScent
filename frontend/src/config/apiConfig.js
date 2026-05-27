const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:5001';
  }
  return window.location.origin;
};

const API_URL = getApiUrl();
const DEBUG = process.env.REACT_APP_DEBUG === 'true';

export const apiConfig = {
  baseURL: API_URL,
  timeout: 10000,
  withCredentials: true,
};

export const apiClient = {
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
          ...options.headers,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (DEBUG) console.error('[API] Error:', error);
      throw error;
    }
  },

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

export const mlAPI = {
  getAllDevices() {
    return apiClient.get('/api/sensor-data');
  },

  getDeviceData(deviceId, limit = 10) {
    return apiClient.get(`/api/sensor-data/${deviceId}?limit=${limit}`);
  },

  submitSensorData(sensorData) {
    return apiClient.post('/api/sensor-data', sensorData);
  },
};

export default apiConfig;
