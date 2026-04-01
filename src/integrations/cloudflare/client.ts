/**
 * Cloudflare Worker API client — replaces Supabase entirely.
 * All requests go to /api/* which is proxied to the Worker.
 */

const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('hhh_token');
}

function setToken(t: string) {
  localStorage.setItem('hhh_token', t);
}

function clearToken() {
  localStorage.removeItem('hhh_token');
  localStorage.removeItem('hhh_user');
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<{ data: T | null; error: string | null }> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${BASE}${path}`, { ...options, headers: { ...headers, ...(options.headers as Record<string, string> || {}) } });
    const json = await res.json();
    if (!res.ok) return { data: null, error: json.error || 'Unknown error' };
    return { data: json as T, error: null };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface CFUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
}

export interface CFHouseholdUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
}

export const cfAuth = {
  async signUp(email: string, password: string, display_name: string) {
    const { data, error } = await apiFetch<{ token: string; user: CFUser }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, display_name }),
    });
    if (data) { setToken(data.token); localStorage.setItem('hhh_user', JSON.stringify(data.user)); }
    return { user: data?.user || null, error };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await apiFetch<{ token: string; user: CFUser }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data) { setToken(data.token); localStorage.setItem('hhh_user', JSON.stringify(data.user)); }
    return { user: data?.user || null, error };
  },

  signOut() {
    clearToken();
  },

  getStoredUser(): CFUser | null {
    try {
      const s = localStorage.getItem('hhh_user');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  },

  async refreshProfile(): Promise<CFUser | null> {
    const { data } = await apiFetch<CFUser>('/profile');
    if (data) localStorage.setItem('hhh_user', JSON.stringify(data));
    return data;
  },

  async listUsers() {
    return apiFetch<CFHouseholdUser[]>('/users');
  },

  async updateProfile(updates: { display_name?: string; avatar_url?: string }) {
    const { data, error } = await apiFetch<CFUser>('/profile', { method: 'PATCH', body: JSON.stringify(updates) });
    if (data) localStorage.setItem('hhh_user', JSON.stringify(data));
    return { data, error };
  },
};

// ─── Tasks ────────────────────────────────────────────────────────────────────
export interface CFTask {
  id: string;
  user_id: string;
  user_display_name?: string;
  title: string;
  description?: string;
  status: 'unseen' | 'seen' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  deadline?: string;
  assignee: string | 'both';
  assignee_name?: string;
  category: string;
  access: 'shared' | 'private';
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export const cfTasks = {
  async list() { return apiFetch<CFTask[]>('/tasks'); },
  async create(t: Omit<CFTask, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    return apiFetch<CFTask>('/tasks', { method: 'POST', body: JSON.stringify(t) });
  },
  async update(id: string, updates: Partial<CFTask>) {
    return apiFetch<CFTask>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
  },
  async remove(id: string) {
    return apiFetch<{ deleted: boolean }>(`/tasks/${id}`, { method: 'DELETE' });
  },
};

// ─── Shopping ─────────────────────────────────────────────────────────────────
export interface CFItem {
  id: string;
  list_id: string;
  name: string;
  quantity: string;
  bought: boolean;
  note?: string;
  url?: string;
  added_by_user_id?: string;
  added_by_name?: string;
}

export interface CFList {
  id: string;
  user_id: string;
  user_display_name?: string;
  title: string;
  type: 'daily' | 'global' | 'wishlist';
  category: string;
  access: 'shared' | 'private';
  pinned: boolean;
  created_at: string;
  items: CFItem[];
}

export const cfLists = {
  async list() { return apiFetch<CFList[]>('/lists'); },
  async create(l: Omit<CFList, 'id' | 'user_id' | 'created_at' | 'items'>) {
    return apiFetch<CFList>('/lists', { method: 'POST', body: JSON.stringify(l) });
  },
  async remove(id: string) {
    return apiFetch<{ deleted: boolean }>(`/lists/${id}`, { method: 'DELETE' });
  },
  async addItem(listId: string, item: { name: string; quantity?: string; note?: string; url?: string }) {
    return apiFetch<CFItem>(`/lists/${listId}/items`, { method: 'POST', body: JSON.stringify(item) });
  },
  async toggleItem(listId: string, itemId: string, bought: boolean) {
    return apiFetch<{ updated: boolean }>(`/lists/${listId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify({ bought }) });
  },
  async deleteItem(listId: string, itemId: string) {
    return apiFetch<{ deleted: boolean }>(`/lists/${listId}/items/${itemId}`, { method: 'DELETE' });
  },
};
