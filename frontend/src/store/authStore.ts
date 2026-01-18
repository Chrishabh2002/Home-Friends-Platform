import { create } from 'zustand';
import axios from 'axios';

interface User {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
    current_points: number;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string, user?: User) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: !!localStorage.getItem('token'),
    login: (token, user) => {
        localStorage.setItem('token', token);
        set({ token, user, isAuthenticated: true });
    },
    logout: () => {
        localStorage.removeItem('token');
        set({ token: null, user: null, isAuthenticated: false });
    },
}));

// Configure Axios Interceptor
axios.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
