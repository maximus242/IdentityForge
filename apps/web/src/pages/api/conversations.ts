// Conversations API - Simple version
import type { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@identityforge/database';
import { sendMessage } from '@identityforge/ai';
import { handlePagesApiRequest } from '../../lib/pages-api-adapter';

async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const userId = authHeader.replace('Bearer ', '');
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

// GET /api/conversations - Get conversations OR send message if conversationId provided
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const content = searchParams.get('content');

    // If conversationId and content provided, send a message
    if (conversationId && content) {
      // Verify conversation belongs to user
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
      const userValues = await prisma.value.findMany({
        where: { userId: user.id },
        select: { name: true },
      });

      // Get user identity
      const userProfile = await prisma.user.findUnique({
        where: { id: user.id },
        select: { currentIdentityStatement: true },
      });

      // Get AI response
      const aiResponse = await sendMessage(
        {
          userId: user.id,
          conversationId,
          conversationType: conversation.type as any,
          previousMessages,
          userValues: userValues.map(v => v.name),
          userIdentity: userProfile?.currentIdentityStatement || undefined,
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
    }

    // Otherwise, return list of conversations
    const conversations = await prisma.conversation.findMany({
      where: { userId: user.id },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/conversations - Create new conversation
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, title } = await request.json();

    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        type: type || 'VALUES_DISCOVERY',
        title: title || 'New Conversation',
      },
      include: {
        messages: true,
      },
    });

    // Get AI's initial message (no canned fallback)
    const aiResponse = await sendMessage(
      {
        userId: user.id,
        conversationId: conversation.id,
        conversationType: type || 'VALUES_DISCOVERY',
        previousMessages: [],
      },
      'Ask exactly one focused opening question. Return only that question with no explanation.'
    );

    // Save AI message
    const aiMessage = await prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: aiResponse.message,
      },
    });

    conversation.messages = [aiMessage];

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return handlePagesApiRequest(req, res, { GET, POST });
}
