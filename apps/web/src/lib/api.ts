// API Client for IdentityForge
import { supabase } from './supabase';

const API_BASE = '/api';

// Helper to get auth headers
async function getHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token || ''}`,
  };
}

// Auth API
export const authApi = {
  async register(email: string, password: string) {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  },

  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  },
};

// Values API
export const valuesApi = {
  async getAll() {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE}/values`, { headers });
    return response.json();
  },

  async create(value: { name: string; description?: string; priority?: number; whyDeepDive?: string; connectionToIdentity?: string }) {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE}/values`, {
      method: 'POST',
      headers,
      body: JSON.stringify(value),
    });
    return response.json();
  },

  async update(id: string, value: { name?: string; description?: string; priority?: number; whyDeepDive?: string; connectionToIdentity?: string }) {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE}/values`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ id, ...value }),
    });
    return response.json();
  },

  async delete(id: string) {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE}/values?id=${id}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },
};

// Daily Entries API
export const entriesApi = {
  async getAll(limit = 30, offset = 0) {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE}/entries?limit=${limit}&offset=${offset}`, { headers });
    return response.json();
  },

  async create(entry: {
    date: string;
    energyLevel?: number;
    moodNote?: string;
    alignmentScore?: number;
    morningResponse?: string;
    eveningResponse?: string;
    valueIds?: string[];
  }) {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE}/entries`, {
      method: 'POST',
      headers,
      body: JSON.stringify(entry),
    });
    return response.json();
  },

  async update(id: string, entry: {
    energyLevel?: number;
    moodNote?: string;
    alignmentScore?: number;
    morningResponse?: string;
    eveningResponse?: string;
    aiReflection?: string;
  }) {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE}/entries`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ id, ...entry }),
    });
    return response.json();
  },
};

// Conversations API
export const conversationsApi = {
  async getAll(active = false) {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE}/conversations?active=${active}`, { headers });
    return response.json();
  },

  async create(type: string, title?: string) {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type, title }),
    });
    return response.json();
  },

  async sendMessage(conversationId: string, content: string) {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content }),
    });
    return response.json();
  },
};

// Dashboard API
export const dashboardApi = {
  async get() {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE}/dashboard`, { headers });
    return response.json();
  },
};

// Identity API
export const identityApi = {
  async get() {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE}/identity`, { headers });
    return response.json();
  },

  async update(data: {
    identityStatement?: string;
    name?: string;
    description?: string;
    beliefs?: string[];
    behaviors?: string[];
    traits?: string[];
    embodiedPractice?: string;
  }) {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE}/identity`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return response.json();
  },
};
