import '@testing-library/jest-dom';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
  }),
  Router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: (props) => props.children,
}));

// Mock supabase
jest.mock('./src/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token', user: { id: 'test-user-id' } } },
        error: null,
      }),
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
      onAuthStateChange: jest.fn(),
    },
  },
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
  getCurrentUser: jest.fn(),
  onAuthStateChange: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();
