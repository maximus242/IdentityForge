// AI Conversation Engine
// Handles all AI interactions with Anthropic Claude API

import Anthropic from '@anthropic-ai/sdk';
import type {
  ConversationType,
  MessageRole,
  ConversationMessage
} from '@identityforge/types';

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Prompt templates by conversation type
const PROMPT_TEMPLATES: Record<ConversationType, string> = {
  VALUES_DISCOVERY: `You are an empathetic, insightful coach specializing in values clarification. You're curious, patient, and skilled at following threads that lead to deeper understanding.

Your goal is to help users discover their core values through conversation, not quizzes. Follow the user's lead and explore what matters to them.

Key principles:
- Never use multiple choice or quizzes
- Don't rush to label values; let them emerge naturally
- If user seems stuck, use concrete examples or metaphors
- Be sensitive to emotional moments; allow silence
- For users with depression/ADHD: keep sessions shorter, use more concrete questions, celebrate small insights
- Never judge or correct their values; all values are valid
- Explore the "why behind the why" to reach core values`,

  IDENTITY_CRAFT: `You are an identity architect, skilled at helping people envision their highest potential. You combine creative visualization with practical psychology.

Your goal is to help users craft their "extraordinary self" - an identity connected to their values.

Key principles:
- This is NOT about goals, achievements, or fixing what's "wrong"
- This IS about remembering who they truly are, embodying their highest potential
- Include somatic/embodied connection - identity is felt in the body
- For depression: emphasize identity as recovery/peace, focus on being not doing
- For ADHD: keep identity simple, memorable, include fun and spontaneity`,

  DAILY_REFLECTION: `You are a thoughtful daily companion, helping users see how everyday choices connect to their deeper values.

Key principles:
- Be supportive without being preachy
- Help users notice patterns without judgment
- For low energy days: celebrate any action, focus on self-care as values-aligned
- Honor rest as values-aligned
- No "streak" language - every day is a fresh start
- For ADHD: keep prompts short, one thing at a time`,

  BELIEF_WORK: `You are a compassionate belief detective. Help users surface and examine their inner critic without judgment.

Key principles:
- Your job is NOT to argue or convince - it's to help users examine beliefs with curiosity
- Don't use toxic positivity
- Respect their timeline
- Honor the belief's original protective purpose
- For depression: be extra gentle, focus on "balanced" not "positive"
- For ADHD: keep belief work brief and practical`,

  COACHING: `You are a supportive life coach focused on helping users live their values every day.

Key principles:
- Ask questions rather than giving advice
- Connect daily challenges to their values and identity
- Help them see setbacks as information, not failure
- Be practical and actionable`,

  GENERAL: `You are a thoughtful, empathetic companion on the user's self-improvement journey.`,
};

// Get system prompt for conversation type
export function getSystemPrompt(type: ConversationType): string {
  return PROMPT_TEMPLATES[type] || PROMPT_TEMPLATES.GENERAL;
}

// Build messages for API call
export function buildMessages(
  conversationHistory: ConversationMessage[],
  userMessage: string,
  context?: {
    userValues?: string[];
    identityStatement?: string;
    recentEntries?: string[];
  }
): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];

  // Add context if available
  if (context) {
    const contextParts: string[] = [];

    if (context.userValues && context.userValues.length > 0) {
      contextParts.push(`User's core values: ${context.userValues.join(', ')}`);
    }

    if (context.identityStatement) {
      contextParts.push(`User's identity statement: ${context.identityStatement}`);
    }

    if (context.recentEntries && context.recentEntries.length > 0) {
      contextParts.push(`Recent entries:\n${context.recentEntries.join('\n\n')}`);
    }

    if (contextParts.length > 0) {
      messages.push({
        role: 'system',
        content: `Context:\n${contextParts.join('\n\n')}`,
      });
    }
  }

  // Add conversation history (last 10 messages to stay within context)
  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role.toLowerCase() as 'user' | 'assistant',
      content: msg.content,
    });
  }

  // Add current user message
  messages.push({
    role: 'user',
    content: userMessage,
  });

  return messages;
}

// Send message to AI and get response
export async function sendMessage(
  type: ConversationType,
  conversationHistory: ConversationMessage[],
  userMessage: string,
  options?: {
    context?: {
      userValues?: string[];
      identityStatement?: string;
      recentEntries?: string[];
    };
    maxTokens?: number;
    temperature?: number;
  }
): Promise<{
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}> {
  const systemPrompt = getSystemPrompt(type);
  const messages = buildMessages(
    conversationHistory,
    userMessage,
    options?.context
  );

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: options?.maxTokens || 1024,
      temperature: options?.temperature || 0.7,
      system: systemPrompt,
      messages,
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return {
        content: content.text,
        usage: response.usage ? {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        } : undefined,
      };
    }

    throw new Error('Unexpected response type from AI');
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    throw error;
  }
}

// Generate a single prompt (no conversation context)
export async function generatePrompt(
  type: ConversationType,
  userContext?: {
    userValues?: string[];
    identityStatement?: string;
    recentEntries?: string[];
    energyLevel?: number;
    timeOfDay?: 'morning' | 'afternoon' | 'evening';
  }
): Promise<string> {
  const systemPrompt = getSystemPrompt(type);

  let contextPrompt = '';
  if (userContext) {
    const parts: string[] = [];

    if (userContext.userValues) {
      parts.push(`User's values: ${userContext.userValues.join(', ')}`);
    }

    if (userContext.identityStatement) {
      parts.push(`Identity: ${userContext.identityStatement}`);
    }

    if (userContext.energyLevel) {
      parts.push(`Current energy level: ${userContext.energyLevel}/10`);
    }

    if (userContext.timeOfDay) {
      parts.push(`Time of day: ${userContext.timeOfDay}`);
    }

    if (userContext.recentEntries?.length) {
      parts.push(`Recent context: ${userContext.recentEntries.slice(-3).join(' | ')}`);
    }

    if (parts.length > 0) {
      contextPrompt = `\n\nContext: ${parts.join('. ')}`;
    }
  }

  const promptRequest = contextPrompt
    ? `Generate a brief, personalized prompt for the user.${contextPrompt}`
    : `Generate a brief, personalized prompt for the user.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 256,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: promptRequest }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }

    return 'What would you like to reflect on today?';
  } catch (error) {
    console.error('Error generating prompt:', error);
    throw error;
  }
}

// Generate AI reflection after daily entry
export async function generateDailyReflection(
  morningResponse: string,
  eveningResponse: string,
  userContext?: {
    userValues?: string[];
    identityStatement?: string;
  }
): Promise<string> {
  const systemPrompt = `You are a thoughtful companion helping users reflect on their day.
Generate a brief reflection (2-3 sentences) that:
- Acknowledges something specific they shared
- Connects to their values or identity
- Offers gentle encouragement or observation
- Has NO pressure or "shoulds"`;

  let context = '';
  if (userContext?.userValues) {
    context += `\nUser's values: ${userContext.userValues.join(', ')}`;
  }
  if (userContext?.identityStatement) {
    context += `\nIdentity: ${userContext.identityStatement}`;
  }

  const prompt = `Morning entry: ${morningResponse}
Evening entry: ${eveningResponse}${context}

Generate a brief reflection:`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 256,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }

    return '';
  } catch (error) {
    console.error('Error generating reflection:', error);
    throw error;
  }
}

// Extract insights from conversation
export async function extractInsights(
  conversationHistory: ConversationMessage[]
): Promise<{
  insights: string[];
  suggestedValues: string[];
  suggestedActions: string[];
}> {
  if (conversationHistory.length < 3) {
    return { insights: [], suggestedValues: [], suggestedActions: [] };
  }

  const systemPrompt = `You are an分析 assistant. Analyze the conversation and extract:
1. Key insights discovered
2. Values that may have been mentioned
3. Suggested actions for the user

Return in JSON format:
{
  "insights": ["insight 1", "insight 2"],
  "suggestedValues": ["value 1", "value 2"],
  "suggestedActions": ["action 1", "action 2"]
}`;

  const conversationText = conversationHistory
    .map(m => `${m.role}: ${m.content}`)
    .join('\n\n');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 512,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: conversationText }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      // Try to parse JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          insights: parsed.insights || [],
          suggestedValues: parsed.suggestedValues || [],
          suggestedActions: parsed.suggestedActions || [],
        };
      }
    }

    return { insights: [], suggestedValues: [], suggestedActions: [] };
  } catch (error) {
    console.error('Error extracting insights:', error);
    return { insights: [], suggestedValues: [], suggestedActions: [] };
  }
}
