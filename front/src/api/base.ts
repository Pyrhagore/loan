const API_URL = import.meta.env.VITE_API_URL || 'https://bgmicro.vercel.app';

export const getAuthToken = () => localStorage.getItem('bg_auth_token');
export const setAuthToken = (token: string | null) => {
    if (token) localStorage.setItem('bg_auth_token', token);
    else localStorage.removeItem('bg_auth_token');
};

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
        throw new Error(error.detail || 'API Error');
    }

    return response.json();
}
