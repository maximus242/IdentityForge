import { NextApiRequest, NextApiResponse } from 'next';
import { handlePagesApiRequest } from '@identityforge/utils';
import { getSession } from '@supabase/auth-helpers-nextjs';
import { prisma } from '@identityforge/database';
import { z } from 'zod';

const ExportFormatSchema = z.enum(['json', 'csv']);

export async function GET(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { format = 'json' } = req.query;
  const validation = ExportFormatSchema.safeParse(format);
  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid format parameter' });
  }

  try {
    const beliefs = await prisma.belief.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (validation.data === 'csv') {
      const headers = ['id', 'content', 'type', 'isFavorited', 'createdAt', 'updatedAt'];
      const csvRows = [
        headers.join(','),
        ...beliefs.map(belief =>
          [
            belief.id,
            `"${belief.content.replace(/"/g, '""')}"`,
            belief.type,
            belief.isFavorited,
            belief.createdAt.toISOString(),
            belief.updatedAt.toISOString(),
          ].join(',')
        ),
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="beliefs.csv"');
      return res.status(200).send(csvRows.join('\n'));
    }

    return res.status(200).json(beliefs);
  } catch (error) {
    console.error('Export failed:', error);
    return res.status(500).json({ error: 'Failed to export beliefs' });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return handlePagesApiRequest(req, res, { GET });
}
