import axios from 'axios';

// ⚠️ UPDATE THIS EVERY TIME YOU RESTART NGROK
const BASE_URL = 'https://unfoul-nondiabetic-jakobe.ngrok-free.dev'; 

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // This skips the ngrok warning page so your app doesn't crash
    'ngrok-skip-browser-warning': '69420', 
  },
});

export default api;