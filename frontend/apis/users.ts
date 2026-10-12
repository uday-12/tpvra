const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export interface SuccessMessageResponse {
    message: string;
}

// API Functions

/**
 * Approve a user by ID
 */
export async function approveUser(id: string): Promise<SuccessMessageResponse> {
    const response = await fetch(`${API_BASE_URL}/users/${id}/approve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to approve user');
    }

    return response.json();
}

/**
 * Reject a user by ID
 */
export async function rejectUser(id: string): Promise<SuccessMessageResponse> {
    const response = await fetch(`${API_BASE_URL}/users/${id}/reject`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to reject user');
    }

    return response.json();
}
