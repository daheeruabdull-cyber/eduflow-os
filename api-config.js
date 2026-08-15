/**
 * Eduflow OS - Dynamic Cloud API Base URL Configuration Engine
 * File: api-config.js
 */
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'
  : '/api';

window.API_BASE_URL = API_BASE_URL;
