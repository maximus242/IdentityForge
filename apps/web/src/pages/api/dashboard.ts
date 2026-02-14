// Dashboard API - Get user dashboard data
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

// GET /api/dashboard - Get dashboard data
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get top values
    const topValues = await prisma.value.findMany({
      where: { userId: user.id },
      orderBy: { priority: 'asc' },
      take: 5,
    });

    // Get recent entries
    const recentEntries = await prisma.dailyEntry.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 7,
      include: {
        values: {
          include: { value: true },
        },
      },
    });

    // Get active archetype
    const activeArchetype = await prisma.identityArchetype.findFirst({
      where: {
        userId: user.id,
        isActive: true,
      },
    });

    // Calculate stats
    const allEntries = await prisma.dailyEntry.findMany({
      where: { userId: user.id },
    });

    const totalEntries = allEntries.length;
    const avgEnergy = totalEntries > 0
      ? allEntries.reduce((sum, e) => sum + (e.energyLevel || 0), 0) / totalEntries
      : 0;
    const avgAlignment = totalEntries > 0
      ? allEntries.reduce((sum, e) => sum + (e.alignmentScore || 0), 0) / totalEntries
      : 0;

    // Calculate streak (consecutive days with entries)
    let currentStreak = 0;
    if (allEntries.length > 0) {
      const sortedEntries = allEntries.sort((a, b) => b.date.getTime() - a.date.getTime());
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < sortedEntries.length; i++) {
        const entryDate = new Date(sortedEntries[i].date);
        entryDate.setHours(0, 0, 0, 0);

        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);

        if (entryDate.getTime() === expectedDate.getTime()) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    return NextResponse.json({
      user,
      topValues,
      recentEntries,
      activeArchetype,
      stats: {
        totalEntries,
        averageAlignment: Math.round(avgAlignment * 10) / 10,
        averageEnergy: Math.round(avgEnergy * 10) / 10,
        currentStreak,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return handlePagesApiRequest(req, res, { GET });
}
