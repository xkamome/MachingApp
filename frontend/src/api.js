const BASE = '/api';

function getToken() {
  return localStorage.getItem('matching_token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  getPhase: () => request('/phase'),
  getParticipants: (group) => request(`/participants?group=${group}`),
  login: (access_code) => request('/login', { method: 'POST', body: { access_code } }),
  submitChoice: (chosen_id) => request('/choice', { method: 'POST', body: { chosen_id } }),
  getMyResult: () => request('/my-result'),
};

export const adminApi = {
  request(path, options = {}) {
    const pwd = localStorage.getItem('admin_pwd') || '';
    return request(`/admin${path}`, {
      ...options,
      headers: { 'x-admin-password': pwd, ...options.headers },
    });
  },
  getParticipants() { return this.request('/participants'); },
  addParticipant(data) { return this.request('/participants', { method: 'POST', body: data }); },
  updateParticipant(id, data) { return this.request(`/participants/${id}`, { method: 'PUT', body: data }); },
  deleteParticipant(id) { return this.request(`/participants/${id}`, { method: 'DELETE' }); },
  resetChoice(id) { return this.request(`/choice/${id}`, { method: 'DELETE' }); },
  setPhase(phase) { return this.request('/phase', { method: 'POST', body: { phase } }); },
  getStats() { return this.request('/stats'); },
  getAuditLog() { return this.request('/audit-log'); },
  preview(id) { return this.request(`/preview/${id}`); },
  batchAdd(participants) { return this.request('/batch-participants', { method: 'POST', body: { participants } }); },
};
