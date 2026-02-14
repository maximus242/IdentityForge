/** @jest-environment node */

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@identityforge/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockPrisma = jest.requireMock('@identityforge/database').default as {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
};

const { default: handler } = require('../src/pages/api/auth/local');

type MockResponse = NextApiResponse & {
  body?: unknown;
  headers: Record<string, string>;
};

function createRequest(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return {
    method: 'POST',
    headers: {},
    body: {},
    ...overrides,
  } as NextApiRequest;
}

function createResponse(): MockResponse {
  const res = {
    statusCode: 200,
    headers: {},
    setHeader: jest.fn((key: string, value: string) => {
      res.headers[key] = value;
    }),
    status: jest.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn((payload: unknown) => {
      res.body = payload;
      return res;
    }),
    send: jest.fn((payload: unknown) => {
      res.body = payload;
      return res;
    }),
  } as unknown as MockResponse;

  return res;
}

describe('/api/auth/local', () => {
  const ORIGINAL_ENV = process.env;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    process.env.NEXT_PUBLIC_LOCAL_AUTH = 'true';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns 405 on unsupported methods', async () => {
    const req = createRequest({ method: 'GET' });
    const res = createResponse();

    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.body).toEqual({ error: 'Method GET Not Allowed' });
  });

  it('returns 404 when local auth is disabled', async () => {
    process.env.NEXT_PUBLIC_LOCAL_AUTH = 'false';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';

    const req = createRequest({
      method: 'POST',
      body: { mode: 'signin', email: 'user@example.com' },
    });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = createRequest({
      method: 'POST',
      body: '{invalid json',
    });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ error: 'Invalid JSON body' });
  });

  it('returns 400 for invalid mode or email', async () => {
    const req = createRequest({
      method: 'POST',
      body: { mode: 'invalid', email: 'not-an-email' },
    });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ error: 'Valid email and mode are required' });
  });

  it('creates a user on signup and returns a local session', async () => {
    const createdUser = { id: 'user-1', email: 'new@example.com' };
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue(createdUser);

    const req = createRequest({
      method: 'POST',
      body: { mode: 'signup', email: 'NEW@example.com' },
    });
    const res = createResponse();

    await handler(req, res);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'new@example.com' },
    });
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: { email: 'new@example.com' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({
      user: createdUser,
      session: {
        access_token: 'user-1',
        token_type: 'bearer',
        user: createdUser,
      },
    });
  });

  it('returns existing user on signup without creating duplicate user', async () => {
    const existingUser = { id: 'user-2', email: 'existing@example.com' };
    mockPrisma.user.findUnique.mockResolvedValue(existingUser);

    const req = createRequest({
      method: 'POST',
      body: { mode: 'signup', email: 'existing@example.com' },
    });
    const res = createResponse();

    await handler(req, res);

    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({
      user: existingUser,
      session: {
        access_token: 'user-2',
        token_type: 'bearer',
        user: existingUser,
      },
    });
  });

  it('returns 401 for signin when user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = createRequest({
      method: 'POST',
      body: { mode: 'signin', email: 'missing@example.com' },
    });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ error: 'Invalid credentials' });
  });

  it('returns local session for signin when user exists', async () => {
    const user = { id: 'user-3', email: 'signin@example.com' };
    mockPrisma.user.findUnique.mockResolvedValue(user);

    const req = createRequest({
      method: 'POST',
      body: { mode: 'signin', email: 'signin@example.com' },
    });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({
      user,
      session: {
        access_token: 'user-3',
        token_type: 'bearer',
        user,
      },
    });
  });

  it('returns actionable 503 when database is unavailable', async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error("P1001: Can't reach database server"));

    const req = createRequest({
      method: 'POST',
      body: { mode: 'signin', email: 'user@example.com' },
    });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.body).toEqual({
      error: 'Local database is not ready. Start PostgreSQL and run `npm run db:push`.',
    });
  });
});
