// Auth login API route
import type { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@identityforge/database';
import { handlePagesApiRequest } from '../../../lib/pages-api-adapter';

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isLocalAuthEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_LOCAL_AUTH === 'true' ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function createLocalSession(user: { id: string; email: string }) {
  return {
    access_token: user.id,
    token_type: 'bearer' as const,
    user: {
      id: user.id,
      email: user.email,
    },
  };
}

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    if (isLocalAuthEnabled()) {
      const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (!user) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      return NextResponse.json({
        user,
        session: createLocalSession(user),
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 401 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: authData.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user, session: authData.session });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return handlePagesApiRequest(req, res, { POST });
}
