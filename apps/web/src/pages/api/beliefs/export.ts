import { NextApiRequest, NextApiResponse } from 'next';
import { handlePagesApiRequest } from '@/lib/api';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@identityforge/database';
import { z } from 'zod';
import { parse } from 'json2csv';

const exportSchema = z.object({
  format: z.enum(['json', 'csv'])
});

export async function GET(req: NextApiRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return { status: 401, body: { error: 'Unauthorized' } };
  }

  const query = exportSchema.safeParse(req.query);
  if (!query.success) {
    return { status: 400, body: { error: 'Invalid format specified' } };
  }

  const beliefs = await prisma.belief.findMany({
    where: {
      userId: user.id,
      isActive: true
    },
    select: {
      id: true,
      type: true,
      statement: true,
      category: true,
      strength: true,
      createdAt: true,
      updatedAt: true,
      isActive: true
    }
  });

  if (query.data.format === 'json') {
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="beliefs.json"'
      },
      body: beliefs
    };
  }

  // CSV format
  const csv = parse(beliefs, {
    fields: ['id', 'type', 'statement', 'category', 'strength', 'createdAt', 'updatedAt', 'isActive']
  });

  return {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="beliefs.csv"'
    },
    body: csv
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return handlePagesApiRequest(req, res, { GET });
}