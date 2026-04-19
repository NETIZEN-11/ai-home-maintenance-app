import axios from "axios";
import { Platform } from "react-native";

// Determine base URL based on platform and environment
const getBaseURL = () => {
  const envURL = process.env.EXPO_PUBLIC_API_URL;
  
  // If environment variable is set and valid, use it
  if (envURL && envURL !== "http://localhost:5000") {
    console.log("Using API URL from .env:", envURL);
    return envURL;
  }
  
  // Platform-specific defaults
  if (Platform.OS === "android") {
    // Android emulator uses 10.0.2.2 to access host machine's localhost
    console.log("Android detected - using 10.0.2.2:5000");
    return "http://10.0.2.2:5000";
  } else if (Platform.OS === "web") {
    // Web can use localhost directly
    console.log("Web detected - using localhost:5000");
    return "http://localhost:5000";
  } else {
    // iOS simulator can use localhost, physical devices need actual IP
    console.warn("iOS detected - if on physical device, set EXPO_PUBLIC_API_URL in .env with your machine's IP");
    console.warn("Example: EXPO_PUBLIC_API_URL=http://192.168.1.100:5000");
    return "http://localhost:5000";
  }
};

const BASE_URL = getBaseURL();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // 10 seconds for faster failure detection
  headers: {
    'Content-Type': 'application/json',
  }
});

// In-memory token cache — set this after login
let _cachedToken = null;

export const setApiToken = (token) => {
  _cachedToken = token;
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

export const loadTokenFromStorage = async () => {
  try {
    let token = null;
    if (Platform.OS === "web") {
      token = typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
    } else {
      const AS = require("@react-native-async-storage/async-storage").default;
      token = await AS.getItem("token");
    }
    if (token) setApiToken(token);
    return token;
  } catch (err) {
    console.error("Failed to load token from storage:", err);
    return null;
  }
};

api.interceptors.request.use(
  (config) => {
    // Ensure token is always included if available
    if (_cachedToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${_cachedToken}`;
    }
    
    // Debug log for auth requests
    if (config.url?.includes('/api/ai/') || config.url?.includes('/api/appliances/')) {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
      console.log(`Token present: ${!!config.headers.Authorization}`);
      if (config.headers.Authorization) {
        const tokenPreview = config.headers.Authorization.substring(0, 20) + '...';
        console.log(`Token preview: ${tokenPreview}`);
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      setApiToken(null);
    }
    
    // Better error messages for network issues
    let message;
    if (error.code === 'ECONNABORTED') {
      message = 'Request timeout - backend may be slow or unavailable';
    } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      message = 'Cannot connect to backend - check if server is running';
      console.error('Network Error - Backend not reachable at:', BASE_URL);
      console.error('Solutions:');
      console.error('   1. Make sure backend is running (npm start in backend folder)');
      console.error('   2. Check EXPO_PUBLIC_API_URL in .env file');
      console.error('   3. For Android emulator, use http://10.0.2.2:5000');
      console.error('   4. For physical device, use your computer\'s IP (e.g., http://192.168.1.100:5000)');
    } else {
      message = error.response?.data?.message || error.response?.data?.error || error.message || "Something went wrong";
    }
    
    return Promise.reject(new Error(message));
  }
);

export default api;
