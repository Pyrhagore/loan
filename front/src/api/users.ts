import { apiRequest } from './base';
import { User } from '../types';

export async function getUsers(): Promise<User[]> {
    return apiRequest<User[]>('/users/');
}

export async function createAgent(agentData: any): Promise<User> {
    return apiRequest<User>('/users/agents', {
        method: 'POST',
        body: JSON.stringify(agentData),
    });
}

export async function toggleUserActive(userId: string): Promise<User> {
    return apiRequest<User>(`/users/${userId}/toggle-active`, {
        method: 'PATCH',
    });
}

export async function deleteUser(userId: string): Promise<void> {
    return apiRequest<void>(`/users/${userId}`, {
        method: 'DELETE',
    });
}
