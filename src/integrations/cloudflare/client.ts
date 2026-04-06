/**
 * Cloudflare Worker API client.
 * All requests go to /api/* which is proxied to the Worker.
 */

const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('hhh_token');
}

function setToken(token: string) {
  localStorage.setItem('hhh_token', token);
}

function clearToken() {
  localStorage.removeItem('hhh_token');
  localStorage.removeItem('hhh_user');
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<{ data: T | null; error: string | null }> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  try {
    const response = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
    });
    const contentType = response.headers.get('Content-Type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : null;
    if (!response.ok) return { data: null, error: payload?.error || 'Unknown error' };
    return { data: payload as T, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

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

export interface CFNotification {
  id: string;
  user_id: string;
  actor_id: string;
  actor_name: string;
  actor_avatar_url: string | null;
  event_type: 'shared_list_created' | 'task_assigned';
  title: string;
  body: string;
  entity_id: string;
  entity_type: 'list' | 'task';
  link: string;
  read_at: string | null;
  created_at: string;
}

export const cfAuth = {
  async signUp(email: string, password: string, display_name: string) {
    const { data, error } = await apiFetch<{ token: string; user: CFUser }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, display_name }),
    });
    if (data) {
      setToken(data.token);
      localStorage.setItem('hhh_user', JSON.stringify(data.user));
    }
    return { user: data?.user || null, error };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await apiFetch<{ token: string; user: CFUser }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data) {
      setToken(data.token);
      localStorage.setItem('hhh_user', JSON.stringify(data.user));
    }
    return { user: data?.user || null, error };
  },

  signOut() {
    clearToken();
  },

  getStoredUser(): CFUser | null {
    try {
      const stored = localStorage.getItem('hhh_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
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
    const { data, error } = await apiFetch<CFUser>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    if (data) localStorage.setItem('hhh_user', JSON.stringify(data));
    return { data, error };
  },
};

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
  async list() {
    return apiFetch<CFTask[]>('/tasks');
  },
  async create(task: Omit<CFTask, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    return apiFetch<CFTask>('/tasks', { method: 'POST', body: JSON.stringify(task) });
  },
  async update(id: string, updates: Partial<CFTask>) {
    return apiFetch<CFTask>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
  },
  async remove(id: string) {
    return apiFetch<{ deleted: boolean }>(`/tasks/${id}`, { method: 'DELETE' });
  },
};

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
  async list() {
    return apiFetch<CFList[]>('/lists');
  },
  async create(list: Omit<CFList, 'id' | 'user_id' | 'created_at' | 'items'>) {
    return apiFetch<CFList>('/lists', { method: 'POST', body: JSON.stringify(list) });
  },
  async remove(id: string) {
    return apiFetch<{ deleted: boolean }>(`/lists/${id}`, { method: 'DELETE' });
  },
  async addItem(listId: string, item: { name: string; quantity?: string; note?: string; url?: string }) {
    return apiFetch<CFItem>(`/lists/${listId}/items`, { method: 'POST', body: JSON.stringify(item) });
  },
  async toggleItem(listId: string, itemId: string, bought: boolean) {
    return apiFetch<{ updated: boolean }>(`/lists/${listId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ bought }),
    });
  },
  async deleteItem(listId: string, itemId: string) {
    return apiFetch<{ deleted: boolean }>(`/lists/${listId}/items/${itemId}`, { method: 'DELETE' });
  },
};

export interface CFWardrobeItem {
  id: string;
  user_id: string;
  name: string;
  category: string;
  seasons: string[];
  colors?: string | null;
  temp_min?: number | null;
  temp_max?: number | null;
  description?: string | null;
  photo_key?: string | null;
  photo_url?: string | null;
  created_at: string;
}

export interface CFWardrobeSuggestion {
  source: 'ai' | 'fallback';
  outfit: string[];
  items: CFWardrobeItem[];
  explanation: string;
  available_count: number;
}

export const cfWardrobe = {
  async list() {
    return apiFetch<CFWardrobeItem[]>('/wardrobe');
  },
  async create(item: Omit<CFWardrobeItem, 'id' | 'user_id' | 'created_at' | 'photo_url'>) {
    return apiFetch<CFWardrobeItem>('/wardrobe', { method: 'POST', body: JSON.stringify(item) });
  },
  async update(id: string, updates: Partial<Omit<CFWardrobeItem, 'id' | 'user_id' | 'created_at' | 'photo_url'>>) {
    return apiFetch<CFWardrobeItem>(`/wardrobe/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
  },
  async remove(id: string) {
    return apiFetch<{ deleted: boolean }>(`/wardrobe/${id}`, { method: 'DELETE' });
  },
  async uploadPhoto(file: File | Blob) {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<{ photo_key: string }>('/wardrobe/photo', { method: 'POST', body: formData });
  },
  async suggest(params: {
    temp: number;
    tempMin: number;
    tempMax: number;
    precip: number;
    windSpeed: number;
    weatherDesc: string;
    season: string;
  }) {
    const query = new URLSearchParams({
      temp: String(params.temp),
      tempMin: String(params.tempMin),
      tempMax: String(params.tempMax),
      precip: String(params.precip),
      windSpeed: String(params.windSpeed),
      weatherDesc: params.weatherDesc,
      season: params.season,
    });
    return apiFetch<CFWardrobeSuggestion>(`/wardrobe/suggest?${query.toString()}`);
  },
  async saveOutfit(itemIds: string[], weatherTemp: number) {
    return apiFetch<{ id: string; saved: boolean }>('/wardrobe/outfit/save', {
      method: 'POST',
      body: JSON.stringify({ item_ids: itemIds, weather_temp: weatherTemp }),
    });
  },
};

export const cfNotifications = {
  async list(since?: string) {
    const query = since ? `?since=${encodeURIComponent(since)}` : '';
    return apiFetch<CFNotification[]>(`/notifications${query}`);
  },
  async markAllRead() {
    return apiFetch<{ updated: boolean }>('/notifications/read-all', { method: 'POST' });
  },
};
