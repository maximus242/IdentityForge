// Values API routes
import type { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@identityforge/database';
import { handlePagesApiRequest } from '../../../lib/pages-api-adapter';

// Helper to get user from token
async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  // In production, verify the JWT token here
  // For now, extract user ID from header
  const userId = authHeader.replace('Bearer ', '');
  if (!userId) return null;

  return prisma.user.findUnique({ where: { id: userId } });
}

// Helper to infer belief category from value name
function inferValueCategory(valueName: string): string {
  const name = valueName.toLowerCase();

  if (name.includes('growth') || name.includes('learn')) return 'GROWTH';
  if (name.includes('connect') || name.includes('relationship') || name.includes('family')) return 'CONNECTION';
  if (name.includes('achieve') || name.includes('success') || name.includes('accomplish')) return 'ACHIEVEMENT';
  if (name.includes('contribute') || name.includes('help') || name.includes('give')) return 'CONTRIBUTION';
  if (name.includes('freedom') || name.includes('autonomy') || name.includes('independent')) return 'FREEDOM';
  if (name.includes('security') || name.includes('stability') || name.includes('safe')) return 'SECURITY';

  return 'GROWTH'; // Default fallback
}

// GET /api/values - Get all values for user
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const values = await prisma.value.findMany({
      where: { userId: user.id },
      orderBy: { priority: 'asc' },
    });

    return NextResponse.json({ values });
  } catch (error) {
    console.error('Get values error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/values - Create a new value
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, priority, whyDeepDive, connectionToIdentity } = await request.json();

    const value = await prisma.value.create({
      data: {
        userId: user.id,
        name,
        description,
        priority: priority || 0,
        whyDeepDive,
        connectionToIdentity,
      },
    });

    // Dual-write: Also create corresponding Belief
    await prisma.belief.create({
      data: {
        userId: user.id,
        type: 'VALUE',
        statement: description || `${name} is important to me`,
        category: inferValueCategory(name),
        origin: whyDeepDive || undefined,
        evidence: connectionToIdentity || undefined,
        strength: priority ? (10 - priority) / 10 : 0.5,
        priority: priority || 0,
        isEmpowering: true,
        sourceType: 'Value',
        sourceId: value.id,
      },
    });

    return NextResponse.json({ value });
  } catch (error) {
    console.error('Create value error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/values - Update a value
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, description, priority, whyDeepDive, connectionToIdentity } = await request.json();

    // Verify the value belongs to the user
    const existingValue = await prisma.value.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingValue) {
      return NextResponse.json({ error: 'Value not found' }, { status: 404 });
    }

    const value = await prisma.value.update({
      where: { id },
      data: {
        name,
        description,
        priority,
        whyDeepDive,
        connectionToIdentity,
      },
    });

    // Dual-write: Update corresponding Belief if it exists
    const existingBelief = await prisma.belief.findFirst({
      where: { sourceType: 'Value', sourceId: id, userId: user.id },
    });

    if (existingBelief) {
      await prisma.belief.update({
        where: { id: existingBelief.id },
        data: {
          statement: description || `${name} is important to me`,
          category: inferValueCategory(name),
          origin: whyDeepDive || undefined,
          evidence: connectionToIdentity || undefined,
          strength: priority ? (10 - priority) / 10 : 0.5,
          priority: priority || 0,
        },
      });
    }

    return NextResponse.json({ value });
  } catch (error) {
    console.error('Update value error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/values - Delete a value
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Value ID required' }, { status: 400 });
    }

    // Verify the value belongs to the user
    const existingValue = await prisma.value.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingValue) {
      return NextResponse.json({ error: 'Value not found' }, { status: 404 });
    }

    await prisma.value.delete({
      where: { id },
    });

    // Dual-write: Soft delete corresponding Belief if it exists
    await prisma.belief.updateMany({
      where: { sourceType: 'Value', sourceId: id, userId: user.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete value error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return handlePagesApiRequest(req, res, { GET, POST, PUT, DELETE });
}
