// Simple API client for mobile using AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://localhost:3000/api';

const TOKEN_KEY = '@identityforge_token';

// Get token
async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// Set token
async function setToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving token:', error);
  }
}

// Clear token
async function clearToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error clearing token:', error);
  }
}

// Auth API
export const authApi = {
  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();

    if (response.ok && data.session?.access_token) {
      await setToken(data.session.access_token);
    }

    return data;
  },

  async register(email: string, password: string) {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();

    if (response.ok && data.session?.access_token) {
      await setToken(data.session.access_token);
    }

    return data;
  },

  async logout() {
    await clearToken();
  },

  async getToken() {
    return getToken();
  },
};

// Values API
export const valuesApi = {
  async getAll() {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/values`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return response.json();
  },

  async create(value: { name: string; description?: string; priority?: number }) {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/values`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(value),
    });
    return response.json();
  },
};

// Entries API
export const entriesApi = {
  async getAll(limit = 30) {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/entries?limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return response.json();
  },

  async create(entry: {
    date: string;
    energyLevel?: number;
    morningResponse?: string;
    eveningResponse?: string;
    alignmentScore?: number;
  }) {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/entries`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    });
    return response.json();
  },
};

// Dashboard API
export const dashboardApi = {
  async get() {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return response.json();
  },
};

// Conversations API
export const conversationsApi = {
  async create(type: string, title?: string) {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, title }),
    });
    return response.json();
  },

  async sendMessage(conversationId: string, content: string) {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
    return response.json();
  },
};

// Identity API
export const identityApi = {
  async get() {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/identity`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return response.json();
  },

  async update(data: {
    identityStatement?: string;
    name?: string;
    beliefs?: string[];
    behaviors?: string[];
    traits?: string[];
  }) {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/identity`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};
