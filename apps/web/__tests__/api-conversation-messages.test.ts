/** @jest-environment node */

import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@identityforge/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    conversation: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    conversationMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    value: {
      findMany: jest.fn(),
    },
    dailyEntry: {
      findMany: jest.fn(),
    },
    conversationInsight: {
      create: jest.fn(),
    },
  },
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    conversation: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    conversationMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    value: {
      findMany: jest.fn(),
    },
    dailyEntry: {
      findMany: jest.fn(),
    },
    conversationInsight: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@identityforge/ai', () => ({
  __esModule: true,
  sendMessage: jest.fn(),
}));

const mockPrisma = jest.requireMock('@identityforge/database').default as {
  user: { findUnique: jest.Mock };
  conversation: { findFirst: jest.Mock; update: jest.Mock };
  conversationMessage: { findMany: jest.Mock; create: jest.Mock };
  value: { findMany: jest.Mock };
  dailyEntry: { findMany: jest.Mock };
  conversationInsight: { create: jest.Mock };
};

const { sendMessage: mockSendMessage } = jest.requireMock('@identityforge/ai') as {
  sendMessage: jest.Mock;
};

const { default: handler } = require('../src/pages/api/conversations/[id]/messages');

type MockResponse = NextApiResponse & {
  body?: unknown;
  headers: Record<string, string>;
};

function createRequest(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return {
    method: 'POST',
    headers: {},
    query: { id: 'conversation-1' },
    body: { content: 'Hello AI' },
    ...overrides,
  } as NextApiRequest;
}

function createResponse(): MockResponse {
  const res = {
    statusCode: 200,
    headers: {},
    setHeader: jest.fn((key: string, value: string) => {
      res.headers[key] = value;
    }),
    status: jest.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn((payload: unknown) => {
      res.body = payload;
      return res;
    }),
    send: jest.fn((payload: unknown) => {
      res.body = payload;
      return res;
    }),
  } as unknown as MockResponse;

  return res;
}

describe('/api/conversations/[id]/messages', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('returns 405 for unsupported methods', async () => {
    const req = createRequest({ method: 'GET' });
    const res = createResponse();

    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.body).toEqual({ error: 'Method GET Not Allowed' });
  });

  it('returns 401 when bearer token is missing', async () => {
    const req = createRequest({ headers: {} });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = createRequest({
      headers: { authorization: 'Bearer missing-user' },
    });
    const res = createResponse();

    await handler(req, res);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'missing-user' } });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 when conversation id is missing', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });

    const req = createRequest({
      headers: { authorization: 'Bearer user-1' },
      query: {},
    });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ error: 'Conversation ID is required' });
  });

  it('returns 400 when message content is missing', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });

    const req = createRequest({
      headers: { authorization: 'Bearer user-1' },
      body: { content: '   ' },
    });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ error: 'Message content is required' });
  });

  it('returns 404 when conversation is not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
    mockPrisma.conversation.findFirst.mockResolvedValue(null);

    const req = createRequest({
      headers: { authorization: 'Bearer user-1' },
      query: { id: 'missing-conversation' },
    });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ error: 'Conversation not found' });
  });

  it('sends a message and returns updated messages on success', async () => {
    const now = new Date('2026-02-13T12:00:00.000Z');
    const user = { id: 'user-1', email: 'user@example.com' };
    const conversation = { id: 'conversation-1', userId: 'user-1', type: 'VALUES_DISCOVERY' };

    mockPrisma.user.findUnique
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce({ currentIdentityStatement: 'I act with intention.' });
    mockPrisma.conversation.findFirst.mockResolvedValue(conversation);
    mockPrisma.conversationMessage.findMany
      .mockResolvedValueOnce([
        {
          id: 'm-prev',
          conversationId: 'conversation-1',
          role: 'ASSISTANT',
          content: 'What feels most important to you today?',
          createdAt: now,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'm-user',
          role: 'USER',
          content: 'I value growth',
          createdAt: now,
        },
        {
          id: 'm-ai',
          role: 'ASSISTANT',
          content: 'How does growth show up in your choices?',
          createdAt: now,
        },
      ]);
    mockPrisma.value.findMany.mockResolvedValue([{ name: 'growth' }, { name: 'integrity' }]);
    mockPrisma.dailyEntry.findMany.mockResolvedValue([
      { date: now, energyLevel: 7, alignmentScore: 8 },
    ]);
    mockPrisma.conversationMessage.create
      .mockResolvedValueOnce({ id: 'm-user' })
      .mockResolvedValueOnce({ id: 'm-ai' });
    mockPrisma.conversation.update.mockResolvedValue({ id: 'conversation-1' });
    mockPrisma.conversationInsight.create.mockResolvedValue({ id: 'insight-1' });
    mockSendMessage.mockResolvedValue({
      message: 'How does growth show up in your choices?',
      insights: ['You connect growth with consistency.'],
    });

    const req = createRequest({
      headers: { authorization: 'Bearer user-1' },
      query: { id: 'conversation-1' },
      body: { content: 'I value growth' },
    });
    const res = createResponse();

    await handler(req, res);

    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        conversationId: 'conversation-1',
        conversationType: 'VALUES_DISCOVERY',
        userValues: ['growth', 'integrity'],
        userIdentity: 'I act with intention.',
      }),
      'I value growth'
    );
    expect(mockPrisma.conversationMessage.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
      where: { id: 'conversation-1' },
      data: { lastMessageAt: expect.any(Date) },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({
      message: 'How does growth show up in your choices?',
      messages: expect.any(Array),
    });
  });

  it('continues when optional context queries fail', async () => {
    const user = { id: 'user-1', email: 'user@example.com' };
    const conversation = { id: 'conversation-1', userId: 'user-1', type: 'COACHING' };

    mockPrisma.user.findUnique
      .mockResolvedValueOnce(user)
      .mockRejectedValueOnce(new Error('profile query failed'));
    mockPrisma.conversation.findFirst.mockResolvedValue(conversation);
    mockPrisma.conversationMessage.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'm-user', role: 'USER', content: 'test', createdAt: new Date() },
        { id: 'm-ai', role: 'ASSISTANT', content: 'reply', createdAt: new Date() },
      ]);
    mockPrisma.value.findMany.mockRejectedValue(new Error('value table missing'));
    mockPrisma.dailyEntry.findMany.mockRejectedValue(new Error('daily entries table missing'));
    mockPrisma.conversationMessage.create
      .mockResolvedValueOnce({ id: 'm-user' })
      .mockResolvedValueOnce({ id: 'm-ai' });
    mockPrisma.conversation.update.mockResolvedValue({ id: 'conversation-1' });
    mockPrisma.conversationInsight.create.mockRejectedValue(new Error('insight insert failed'));
    mockSendMessage.mockResolvedValue({
      message: 'reply',
      insights: ['insight'],
    });

    const req = createRequest({
      headers: { authorization: 'Bearer user-1' },
      query: { id: 'conversation-1' },
      body: { content: 'test' },
    });
    const res = createResponse();

    await handler(req, res);

    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        userValues: [],
        userIdentity: undefined,
        recentEntries: [],
      }),
      'test'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({
      message: 'reply',
      messages: expect.any(Array),
    });
  });

  it('returns 500 when AI send fails', async () => {
    const user = { id: 'user-1', email: 'user@example.com' };
    const conversation = { id: 'conversation-1', userId: 'user-1', type: 'COACHING' };

    mockPrisma.user.findUnique
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce({ currentIdentityStatement: null });
    mockPrisma.conversation.findFirst.mockResolvedValue(conversation);
    mockPrisma.conversationMessage.findMany.mockResolvedValueOnce([]);
    mockPrisma.value.findMany.mockResolvedValue([]);
    mockPrisma.dailyEntry.findMany.mockResolvedValue([]);
    mockPrisma.conversationMessage.create.mockResolvedValueOnce({ id: 'm-user' });
    mockSendMessage.mockRejectedValue(new Error('OpenRouter failure'));

    const req = createRequest({
      headers: { authorization: 'Bearer user-1' },
      query: { id: 'conversation-1' },
      body: { content: 'test' },
    });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});
