// Pattern Analysis API
import type { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@identityforge/database';
import { analyzePatterns } from '@identityforge/ai';
import { handlePagesApiRequest } from '../../lib/pages-api-adapter';

type PatternAnalysis = Awaited<ReturnType<typeof analyzePatterns>>;

// Helper to get user from token
async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const userId = authHeader.replace('Bearer ', '');
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

// GET /api/patterns - Get pattern analysis (or weekly summary with ?type=weekly)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // Handle weekly summary request
    if (type === 'weekly') {
      return handleWeeklySummary(request);
    }

    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's recent entries for analysis
    const entries = await prisma.dailyEntry.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 30,
      select: {
        date: true,
        energyLevel: true,
        alignmentScore: true,
        morningResponse: true,
        eveningResponse: true,
      },
    });

    // Get user's values
    const values = await prisma.value.findMany({
      where: { userId: user.id },
      select: { name: true },
    });

    // Analyze patterns if we have enough data
    let patternAnalysis: PatternAnalysis | null = null;
    if (entries.length >= 7) {
      patternAnalysis = await analyzePatterns(
        entries.map((e) => ({
          date: e.date,
          energyLevel: e.energyLevel,
          alignmentScore: e.alignmentScore,
          morningResponse: e.morningResponse,
          eveningResponse: e.eveningResponse,
        })),
        values.map((v) => v.name)
      );
    }

    // Get existing patterns from database
    const existingPatterns = await prisma.pattern.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      orderBy: { confidence: 'desc' },
    });

    return NextResponse.json({
      entriesAnalyzed: entries.length,
      hasEnoughData: entries.length >= 7,
      patternAnalysis,
      existingPatterns,
    });
  } catch (error) {
    console.error('Pattern analysis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle weekly summary request
async function handleWeeklySummary(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get last 7 days of entries
    const entries = await prisma.dailyEntry.findMany({
      where: {
        userId: user.id,
        date: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { date: 'desc' },
    });

    if (entries.length === 0) {
      return NextResponse.json({
        summary: 'No entries this week. Start logging to see your weekly summary.',
      });
    }

    // Calculate weekly stats
    const avgEnergy = entries.reduce((sum, e) => sum + (e.energyLevel || 0), 0) / entries.length;
    const avgAlignment = entries.reduce((sum, e) => sum + (e.alignmentScore || 0), 0) / entries.length;

    // Find best and worst days
    const bestDay = entries.reduce(
      (best, e) => (!best || (e.alignmentScore || 0) > (best.alignmentScore || 0) ? e : best),
      entries[0]
    );
    const worstDay = entries.reduce(
      (worst, e) => (!worst || (e.alignmentScore || 0) < (worst.alignmentScore || 0) ? e : worst),
      entries[0]
    );

    return NextResponse.json({
      week: {
        totalEntries: entries.length,
        averageEnergy: Math.round(avgEnergy * 10) / 10,
        averageAlignment: Math.round(avgAlignment * 10) / 10,
      },
      highlights: {
        bestDay: bestDay?.date.toISOString().split('T')[0],
        worstDay: worstDay?.date.toISOString().split('T')[0],
      },
      trend: avgAlignment >= 5 ? 'positive' : 'needsattention',
    });
  } catch (error) {
    console.error('Weekly summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/patterns - Save detected patterns
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { patterns } = await request.json();

    // Save new patterns
    const savedPatterns: Awaited<ReturnType<typeof prisma.pattern.create>>[] = [];
    for (const pattern of patterns) {
      const saved = await prisma.pattern.create({
        data: {
          userId: user.id,
          type: pattern.type,
          title: pattern.title,
          description: pattern.description,
          evidence: pattern.evidence || [],
          recommendedAction: pattern.recommendedAction,
          confidence: pattern.confidence,
        },
      });
      savedPatterns.push(saved);
    }

    return NextResponse.json({ patterns: savedPatterns });
  } catch (error) {
    console.error('Save patterns error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return handlePagesApiRequest(req, res, { GET, POST });
}
