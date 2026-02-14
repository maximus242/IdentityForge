// AI Conversation Engine
// Core logic for handling conversations with OpenRouter (GLM-4)

import type {
  ConversationType,
  Conversation,
  ConversationMessage,
  AIResponse,
  CreateConversationInput,
} from '@identityforge/types';

// OpenRouter API base URL
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

// Prompt templates
import valuesDiscoveryPrompt from '../../../prompts/values_discovery.md?raw';
import identityCraftingPrompt from '../../../prompts/identity_crafting.md?raw';
import dailyReflectionPrompt from '../../../prompts/daily_reflection.md?raw';
import beliefWorkPrompt from '../../../prompts/belief_work.md?raw';
import somaticGuidePrompt from '../../../prompts/somatic_guide.md?raw';

// Map conversation types to prompts
const PROMPT_MAP: Record<ConversationType, string> = {
  VALUES_DISCOVERY: valuesDiscoveryPrompt,
  IDENTITY_CRAFT: identityCraftingPrompt,
  DAILY_REFLECTION: dailyReflectionPrompt,
  BELIEF_WORK: beliefWorkPrompt,
  COACHING: dailyReflectionPrompt, // Reuse daily reflection for coaching
  GENERAL: 'You are a supportive coach helping users with their personal growth journey.',
};

// ============================================
// CONVERSATION MANAGEMENT
// ============================================

export interface Belief {
  id: string;
  type: string;
  statement: string;
  category?: string;
  strength?: number;
}

export interface ConversationContext {
  userId: string;
  conversationId: string;
  conversationType: ConversationType;
  previousMessages: ConversationMessage[];
  beliefs?: Belief[]; // NEW: unified belief context
  userValues?: string[]; // DEPRECATED: kept for backwards compatibility
  userIdentity?: string; // DEPRECATED: kept for backwards compatibility
  recentEntries?: Array<{
    date: Date;
    energyLevel: number | null;
    alignmentScore: number | null;
  }>;
  personalityInsights?: string[];
}

/**
 * Build the system prompt for a conversation
 */
export function buildSystemPrompt(
  conversationType: ConversationType,
  context?: Partial<ConversationContext>
): string {
  const basePrompt = PROMPT_MAP[conversationType] || PROMPT_MAP.GENERAL;

  // Add user context if available
  let contextSection = '';

  if (context) {
    // Add belief context (NEW unified system)
    if (context.beliefs && context.beliefs.length > 0) {
      const valueBeliefs = context.beliefs.filter(b => b.type === 'VALUE');
      const identityBeliefs = context.beliefs.filter(b => b.type.startsWith('IDENTITY_'));
      const limitingBeliefs = context.beliefs.filter(b => b.type === 'LIMITING');
      const empoweringBeliefs = context.beliefs.filter(b => b.type === 'EMPOWERING');

      if (valueBeliefs.length > 0) {
        contextSection += `\n\n## User's Value Beliefs\n${valueBeliefs.map(b => `- ${b.statement}`).join('\n')}`;
      }

      if (identityBeliefs.length > 0) {
        contextSection += `\n\n## User's Identity Beliefs\n${identityBeliefs.map(b => `- ${b.statement}`).join('\n')}`;
      }

      if (empoweringBeliefs.length > 0) {
        contextSection += `\n\n## User's Empowering Beliefs\n${empoweringBeliefs.map(b => `- ${b.statement}`).join('\n')}`;
      }

      if (limitingBeliefs.length > 0) {
        contextSection += `\n\n## User's Limiting Beliefs (to explore)\n${limitingBeliefs.map(b => `- ${b.statement}`).join('\n')}`;
      }
    }
    // Fallback to legacy context (for backwards compatibility)
    else {
      if (context.userValues && context.userValues.length > 0) {
        contextSection += `\n\n## User's Values\n${context.userValues.join(', ')}`;
      }

      if (context.userIdentity) {
        contextSection += `\n\n## User's Identity Statement\n${context.userIdentity}`;
      }
    }

    if (context.recentEntries && context.recentEntries.length > 0) {
      const avgEnergy =
        context.recentEntries.reduce((sum, e) => sum + (e.energyLevel || 0), 0) /
        context.recentEntries.length;
      const avgAlignment =
        context.recentEntries.reduce((sum, e) => sum + (e.alignmentScore || 0), 0) /
        context.recentEntries.length;

      contextSection += `\n\n## Recent Energy & Alignment\nAverage energy: ${avgEnergy.toFixed(1)}/10\nAverage alignment: ${avgAlignment.toFixed(1)}/10`;
    }

    if (context.personalityInsights && context.personalityInsights.length > 0) {
      contextSection += `\n\n## Personality Insights\n${context.personalityInsights.join('\n')}`;
    }
  }

  return basePrompt + contextSection;
}

/**
 * Format messages for OpenRouter API
 */
export function formatMessagesForAPI(
  messages: ConversationMessage[]
): Array<{ role: string; content: string }> {
  const apiMessages: Array<{ role: string; content: string }> = [];

  // Add conversation history (skip system messages)
  for (const msg of messages) {
    if (msg.role !== 'SYSTEM') {
      apiMessages.push({
        role: msg.role === 'ASSISTANT' ? 'assistant' : 'user',
        content: msg.content,
      });
    }
  }

  return apiMessages;
}

/**
 * Send a message to OpenRouter and get response
 */
export async function sendMessage(
  context: ConversationContext,
  userMessage: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<AIResponse> {
  const { maxTokens = 4096, temperature = 0.7 } = options || {};

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  let systemPrompt = buildSystemPrompt(
    context.conversationType,
    context
  );

  // Add strict instructions to avoid generic responses
  systemPrompt += `\n\n## CRITICAL INSTRUCTIONS
- NEVER give generic or placeholder responses
- ALWAYS directly address what the user just said
- If the user gives a short or unclear answer, acknowledge it specifically and ask for more detail
- Do NOT use phrases like "That's a great question" unless they literally asked a question
- Be specific, personal, and responsive to their exact words
- No coaching platitudes or generic encouragement - respond to their actual content`;

  const messages = formatMessagesForAPI(
    context.previousMessages
  );

  // Add the new user message
  messages.push({
    role: 'user',
    content: userMessage,
  });

  try {
    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'IdentityForge',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet', // Use Claude instead of DeepSeek
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error response:', errorText);
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const messageText = data.choices?.[0]?.message?.content?.trim();
    if (!messageText) {
      throw new Error('OpenRouter returned an empty response');
    }

    // Parse any structured data from the response
    const parsed = parseAIResponse(messageText);

    return {
      message: messageText,
      insights: parsed.insights,
      suggestedValues: parsed.suggestedValues,
      suggestedActions: parsed.suggestedActions,
    };
  } catch (error) {
    console.error('Error calling OpenRouter API:', error);
    // Re-throw with more detailed error information
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to get AI response');
  }
}

/**
 * Start a new conversation
 */
export function createConversationInit(
  input: CreateConversationInput,
  userId: string
): { conversation: Partial<Conversation>; firstMessage: string } {
  const conversation: Partial<Conversation> = {
    id: '', // Will be set by database
    userId,
    type: input.type,
    title: input.title || generateTitle(input.type),
    isActive: true,
    startedAt: new Date(),
    lastMessageAt: new Date(),
    model: 'anthropic/claude-3.5-sonnet',
    messages: [],
    insights: [],
  };

  // Initial message must be generated by the LLM via sendMessage.
  return { conversation, firstMessage: '' };
}

// ============================================
// PROMPT GENERATION
// ============================================

/**
 * Generate first message based on conversation type
 */
/**
 * Generate title based on conversation type
 */
function generateTitle(type: ConversationType): string {
  const date = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  switch (type) {
    case 'VALUES_DISCOVERY':
      return `Values Discovery - ${date}`;
    case 'IDENTITY_CRAFT':
      return `Identity Crafting - ${date}`;
    case 'DAILY_REFLECTION':
      return `Daily Reflection - ${date}`;
    case 'BELIEF_WORK':
      return `Belief Work - ${date}`;
    case 'COACHING':
      return `Coaching Session - ${date}`;
    default:
      return `Conversation - ${date}`;
  }
}

// ============================================
// RESPONSE PARSING
// ============================================

interface ParsedResponse {
  insights?: string[];
  suggestedValues?: string[];
  suggestedActions?: string[];
}

/**
 * Parse structured data from AI response
 * Looks for markdown-formatted sections
 */
function parseAIResponse(response: string): ParsedResponse {
  const result: ParsedResponse = {};

  // Extract insights (looking for ### INSIGHTS or similar)
  const insightsMatch = response.match(/###\s*INSIGHTS\s*([\s\S]*?)(?=###|$)/i);
  if (insightsMatch) {
    result.insights = insightsMatch[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^-\s*/, '').trim());
  }

  // Extract suggested values
  const valuesMatch = response.match(/###\s*(?:SUGGESTED\s*)?VALUES\s*([\s\S]*?)(?=###|$)/i);
  if (valuesMatch) {
    result.suggestedValues = valuesMatch[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^-\s*/, '').trim());
  }

  // Extract suggested actions
  const actionsMatch = response.match(/###\s*(?:SUGGESTED\s*)?ACTIONS\s*([\s\S]*?)(?=###|$)/i);
  if (actionsMatch) {
    result.suggestedActions = actionsMatch[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^-\s*/, '').trim());
  }

  return result;
}

// ============================================
// DAILY PROMPT GENERATION
// ============================================

export interface DailyPromptOptions {
  isMorning: boolean;
  userValues?: string[];
  userIdentity?: string;
  previousEnergy?: number;
  previousAlignment?: number;
}

/**
 * Generate a daily reflection prompt
 */
export async function generateDailyPrompt(
  options: DailyPromptOptions
): Promise<string> {
  const { isMorning, userValues, userIdentity, previousEnergy, previousAlignment } = options;

  let contextInfo = '';

  if (isMorning) {
    if (previousEnergy) {
      contextInfo += `\n\nYesterday's energy level: ${previousEnergy}/10`;
    }
    if (previousAlignment) {
      contextInfo += `\nYesterday's alignment: ${previousAlignment}/10`;
    }
    if (userValues && userValues.length > 0) {
      contextInfo += `\nYour top values: ${userValues.slice(0, 3).join(', ')}`;
    }
    if (userIdentity) {
      contextInfo += `\nYour identity: ${userIdentity}`;
    }

    const prompt = `Generate a brief (1-2 sentences) morning prompt for daily reflection.

Context:${contextInfo}

The prompt should:
- Be simple and actionable
- Reference their values or identity if available
- Be appropriate for their energy level if known
- Be welcoming and non-judgmental

Just return the prompt, nothing else.`;

    return callOpenRouter(prompt);
  } else {
    // Evening prompt
    if (userValues && userValues.length > 0) {
      contextInfo += `\nYour values: ${userValues.join(', ')}`;
    }

    const prompt = `Generate a brief (1-2 sentences) evening prompt for daily reflection.

Context:${contextInfo}

The prompt should:
- Help them reflect on how the day went
- Connect to their values
- Be supportive and non-judgmental
- Acknowledge any energy level

Just return the prompt, nothing else.`;

    return callOpenRouter(prompt);
  }
}

async function callOpenRouter(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  try {
    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'IdentityForge',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error('OpenRouter returned an empty prompt response');
    }
    return text;
  } catch (error) {
    console.error('Error generating daily prompt:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate daily prompt');
  }
}

// ============================================
// AI REFLECTION GENERATION
// ============================================

/**
 * Generate AI reflection after daily entry
 */
export async function generateDailyReflection(
  morningResponse: string | null,
  eveningResponse: string | null,
  energyLevel: number | null,
  alignmentScore: number | null,
  userValues?: string[]
): Promise<string> {
  let context = '';

  if (morningResponse) {
    context += `Morning entry: "${morningResponse}"\n`;
  }
  if (eveningResponse) {
    context += `Evening entry: "${eveningResponse}"\n`;
  }
  if (energyLevel) {
    context += `Energy level: ${energyLevel}/10\n`;
  }
  if (alignmentScore) {
    context += `Alignment score: ${alignmentScore}/10\n`;
  }
  if (userValues && userValues.length > 0) {
    context += `User values: ${userValues.join(', ')}\n`;
  }

  const prompt = `Generate a brief (2-3 sentences) AI reflection based on the daily entry.

Context:
${context}

The reflection should:
- Acknowledge something specific they shared
- Connect to their values if possible
- Offer gentle, non-judgmental observation
- Be warm and supportive

Just return the reflection, nothing else.`;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  try {
    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'IdentityForge',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error('OpenRouter returned an empty reflection response');
    }
    return text;
  } catch (error) {
    console.error('Error generating daily reflection:', error);
    throw new Error('Failed to generate daily reflection');
  }
}

// ============================================
// PATTERN ANALYSIS
// ============================================

/**
 * Analyze patterns from user's data
 */
export async function analyzePatterns(
  entries: Array<{
    date: Date;
    energyLevel: number | null;
    alignmentScore: number | null;
    morningResponse?: string | null;
    eveningResponse?: string | null;
  }>,
  values: string[]
): Promise<{
  summary: string;
  patterns: Array<{
    type: string;
    description: string;
    confidence: number;
  }>;
  recommendations: string[];
}> {
  const entriesData = entries
    .map(
      (e) =>
        `Date: ${e.date.toISOString().split('T')[0]}, Energy: ${e.energyLevel || 'N/A'}, Alignment: ${e.alignmentScore || 'N/A'}`
    )
    .join('\n');

  const prompt = `Analyze the following daily entries for patterns:

Entries:
${entriesData}

User values: ${values.join(', ')}

Identify:
1. Temporal patterns (day of week, time of day effects)
2. Energy patterns (what correlates with high/low energy)
3. Alignment patterns (what correlates with high/low alignment)
4. Any other notable patterns

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of overall patterns",
  "patterns": [
    { "type": "TEMPORAL|BEHAVIORAL|EMOTIONAL|VALUES", "description": "...", "confidence": 0.0-1.0 }
  ],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}

Just return valid JSON, no other text.`;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  try {
    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'IdentityForge',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error('API error');
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('OpenRouter returned an empty pattern analysis response');
    }
    const parsed = JSON.parse(text);
    return {
      summary: parsed.summary || '',
      patterns: parsed.patterns || [],
      recommendations: parsed.recommendations || [],
    };
  } catch (error) {
    console.error('Error analyzing patterns:', error);
    throw new Error('Failed to analyze patterns');
  }
}
