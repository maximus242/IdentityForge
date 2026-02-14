// Daily Entries API routes
import type { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@identityforge/database';
import { handlePagesApiRequest } from '../../../lib/pages-api-adapter';

// Helper to get user from token
async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const userId = authHeader.replace('Bearer ', '');
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

// GET /api/entries - Get daily entries
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30');
    const offset = parseInt(searchParams.get('offset') || '0');

    const entries = await prisma.dailyEntry.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
      include: {
        values: {
          include: { value: true },
        },
      },
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Get entries error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/entries - Create a daily entry
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, energyLevel, moodNote, alignmentScore, morningResponse, eveningResponse, valueIds } = await request.json();

    // Get date only (no time)
    const entryDate = new Date(date);
    entryDate.setHours(0, 0, 0, 0);

    // Check if entry exists for this date
    const existingEntry = await prisma.dailyEntry.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: entryDate,
        },
      },
    });

    if (existingEntry) {
      // Update existing entry
      const entry = await prisma.dailyEntry.update({
        where: { id: existingEntry.id },
        data: {
          energyLevel,
          moodNote,
          alignmentScore,
          morningResponse,
          eveningResponse,
        },
        include: {
          values: {
            include: { value: true },
          },
        },
      });

      // Update values if provided
      if (valueIds) {
        await prisma.dailyEntryValue.deleteMany({
          where: { dailyEntryId: existingEntry.id },
        });

        for (const valueId of valueIds) {
          await prisma.dailyEntryValue.create({
            data: {
              dailyEntryId: existingEntry.id,
              valueId,
            },
          });
        }
      }

      return NextResponse.json({ entry });
    }

    // Create new entry
    const entry = await prisma.dailyEntry.create({
      data: {
        userId: user.id,
        date: entryDate,
        energyLevel,
        moodNote,
        alignmentScore,
        morningResponse,
        eveningResponse,
      },
      include: {
        values: {
          include: { value: true },
        },
      },
    });

    // Add values if provided
    if (valueIds && valueIds.length > 0) {
      for (const valueId of valueIds) {
        await prisma.dailyEntryValue.create({
          data: {
            dailyEntryId: entry.id,
            valueId,
          },
        });
      }
    }

    // Fetch updated entry with values
    const updatedEntry = await prisma.dailyEntry.findUnique({
      where: { id: entry.id },
      include: {
        values: {
          include: { value: true },
        },
      },
    });

    return NextResponse.json({ entry: updatedEntry });
  } catch (error) {
    console.error('Create entry error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/entries - Update a daily entry
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, energyLevel, moodNote, alignmentScore, morningResponse, eveningResponse, aiReflection, valueIds } = await request.json();

    // Verify the entry belongs to the user
    const existingEntry = await prisma.dailyEntry.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Update the entry
    const entry = await prisma.dailyEntry.update({
      where: { id },
      data: {
        energyLevel,
        moodNote,
        alignmentScore,
        morningResponse,
        eveningResponse,
        aiReflection,
      },
      include: {
        values: {
          include: { value: true },
        },
      },
    });

    // Update value associations if provided
    if (valueIds && Array.isArray(valueIds)) {
      // Remove existing associations
      await prisma.dailyEntryValue.deleteMany({
        where: { dailyEntryId: id },
      });

      // Add new associations
      if (valueIds.length > 0) {
        await prisma.dailyEntryValue.createMany({
          data: valueIds.map((valueId: string) => ({
            dailyEntryId: id,
            valueId,
          })),
        });
      }

      // Refresh entry with values
      const updatedEntry = await prisma.dailyEntry.findUnique({
        where: { id },
        include: {
          values: {
            include: { value: true },
          },
        },
      });

      return NextResponse.json({ entry: updatedEntry });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Update entry error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return handlePagesApiRequest(req, res, { GET, POST, PUT });
}
