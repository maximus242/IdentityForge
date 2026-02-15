import { NextApiRequest, NextApiResponse } from 'next';
import { handlePagesApiRequest } from '@/lib/api';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@identityforge/database';
import { z } from 'zod';
import { parse } from 'json2csv';
import { BeliefType, BeliefCategory } from '@identityforge/types';

const exportSchema = z.object({
  format: z.enum(['json', 'csv']),
  includeInactive: z.string().optional().transform(val => val === 'true')
});

export async function GET(req: NextApiRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return { status: 401, body: { error: 'Unauthorized' } };
    }

    const query = exportSchema.safeParse(req.query);
    if (!query.success) {
      return { 
        status: 400, 
        body: { error: 'Invalid format specified. Use format=json or format=csv' } 
      };
    }

    const beliefs = await prisma.belief.findMany({
      where: {
        userId: user.id,
        ...(query.data.includeInactive ? {} : { isActive: true })
      },
      select: {
        id: true,
        type: true,
        statement: true,
        category: true,
        origin: true,
        evidence: true,
        counterEvidence: true,
        challenge: true,
        reframe: true,
        strength: true,
        priority: true,
        isEmpowering: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [
        { type: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    if (beliefs.length === 0) {
      return {
        status: 404,
        body: { error: 'No beliefs found' }
      };
    }

    const formattedBeliefs = beliefs.map(belief => ({
      ...belief,
      type: BeliefType[belief.type],
      category: belief.category ? BeliefCategory[belief.category] : null,
      createdAt: belief.createdAt.toISOString(),
      updatedAt: belief.updatedAt.toISOString()
    }));

    if (query.data.format === 'json') {
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="beliefs-${new Date().toISOString().split('T')[0]}.json"`
        },
        body: formattedBeliefs
      };
    }

    // CSV format
    const csv = parse(formattedBeliefs, {
      fields: [
        'id',
        'type',
        'statement',
        'category',
        'origin',
        'evidence',
        'counterEvidence',
        'challenge',
        'reframe',
        'strength',
        'priority',
        'isEmpowering',
        'isActive',
        'createdAt',
        'updatedAt'
      ]
    });

    return {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="beliefs-${new Date().toISOString().split('T')[0]}.csv"`
      },
      body: csv
    };
  } catch (error) {
    console.error('Error exporting beliefs:', error);
    return {
      status: 500,
      body: { error: 'Failed to export beliefs' }
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return handlePagesApiRequest(req, res, { GET });
}