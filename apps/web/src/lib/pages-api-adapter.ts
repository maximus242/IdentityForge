import type { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';

type RouteMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
type RouteHandler = (request: NextRequest) => Promise<NextResponse> | NextResponse;

type RouteHandlers = Partial<Record<RouteMethod, RouteHandler>>;

function toHeaders(req: NextApiRequest): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      headers.set(key, value.join(','));
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }
  return headers;
}

function toBody(req: NextApiRequest): BodyInit | undefined {
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') {
    return undefined;
  }

  if (req.body == null) {
    return undefined;
  }

  if (typeof req.body === 'string') {
    return req.body;
  }

  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }

  return JSON.stringify(req.body);
}

function toNextRequest(req: NextApiRequest): NextRequest {
  const host = req.headers.host || 'localhost:3000';
  const protocol = (req.headers['x-forwarded-proto'] as string) || 'http';
  const url = new URL(req.url || '/', `${protocol}://${host}`);

  return new NextRequest(url, {
    method: req.method,
    headers: toHeaders(req),
    body: toBody(req),
  } as any);
}

async function writeResponse(res: NextApiResponse, response: NextResponse) {
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (contentType.includes('application/json')) {
    if (text.length === 0) {
      res.status(response.status).json(null);
      return;
    }

    try {
      res.status(response.status).json(JSON.parse(text));
      return;
    } catch {
      // Fall through and send raw text if body is not valid JSON.
    }
  }

  res.status(response.status).send(text);
}

export async function handlePagesApiRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  handlers: RouteHandlers
) {
  const method = (req.method || 'GET').toUpperCase() as RouteMethod;
  const handler = handlers[method];

  if (!handler) {
    const allowedMethods = Object.keys(handlers).join(', ');
    if (allowedMethods) {
      res.setHeader('Allow', allowedMethods);
    }
    res.status(405).json({ error: `Method ${method} Not Allowed` });
    return;
  }

  try {
    const request = toNextRequest(req);
    const response = await handler(request);
    await writeResponse(res, response);
  } catch (error) {
    console.error('Pages API adapter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
