const API_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.MODE === 'development' ? 'http://localhost:8000' : 'https://home-friends-platform.onrender.com');

export default API_URL;
