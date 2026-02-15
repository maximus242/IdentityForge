import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@auth0/nextjs-auth0';
import { prisma } from '@identityforge/database';
import { handlePagesApiRequest } from '@identityforge/utils';

export async function GET(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const format = req.query.format?.toString() || 'json';

  try {
    const beliefs = await prisma.belief.findMany({
      where: {
        userId: session.user.sub,
        isActive: true,
      },
    });

    if (format === 'csv') {
      const csv = convertBeliefsToCSV(beliefs);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="beliefs.csv"');
      return res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="beliefs.json"');
      return res.json(beliefs);
    }
  } catch (error) {
    console.error('Export failed:', error);
    return res.status(500).json({ error: 'Failed to export beliefs' });
  }
}

function convertBeliefsToCSV(beliefs: any[]): string {
  const headers = Object.keys(beliefs[0] || {}).join(',');
  const rows = beliefs.map(belief => 
    Object.values(belief).map(value => 
      typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
    ).join(',')
  );
  return [headers, ...rows].join('\n');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return handlePagesApiRequest(req, res, { GET });
}
