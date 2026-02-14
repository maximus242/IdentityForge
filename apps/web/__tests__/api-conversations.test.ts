/** @jest-environment node */

jest.mock('@identityforge/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    conversation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    conversationMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    value: {
      findMany: jest.fn(),
    },
  },
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    conversation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    conversationMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    value: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@identityforge/ai', () => ({
  __esModule: true,
  sendMessage: jest.fn(),
}));

const mockPrisma = jest.requireMock('@identityforge/database').default as {
  user: { findUnique: jest.Mock };
  conversation: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  conversationMessage: { findMany: jest.Mock; create: jest.Mock };
  value: { findMany: jest.Mock };
};

const { sendMessage: mockSendMessage } = jest.requireMock('@identityforge/ai') as {
  sendMessage: jest.Mock;
};

const { GET, POST } = require('../src/pages/api/conversations');

function makeRequest(url: string, init?: RequestInit): Request {
  return new Request(url, init);
}

describe('/api/conversations route handlers', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('POST /api/conversations', () => {
    it('returns 401 without auth header', async () => {
      const req = makeRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'VALUES_DISCOVERY' }),
      });

      const res = await POST(req as any);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({ error: 'Unauthorized' });
    });

    it('creates conversation and saves initial AI message', async () => {
      const user = { id: 'user-1', email: 'user@example.com' };
      const conversation = { id: 'conversation-1', userId: 'user-1', type: 'VALUES_DISCOVERY', messages: [] };
      const aiMessage = { id: 'm-ai', conversationId: 'conversation-1', role: 'ASSISTANT', content: 'Question?' };

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.conversation.create.mockResolvedValue(conversation);
      mockSendMessage.mockResolvedValue({ message: 'Question?' });
      mockPrisma.conversationMessage.create.mockResolvedValue(aiMessage);

      const req = makeRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user-1',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'VALUES_DISCOVERY', title: 'Values Session' }),
      });

      const res = await POST(req as any);
      const body = await res.json();

      expect(mockPrisma.conversation.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'VALUES_DISCOVERY',
          title: 'Values Session',
        },
        include: { messages: true },
      });
      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          userId: 'user-1',
          conversationId: 'conversation-1',
          conversationType: 'VALUES_DISCOVERY',
          previousMessages: [],
        },
        'Ask exactly one focused opening question. Return only that question with no explanation.'
      );
      expect(body).toEqual({
        conversation: {
          ...conversation,
          messages: [aiMessage],
        },
      });
      expect(res.status).toBe(200);
    });

    it('returns 500 when initial AI message generation fails', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
      mockPrisma.conversation.create.mockResolvedValue({
        id: 'conversation-1',
        userId: 'user-1',
        type: 'VALUES_DISCOVERY',
        messages: [],
      });
      mockSendMessage.mockRejectedValue(new Error('OpenRouter down'));

      const req = makeRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user-1',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'VALUES_DISCOVERY' }),
      });

      const res = await POST(req as any);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).toEqual({ error: 'Internal server error' });
    });
  });

  describe('GET /api/conversations', () => {
    it('returns conversations list', async () => {
      const user = { id: 'user-1', email: 'user@example.com' };
      const conversations = [
        { id: 'conversation-1', userId: 'user-1', messages: [{ id: 'm1', content: 'latest' }] },
      ];

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.conversation.findMany.mockResolvedValue(conversations);

      const req = makeRequest('http://localhost:3000/api/conversations', {
        method: 'GET',
        headers: { Authorization: 'Bearer user-1' },
      });

      const res = await GET(req as any);
      const body = await res.json();

      expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { lastMessageAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
      expect(res.status).toBe(200);
      expect(body).toEqual({ conversations });
    });

    it('sends message when conversationId and content query params are provided', async () => {
      const user = { id: 'user-1', email: 'user@example.com' };
      const conversation = { id: 'conversation-1', userId: 'user-1', type: 'COACHING' };
      const userMessage = { id: 'm-user', role: 'USER', content: 'hello' };
      const aiMessage = { id: 'm-ai', role: 'ASSISTANT', content: 'hi' };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce({ currentIdentityStatement: 'I am focused.' });
      mockPrisma.conversation.findFirst.mockResolvedValue(conversation);
      mockPrisma.conversationMessage.create
        .mockResolvedValueOnce(userMessage)
        .mockResolvedValueOnce(aiMessage);
      mockPrisma.conversationMessage.findMany.mockResolvedValue([]);
      mockPrisma.value.findMany.mockResolvedValue([{ name: 'growth' }]);
      mockPrisma.conversation.update.mockResolvedValue({ id: 'conversation-1' });
      mockSendMessage.mockResolvedValue({ message: 'hi' });

      const req = makeRequest(
        'http://localhost:3000/api/conversations?conversationId=conversation-1&content=hello',
        {
          method: 'GET',
          headers: { Authorization: 'Bearer user-1' },
        }
      );

      const res = await GET(req as any);
      const body = await res.json();

      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          userId: 'user-1',
          conversationId: 'conversation-1',
          conversationType: 'COACHING',
          previousMessages: [],
          userValues: ['growth'],
          userIdentity: 'I am focused.',
        },
        'hello'
      );
      expect(res.status).toBe(200);
      expect(body).toEqual({
        messages: [userMessage, aiMessage],
      });
    });

    it('returns 404 when sending message to missing conversation', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
      mockPrisma.conversation.findFirst.mockResolvedValue(null);

      const req = makeRequest(
        'http://localhost:3000/api/conversations?conversationId=missing&content=hello',
        {
          method: 'GET',
          headers: { Authorization: 'Bearer user-1' },
        }
      );

      const res = await GET(req as any);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({ error: 'Conversation not found' });
    });
  });
});
