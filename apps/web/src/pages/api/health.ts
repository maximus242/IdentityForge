import { NextResponse } from 'next/server';
import { handlePagesApiRequest } from '@identityforge/utils';

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}

export default async function handler(req: Request, res: Response) {
  return handlePagesApiRequest(req, res, { GET });
}