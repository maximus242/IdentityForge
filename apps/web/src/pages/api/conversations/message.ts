// Messages API - Send message to conversation
import type { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@identityforge/database';
import { sendMessage } from '@identityforge/ai';
import { handlePagesApiRequest } from '../../../lib/pages-api-adapter';

async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const userId = authHeader.replace('Bearer ', '');
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

// POST /api/conversations/message
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, content } = await request.json();

    // Get conversation
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: user.id },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Save user message
    const userMessage = await prisma.conversationMessage.create({
      data: {
        conversationId,
        role: 'USER',
        content,
      },
    });

    // Get previous messages for context
    const previousMessages = await prisma.conversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    // Get user values for context
    const values = await prisma.value.findMany({
      where: { userId: user.id },
      take: 5,
    });

    // Get AI response
    const aiResponse = await sendMessage(
      {
        userId: user.id,
        conversationId,
        conversationType: conversation.type as any,
        previousMessages,
        userValues: values.map(v => v.name),
      },
      content
    );

    // Save AI message
    const aiMessage = await prisma.conversationMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: aiResponse.message,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({
      messages: [userMessage, aiMessage],
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return handlePagesApiRequest(req, res, { POST });
}
