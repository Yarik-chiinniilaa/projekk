async function request(method, url, body) {
  const res = await fetch(`/api${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Помилка ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const qs = (params) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));
  return new URLSearchParams(clean).toString();
};

export const api = {
  me: () => request('GET', '/auth/me'),
  login: (body) => request('POST', '/auth/login', body),
  register: (body) => request('POST', '/auth/register', body),
  logout: () => request('POST', '/auth/logout'),
  changePassword: (body) => request('POST', '/auth/password', body),

  cities: () => request('GET', '/catalog/cities'),
  catalog: (params) => request('GET', `/catalog?${qs(params)}`),

  meta: () => request('GET', '/manager/meta'),
  list: (entity) => request('GET', `/manager/${entity}`),
  get: (entity, id) => request('GET', `/manager/${entity}/${id}`),
  create: (entity, body) => request('POST', `/manager/${entity}`, body),
  update: (entity, id, body) => request('PUT', `/manager/${entity}/${id}`, body),
  photos: (id) => request('GET', `/manager/apartments/${id}/photos`),
  uploadPhoto: async (id, blob) => {
    const res = await fetch(`/api/manager/apartments/${id}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'application/octet-stream' },
      credentials: 'same-origin',
      body: blob,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Помилка ${res.status}`);
    return data;
  },
  deletePhoto: (photoId) => request('DELETE', `/manager/photos/${photoId}`),
  makeCover: (photoId) => request('POST', `/manager/photos/${photoId}/cover`),
};

export const money = (n) =>
  Number(n).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
