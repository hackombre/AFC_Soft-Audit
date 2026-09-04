'use client';

const TOKEN_KEY = 'afcsoft_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request('/auth/me'),

  listUsers: () => request('/users'),
  createUser: (payload: unknown) =>
    request('/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id: string, payload: unknown) =>
    request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteUser: (id: string) => request(`/users/${id}`, { method: 'DELETE' }),

  listEntities: () => request('/entities'),
  createEntity: (payload: unknown) =>
    request('/entities', { method: 'POST', body: JSON.stringify(payload) }),
  deleteEntity: (id: string) => request(`/entities/${id}`, { method: 'DELETE' }),

  listMissions: () => request('/missions'),
  createMission: (payload: unknown) =>
    request('/missions', { method: 'POST', body: JSON.stringify(payload) }),
  deleteMission: (id: string) => request(`/missions/${id}`, { method: 'DELETE' }),
  getMission: (id: string) => request(`/missions/${id}`),

  getStructure: () => request('/questionnaire/structure'),
  getAnswers: (missionId: string) =>
    request(`/questionnaire/missions/${missionId}/answers`),
  saveAnswer: (missionId: string, questionId: string, value: unknown, comment?: string | null) =>
    request(`/questionnaire/missions/${missionId}/answers/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify({ question_id: questionId, value, comment: comment ?? null }),
    }),

  listDocuments: (missionId: string) => request(`/documents/missions/${missionId}`),
  uploadDocument: async (
    missionId: string,
    nodeId: string,
    file: File,
    options?: { category?: 'recus' | 'travaux'; questionId?: string }
  ) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('node_id', nodeId);
    formData.append('category', options?.category ?? 'recus');
    if (options?.questionId) formData.append('question_id', options.questionId);
    formData.append('file', file);
    const res = await fetch(`/api/documents/missions/${missionId}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const data = await res.json();
        detail = data.detail || detail;
      } catch {
        /* ignore */
      }
      throw new ApiError(detail, res.status);
    }
    return res.json();
  },
  deleteDocument: (documentId: string) =>
    request(`/documents/${documentId}`, { method: 'DELETE' }),
  documentDownloadUrl: (documentId: string) => `/api/documents/${documentId}/download`,
};

export { request };
