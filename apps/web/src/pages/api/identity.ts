// Identity API routes
import type { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@identityforge/database';
import { handlePagesApiRequest } from '../../lib/pages-api-adapter';

// Helper to get user from token
async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const userId = authHeader.replace('Bearer ', '');
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

// GET /api/identity - Get user's identity
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all archetypes
    const archetypes = await prisma.identityArchetype.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    // Get active archetype
    const activeArchetype = archetypes.find((a) => a.isActive) || null;

    return NextResponse.json({
      identityStatement: user.currentIdentityStatement,
      archetypes,
      activeArchetype,
    });
  } catch (error) {
    console.error('Get identity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/identity - Create identity archetype
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, beliefs, behaviors, traits, embodiedPractice, identityStatement } = await request.json();

    // Update user's identity statement if provided
    if (identityStatement !== undefined) {
      await prisma.user.update({
        where: { id: user.id },
        data: { currentIdentityStatement: identityStatement },
      });
    }

    // Deactivate other archetypes
    await prisma.identityArchetype.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false },
    });

    // Create new archetype
    const archetype = await prisma.identityArchetype.create({
      data: {
        userId: user.id,
        name,
        description,
        beliefs: beliefs || [],
        behaviors: behaviors || [],
        traits: traits || [],
        embodiedPractice,
        isActive: true,
      },
    });

    // Dual-write: Create core identity belief and child beliefs
    const coreIdentityBelief = await prisma.belief.create({
      data: {
        userId: user.id,
        type: 'IDENTITY_CORE',
        statement: description || `I am ${name}`,
        category: 'CORE_IDENTITY',
        isEmpowering: true,
        isActive: true,
        sourceType: 'IdentityArchetype',
        sourceId: archetype.id,
      },
    });

    // Create child beliefs for each belief statement
    for (const beliefText of (beliefs || [])) {
      await prisma.belief.create({
        data: {
          userId: user.id,
          type: 'IDENTITY_CORE',
          statement: beliefText,
          isEmpowering: true,
          isActive: true,
          sourceType: 'IdentityArchetype',
          sourceId: archetype.id,
          parentBeliefId: coreIdentityBelief.id,
        },
      });
    }

    // Create child beliefs for behaviors
    for (const behaviorText of (behaviors || [])) {
      await prisma.belief.create({
        data: {
          userId: user.id,
          type: 'IDENTITY_BEHAVIOR',
          statement: behaviorText,
          isEmpowering: true,
          isActive: true,
          sourceType: 'IdentityArchetype',
          sourceId: archetype.id,
          parentBeliefId: coreIdentityBelief.id,
        },
      });
    }

    // Create child beliefs for traits
    for (const traitText of (traits || [])) {
      await prisma.belief.create({
        data: {
          userId: user.id,
          type: 'IDENTITY_TRAIT',
          statement: traitText,
          isEmpowering: true,
          isActive: true,
          sourceType: 'IdentityArchetype',
          sourceId: archetype.id,
          parentBeliefId: coreIdentityBelief.id,
        },
      });
    }

    // Create embodiment belief if present
    if (embodiedPractice) {
      await prisma.belief.create({
        data: {
          userId: user.id,
          type: 'IDENTITY_EMBODIMENT',
          statement: embodiedPractice,
          isEmpowering: true,
          isActive: true,
          sourceType: 'IdentityArchetype',
          sourceId: archetype.id,
          parentBeliefId: coreIdentityBelief.id,
        },
      });
    }

    return NextResponse.json({ archetype });
  } catch (error) {
    console.error('Create identity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/identity - Update identity archetype
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, description, beliefs, behaviors, traits, embodiedPractice, isActive, identityStatement } = await request.json();

    // Update identity statement if provided
    if (identityStatement !== undefined) {
      await prisma.user.update({
        where: { id: user.id },
        data: { currentIdentityStatement: identityStatement },
      });
    }

    // Update archetype if id provided
    if (id) {
      const archetype = await prisma.identityArchetype.update({
        where: { id },
        data: {
          name,
          description,
          beliefs,
          behaviors,
          traits,
          embodiedPractice,
          isActive,
        },
      });

      // Dual-write: Delete existing child beliefs and recreate
      // First, find the core belief
      const coreBelief = await prisma.belief.findFirst({
        where: {
          sourceType: 'IdentityArchetype',
          sourceId: id,
          userId: user.id,
          parentBeliefId: null,
        },
      });

      if (coreBelief) {
        // Update core belief
        await prisma.belief.update({
          where: { id: coreBelief.id },
          data: {
            statement: description || `I am ${name}`,
            isActive: isActive ?? true,
          },
        });

        // Delete existing child beliefs
        await prisma.belief.deleteMany({
          where: {
            parentBeliefId: coreBelief.id,
          },
        });

        // Recreate child beliefs
        for (const beliefText of (beliefs || [])) {
          await prisma.belief.create({
            data: {
              userId: user.id,
              type: 'IDENTITY_CORE',
              statement: beliefText,
              isEmpowering: true,
              isActive: isActive ?? true,
              sourceType: 'IdentityArchetype',
              sourceId: id,
              parentBeliefId: coreBelief.id,
            },
          });
        }

        for (const behaviorText of (behaviors || [])) {
          await prisma.belief.create({
            data: {
              userId: user.id,
              type: 'IDENTITY_BEHAVIOR',
              statement: behaviorText,
              isEmpowering: true,
              isActive: isActive ?? true,
              sourceType: 'IdentityArchetype',
              sourceId: id,
              parentBeliefId: coreBelief.id,
            },
          });
        }

        for (const traitText of (traits || [])) {
          await prisma.belief.create({
            data: {
              userId: user.id,
              type: 'IDENTITY_TRAIT',
              statement: traitText,
              isEmpowering: true,
              isActive: isActive ?? true,
              sourceType: 'IdentityArchetype',
              sourceId: id,
              parentBeliefId: coreBelief.id,
            },
          });
        }

        if (embodiedPractice) {
          await prisma.belief.create({
            data: {
              userId: user.id,
              type: 'IDENTITY_EMBODIMENT',
              statement: embodiedPractice,
              isEmpowering: true,
              isActive: isActive ?? true,
              sourceType: 'IdentityArchetype',
              sourceId: id,
              parentBeliefId: coreBelief.id,
            },
          });
        }
      }

      return NextResponse.json({ archetype });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update identity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/identity - Delete identity archetype
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Archetype ID required' }, { status: 400 });
    }

    // Verify it belongs to user
    const existing = await prisma.identityArchetype.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Archetype not found' }, { status: 404 });
    }

    await prisma.identityArchetype.delete({
      where: { id },
    });

    // Dual-write: Soft delete all related beliefs
    await prisma.belief.updateMany({
      where: {
        sourceType: 'IdentityArchetype',
        sourceId: id,
        userId: user.id,
      },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete identity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return handlePagesApiRequest(req, res, { GET, POST, PUT, DELETE });
}
