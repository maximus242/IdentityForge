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

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (isLocalAuthEnabled()) {
      let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
          },
        });
      }

      return NextResponse.json({
        user,
        session: createLocalSession(user),
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Create user record in database
    if (data.user) {
      await prisma.user.create({
        data: {
          id: data.user.id,
          email: normalizedEmail,
        },
      });
    }

    return NextResponse.json({
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return handlePagesApiRequest(req, res, { POST });
}
