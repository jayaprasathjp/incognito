// Configure base URL based on environment
export const SOCKET_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://incognito-ebvk.onrender.com' : 'http://localhost:5000');
const API_URL = SOCKET_URL + "/api";

const handleResponse = async (res) => {
    const data = await res.json();
    if (!res.ok) {
        // Create an error object with the response data
        const error = new Error(data.error || 'Request failed');
        error.response = { data };
        error.status = res.status;
        throw error;
    }
    return data;
};

export const api = {
    get: async (endpoint, init = {}) => {
        const token = localStorage.getItem('token');
        const { headers: extraHeaders, ...rest } = init;
        const res = await fetch(`${API_URL}${endpoint}`, {
            ...rest,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...(extraHeaders || {}),
            },
        });
        return handleResponse(res);
    },
    post: async (endpoint, data) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },
    put: async (endpoint, data) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },
    delete: async (endpoint, init = {}) => {
        const token = localStorage.getItem('token');
        const { headers: extraHeaders, ...rest } = init;
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'DELETE',
            ...rest,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...(extraHeaders || {}),
            },
        });
        return handleResponse(res);
    },
    upload: async (endpoint, formData) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        return handleResponse(res);
    }
};

