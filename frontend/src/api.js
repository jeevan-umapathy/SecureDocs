export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
export async function api(path, options = {}) {
    const { body, raw = false, ...rest } = options;
    const token = localStorage.getItem('token');
    let response;
    try {
        response = await fetch(API_URL + path, {
            ...rest,
            headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...rest.headers },
            body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined
        });
    } catch { throw new Error('Could not connect to the server. Please try again.'); }
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if ((response.status === 401 && token) || data.code === 'ACCOUNT_DISABLED') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.dispatchEvent(new Event('session-ended'));
        }
        throw new Error(data.message || 'Request failed. Please try again.');
    }
    return raw ? response : response.json();
}
export function formatSize(bytes) {
    const value = Number(bytes);
    if (value < 1024) return value + ' B';
    if (value < 1024 ** 2) return (value / 1024).toFixed(1) + ' KB';
    if (value < 1024 ** 3) return (value / 1024 ** 2).toFixed(1) + ' MB';
    return (value / 1024 ** 3).toFixed(1) + ' GB';
}
export const formatDate = value => value ? new Date(value).toLocaleString() : '—';

