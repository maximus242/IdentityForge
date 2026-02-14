import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
const localAuthEnabled =
  process.env.NEXT_PUBLIC_LOCAL_AUTH === 'true' || !hasSupabaseConfig;
const localSessionStorageKey = 'identityforge.localAuthSession';

type LocalUser = {
  id: string;
  email: string;
};

type LocalSession = {
  access_token: string;
  token_type: 'bearer';
  user: LocalUser;
};

type AuthListener = (event: string, session: LocalSession | null) => void;

const authListeners = new Set<AuthListener>();

function isBrowser() {
  return typeof window !== 'undefined';
}

function notifyAuthListeners(event: string, session: LocalSession | null) {
  authListeners.forEach((listener) => {
    listener(event, session);
  });
}

function readLocalSession(): LocalSession | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(localSessionStorageKey);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as LocalSession;
  } catch {
    return null;
  }
}

function writeLocalSession(session: LocalSession | null) {
  if (!isBrowser()) {
    return;
  }

  if (session) {
    window.localStorage.setItem(localSessionStorageKey, JSON.stringify(session));
    notifyAuthListeners('SIGNED_IN', session);
  } else {
    window.localStorage.removeItem(localSessionStorageKey);
    notifyAuthListeners('SIGNED_OUT', null);
  }
}

async function callLocalAuth(mode: 'signup' | 'signin', email: string, password: string) {
  try {
    const response = await fetch('/api/auth/local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, email, password }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload?.error || `Local auth request failed (${response.status})`;
      return { data: { user: null, session: null }, error: new Error(message) };
    }

    const session = payload?.session as LocalSession;
    if (!session?.user?.id) {
      return { data: { user: null, session: null }, error: new Error('Invalid local auth response') };
    }

    writeLocalSession(session);
    return { data: { user: session.user, session }, error: null };
  } catch (error) {
    return { data: { user: null, session: null }, error: error as Error };
  }
}

const localSupabase = {
  auth: {
    signUp: async ({ email, password }: { email: string; password: string }) =>
      callLocalAuth('signup', email, password),
    signInWithPassword: async ({ email, password }: { email: string; password: string }) =>
      callLocalAuth('signin', email, password),
    signOut: async () => {
      writeLocalSession(null);
      return { error: null };
    },
    getSession: async () => ({ data: { session: readLocalSession() }, error: null }),
    getUser: async () => {
      const session = readLocalSession();
      return { data: { user: session?.user || null }, error: null };
    },
    onAuthStateChange: (callback: AuthListener) => {
      authListeners.add(callback);
      callback('INITIAL_SESSION', readLocalSession());
      return {
        data: {
          subscription: {
            unsubscribe: () => authListeners.delete(callback),
          },
        },
      };
    },
  },
};

const realSupabase =
  hasSupabaseConfig
    ? createClient(supabaseUrl!, supabaseAnonKey!)
    : null;

export const supabase: any = localAuthEnabled
  ? localSupabase
  : realSupabase!;

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    throw error;
  }
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
  return data;
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  return data.user;
}

export function onAuthStateChange(
  callback: (event: any, session: any) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}
