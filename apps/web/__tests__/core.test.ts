/** @jest-environment node */

import type { NextApiRequest, NextApiResponse } from 'next';
import { NextResponse } from 'next/server';
import { handlePagesApiRequest } from '../src/lib/pages-api-adapter';

type MockResponse = NextApiResponse & {
  body?: unknown;
  headers: Record<string, string>;
};

function createRequest(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return {
    method: 'GET',
    headers: {},
    url: '/api/test',
    body: undefined,
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

describe('pages API adapter', () => {
  it('returns 405 and allow header for unsupported method', async () => {
    const req = createRequest({ method: 'PUT' });
    const res = createResponse();

    await handlePagesApiRequest(req, res, {
      GET: async () => NextResponse.json({ ok: true }),
      POST: async () => NextResponse.json({ ok: true }),
    });

    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'GET, POST');
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.body).toEqual({ error: 'Method PUT Not Allowed' });
  });

  it('forwards request and writes JSON response correctly', async () => {
    const req = createRequest({
      method: 'POST',
      headers: { host: 'localhost:3000', authorization: 'Bearer token' },
      body: { hello: 'world' },
      url: '/api/test?x=1',
    });
    const res = createResponse();

    await handlePagesApiRequest(req, res, {
      POST: async (request) => {
        const payload = await request.json();
        return NextResponse.json({
          method: request.method,
          path: new URL(request.url).pathname,
          auth: request.headers.get('authorization'),
          payload,
        });
      },
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({
      method: 'POST',
      path: '/api/test',
      auth: 'Bearer token',
      payload: { hello: 'world' },
    });
  });

  it('returns 500 when route handler throws', async () => {
    const req = createRequest({ method: 'GET' });
    const res = createResponse();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await handlePagesApiRequest(req, res, {
      GET: async () => {
        throw new Error('boom');
      },
    });

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    spy.mockRestore();
  });
});
