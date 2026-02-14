import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@identityforge/database';
import { sendMessage } from '@identityforge/ai';
import type { ConversationType } from '@identityforge/types';

function getBearerToken(req: NextApiRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }
  const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token = raw.replace('Bearer ', '').trim();
  return token.length > 0 ? token : null;
}

function getConversationId(req: NextApiRequest): string | null {
  const { id } = req.query;
  if (Array.isArray(id)) {
    return id[0] || null;
  }
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function getMessageContent(req: NextApiRequest): string | null {
  if (!req.body) {
    return null;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const content = body?.content;
  return typeof content === 'string' && content.trim().length > 0 ? content.trim() : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: `Method ${req.method || 'UNKNOWN'} Not Allowed` });
    return;
  }

  try {
    const userId = getBearerToken(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const conversationId = getConversationId(req);
    if (!conversationId) {
      res.status(400).json({ error: 'Conversation ID is required' });
      return;
    }

    const content = getMessageContent(req);
    if (!content) {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: user.id,
      },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const previousMessages = await prisma.conversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    let values: Array<{ name: string }> = [];
    try {
      values = await prisma.value.findMany({
        where: { userId: user.id },
        orderBy: { priority: 'asc' },
        take: 5,
        select: { name: true },
      });
    } catch (error) {
      console.warn('Value context unavailable, continuing without values:', error);
    }

    let userIdentity: string | undefined;
    try {
      const userProfile = await prisma.user.findUnique({
        where: { id: user.id },
        select: { currentIdentityStatement: true },
      });
      userIdentity = userProfile?.currentIdentityStatement || undefined;
    } catch (error) {
      console.warn('Identity context unavailable, continuing without identity:', error);
    }

    let recentEntries: Array<{
      date: Date;
      energyLevel: number | null;
      alignmentScore: number | null;
    }> = [];
    try {
      recentEntries = await prisma.dailyEntry.findMany({
        where: { userId: user.id },
        orderBy: { date: 'desc' },
        take: 7,
        select: {
          date: true,
          energyLevel: true,
          alignmentScore: true,
        },
      });
    } catch (error) {
      console.warn('Daily entries context unavailable, continuing without entries:', error);
    }

    await prisma.conversationMessage.create({
      data: {
        conversationId,
        role: 'USER',
        content,
      },
    });

    const aiResponse = await sendMessage(
      {
        userId: user.id,
        conversationId,
        conversationType: conversation.type as ConversationType,
        previousMessages,
        userValues: values.map((v) => v.name),
        userIdentity,
        recentEntries,
      },
      content
    );

    await prisma.conversationMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: aiResponse.message,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    if (aiResponse.insights && aiResponse.insights.length > 0) {
      try {
        for (const insight of aiResponse.insights) {
          await prisma.conversationInsight.create({
            data: {
              conversationId,
              insight,
            },
          });
        }
      } catch (error) {
        console.warn('Conversation insight persistence failed, continuing:', error);
      }
    }

    const messages = await prisma.conversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json({ message: aiResponse.message, messages });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
