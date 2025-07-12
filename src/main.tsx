import React from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './index.css';

// Configure axios globally
axios.defaults.baseURL = 'http://localhost:5000';

// Set up request interceptor for auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Add response interceptor for error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      // You might want to redirect to login page
      console.log('Unauthorized access - token removed');
    }
    return Promise.reject(error);
  }
);

const root = createRoot(document.getElementById('root'));
root.render(<App />);