import type { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@identityforge/database';
import { CreateBeliefSchema } from '@identityforge/types';
import { handlePagesApiRequest } from '../../../lib/pages-api-adapter';

async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const userId = authHeader.replace('Bearer ', '');
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

// GET /api/beliefs - Get all beliefs with optional filters
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const isEmpowering = searchParams.get('isEmpowering');
    const parentBeliefId = searchParams.get('parentBeliefId');

    // Handle multiple types (comma-separated)
    const typeFilter = type
      ? type.includes(',')
        ? { in: type.split(',') as any }
        : type
      : undefined;

    const beliefs = await prisma.belief.findMany({
      where: {
        userId: user.id,
        isActive: true,
        ...(typeFilter && { type: typeFilter as any }),
        ...(category && { category }),
        ...(isEmpowering !== null && { isEmpowering: isEmpowering === 'true' }),
        ...(parentBeliefId && { parentBeliefId }),
      },
      orderBy: [
        { priority: 'asc' },
        { strength: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ beliefs });
  } catch (error) {
    console.error('Error fetching beliefs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/beliefs - Create new belief
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateBeliefSchema.parse(body);

    const belief = await prisma.belief.create({
      data: {
        userId: user.id,
        type: validatedData.type,
        statement: validatedData.statement,
        category: validatedData.category,
        origin: validatedData.origin,
        evidence: validatedData.evidence,
        strength: validatedData.strength ?? 0.5,
        priority: validatedData.priority,
        isEmpowering: validatedData.type !== 'LIMITING',
        parentBeliefId: validatedData.parentBeliefId,
      },
    });

    return NextResponse.json({ belief }, { status: 201 });
  } catch (error) {
    console.error('Error creating belief:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input', details: error }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return handlePagesApiRequest(req, res, { GET, POST });
}
