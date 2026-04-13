const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const apiUrl = (path) => {
  if (!path.startsWith('/')) throw new Error('API path must start with /');
  return API_BASE ? `${API_BASE}${path}` : path;
};

export const fetchJSON = async (path, options = {}) => {
  const url = apiUrl(path);

  let res;
  try {
    res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
  } catch (error) {
    throw new Error(
      'Unable to reach the API. Verify the backend is running and VITE_API_BASE_URL/CORS are configured correctly.'
    );
  }

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
};
