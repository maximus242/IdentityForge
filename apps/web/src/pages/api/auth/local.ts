import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@identityforge/database';

type LocalAuthBody = {
  mode?: 'signup' | 'signin';
  email?: string;
  password?: string;
};

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getLocalAuthErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes("Can't reach database server") ||
    message.includes('database') ||
    message.includes('P1001') ||
    message.includes('P2021')
  ) {
    return 'Local database is not ready. Start PostgreSQL and run `npm run db:push`.';
  }

  return 'Local auth failed unexpectedly.';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const localAuthEnabled =
    process.env.NEXT_PUBLIC_LOCAL_AUTH === 'true' ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!localAuthEnabled) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: `Method ${req.method || 'UNKNOWN'} Not Allowed` });
    return;
  }

  let body: LocalAuthBody = {};
  try {
    body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}) as LocalAuthBody;
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const mode = body.mode || 'signin';
  const email = normalizeEmail(body.email);

  if ((mode !== 'signup' && mode !== 'signin') || !isValidEmail(email)) {
    res.status(400).json({ error: 'Valid email and mode are required' });
    return;
  }

  try {
    let user = await prisma.user.findUnique({ where: { email } });

    if (mode === 'signup') {
      user =
        user ??
        (await prisma.user.create({
          data: { email },
        }));
    } else if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Keep local auth password-less by design for local testing only.
    const session = {
      access_token: user!.id,
      token_type: 'bearer' as const,
      user: {
        id: user!.id,
        email: user!.email,
      },
    };

    res.status(200).json({
      user: session.user,
      session,
    });
  } catch (error) {
    console.error('Local auth error:', error);
    res.status(503).json({ error: getLocalAuthErrorMessage(error) });
  }
}
