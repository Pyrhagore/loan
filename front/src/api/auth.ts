import { apiRequest, setAuthToken, getAuthToken } from './base';
import { User } from '../types';

// We need API_URL from base.ts
const API_URL = import.meta.env.VITE_API_URL || 'https://bgmicro.vercel.app';

export interface LoginResponse {
    access_token: string;
    token_type: string;
    user: User;
}

export async function login(email: string, password: string): Promise<User> {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Échec de la connexion' }));
        throw new Error(error.detail || 'Erreur de connexion');
    }

    const data: LoginResponse = await response.json();
    setAuthToken(data.access_token);
    return data.user;
}

export async function register(userData: any): Promise<User> {
    const data = await apiRequest<LoginResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
    setAuthToken(data.access_token);
    return data.user;
}

export async function me(): Promise<User> {
    return apiRequest<User>('/auth/me');
}
