import type { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@identityforge/database';
import { handlePagesApiRequest } from '../../../../lib/pages-api-adapter';

// Helper to get user from token
async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const userId = authHeader.replace('Bearer ', '');
  return prisma.user.findUnique({ where: { id: userId } });
}

function getBeliefId(request: NextRequest): string | null {
  const url = new URL(request.url);
  const parts = url.pathname.split('/');
  return parts[parts.length - 2] || null; // -2 because /transform is last
}

// POST /api/beliefs/[id]/transform - Transform limiting belief into empowering belief
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = getBeliefId(request);
    if (!id) {
      return NextResponse.json({ error: 'Belief ID required' }, { status: 400 });
    }

    const { transformedStatement, evidence, practices } = await request.json();

    if (!transformedStatement || !evidence) {
      return NextResponse.json(
        { error: 'transformedStatement and evidence are required' },
        { status: 400 }
      );
    }

    const originalBelief = await prisma.belief.findFirst({
      where: { id, userId: user.id },
    });

    if (!originalBelief) {
      return NextResponse.json({ error: 'Belief not found' }, { status: 404 });
    }

    if (originalBelief.type !== 'LIMITING') {
      return NextResponse.json(
        { error: 'Can only transform limiting beliefs' },
        { status: 400 }
      );
    }

    // Create empowering belief
    const empoweringBelief = await prisma.belief.create({
      data: {
        userId: user.id,
        type: 'EMPOWERING',
        statement: transformedStatement,
        evidence,
        category: originalBelief.category,
        origin: `Transformed from: "${originalBelief.statement}"`,
        strength: 0.3, // New beliefs start weaker
        isEmpowering: true,
        isActive: true,
      },
    });

    // Update original belief with challenge and weaken it
    await prisma.belief.update({
      where: { id },
      data: {
        challenge: transformedStatement,
        counterEvidence: evidence,
        strength: Math.max(0, (originalBelief.strength ?? 0.5) - 0.2),
      },
    });

    return NextResponse.json({
      originalBelief: await prisma.belief.findUnique({ where: { id } }),
      empoweringBelief,
    });
  } catch (error) {
    console.error('Error transforming belief:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return handlePagesApiRequest(req, res, { POST });
}
