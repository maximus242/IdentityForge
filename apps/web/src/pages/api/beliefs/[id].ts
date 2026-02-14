import type { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@identityforge/database';
import { UpdateBeliefSchema } from '@identityforge/types';
import { handlePagesApiRequest } from '../../../lib/pages-api-adapter';

async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const userId = authHeader.replace('Bearer ', '');
  return prisma.user.findUnique({ where: { id: userId } });
}

function getBeliefId(req: NextApiRequest | NextRequest): string | null {
  if (req instanceof NextRequest) {
    const url = new URL(req.url);
    const parts = url.pathname.split('/');
    return parts[parts.length - 1] || null;
  }
  const { id } = req.query;
  return Array.isArray(id) ? id[0] : id || null;
}

// GET /api/beliefs/[id] - Get single belief
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = getBeliefId(request);
    if (!id) {
      return NextResponse.json({ error: 'Belief ID required' }, { status: 400 });
    }

    const belief = await prisma.belief.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!belief) {
      return NextResponse.json({ error: 'Belief not found' }, { status: 404 });
    }

    return NextResponse.json({ belief });
  } catch (error) {
    console.error('Error fetching belief:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/beliefs/[id] - Update belief
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = getBeliefId(request);
    if (!id) {
      return NextResponse.json({ error: 'Belief ID required' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = UpdateBeliefSchema.parse(body);

    const belief = await prisma.belief.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data: validatedData,
    });

    if (belief.count === 0) {
      return NextResponse.json({ error: 'Belief not found' }, { status: 404 });
    }

    const updated = await prisma.belief.findUnique({ where: { id } });
    return NextResponse.json({ belief: updated });
  } catch (error) {
    console.error('Error updating belief:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input', details: error }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/beliefs/[id] - Soft delete belief
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = getBeliefId(request);
    if (!id) {
      return NextResponse.json({ error: 'Belief ID required' }, { status: 400 });
    }

    await prisma.belief.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting belief:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return handlePagesApiRequest(req, res, { GET, PUT, DELETE });
}
