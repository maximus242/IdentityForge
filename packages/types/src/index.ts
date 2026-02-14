// IdentityForge TypeScript Types
// These types mirror the Prisma schema and add client-side types

import { z } from 'zod';

// ============================================
// ENUMS
// ============================================

export const ConversationTypeSchema = z.enum([
  'VALUES_DISCOVERY',
  'IDENTITY_CRAFT',
  'DAILY_REFLECTION',
  'BELIEF_WORK',
  'COACHING',
  'GENERAL',
]);

export type ConversationType = z.infer<typeof ConversationTypeSchema>;

export const MessageRoleSchema = z.enum(['USER', 'ASSISTANT', 'SYSTEM']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const PatternTypeSchema = z.enum([
  'TEMPORAL',
  'BEHAVIORAL',
  'EMOTIONAL',
  'VALUES',
  'IDENTITY',
]);
export type PatternType = z.infer<typeof PatternTypeSchema>;

export const BeliefTypeSchema = z.enum([
  'VALUE',
  'IDENTITY_CORE',
  'IDENTITY_BEHAVIOR',
  'IDENTITY_TRAIT',
  'IDENTITY_EMBODIMENT',
  'LIMITING',
  'EMPOWERING',
  'PERSONALITY',
]);
export type BeliefType = z.infer<typeof BeliefTypeSchema>;

export const BeliefCategorySchema = z.enum([
  'ACHIEVEMENT',
  'CONNECTION',
  'GROWTH',
  'CONTRIBUTION',
  'FREEDOM',
  'SECURITY',
  'CORE_IDENTITY',
  'ASPIRATIONAL',
  'SELF_WORTH',
  'CAPABILITY',
  'DESERVINGNESS',
  'SAFETY',
  'BELONGING',
  'STRENGTH',
  'PATTERN',
  'TENDENCY',
]);
export type BeliefCategory = z.infer<typeof BeliefCategorySchema>;

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  currentIdentityStatement: string | null;
}

export interface UserWithRelations extends User {
  values: Value[];
  identityArchetypes: IdentityArchetype[];
  dailyEntries: DailyEntry[];
  personalityInsights: PersonalityInsight[];
}

// ============================================
// VALUES TYPES
// ============================================

export interface Value {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  priority: number;
  whyDeepDive: string | null;
  connectionToIdentity: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateValueInput {
  name: string;
  description?: string;
  priority?: number;
  whyDeepDive?: string;
  connectionToIdentity?: string;
}

export interface UpdateValueInput {
  name?: string;
  description?: string;
  priority?: number;
  whyDeepDive?: string;
  connectionToIdentity?: string;
}

// ============================================
// IDENTITY ARCHETYPE TYPES
// ============================================

export interface IdentityArchetype {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  beliefs: string[];
  behaviors: string[];
  traits: string[];
  embodiedPractice: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIdentityArchetypeInput {
  name: string;
  description?: string;
  beliefs?: string[];
  behaviors?: string[];
  traits?: string[];
  embodiedPractice?: string;
}

// ============================================
// DAILY ENTRY TYPES
// ============================================

export interface DailyEntry {
  id: string;
  userId: string;
  date: Date;
  energyLevel: number | null;
  moodNote: string | null;
  alignmentScore: number | null;
  morningPrompt: string | null;
  morningResponse: string | null;
  eveningPrompt: string | null;
  eveningResponse: string | null;
  aiReflection: string | null;
  createdAt: Date;
  updatedAt: Date;
  values: DailyEntryValue[];
}

export interface DailyEntryValue {
  id: string;
  dailyEntryId: string;
  valueId: string;
  manifestation: string | null;
  actedOn: boolean;
  value?: Value;
}

export interface CreateDailyEntryInput {
  date: Date;
  energyLevel?: number;
  moodNote?: string;
  alignmentScore?: number;
  morningPrompt?: string;
  morningResponse?: string;
  eveningPrompt?: string;
  eveningResponse?: string;
}

export interface UpdateDailyEntryInput {
  energyLevel?: number;
  moodNote?: string;
  alignmentScore?: number;
  morningResponse?: string;
  eveningResponse?: string;
  aiReflection?: string;
}

// ============================================
// CONVERSATION TYPES
// ============================================

export interface Conversation {
  id: string;
  userId: string;
  type: ConversationType;
  title: string | null;
  summary: string | null;
  isActive: boolean;
  startedAt: Date;
  lastMessageAt: Date;
  completedAt: Date | null;
  model: string | null;
  messages: ConversationMessage[];
  insights: ConversationInsight[];
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata: unknown | null;
  createdAt: Date;
}

export interface ConversationInsight {
  id: string;
  conversationId: string;
  valueId: string | null;
  insight: string;
  category: string | null;
  createdAt: Date;
}

export interface CreateConversationInput {
  type: ConversationType;
  title?: string;
}

export interface AddMessageInput {
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// PATTERN TYPES
// ============================================

export interface Pattern {
  id: string;
  userId: string;
  type: PatternType;
  title: string;
  description: string;
  evidence: string[];
  recommendedAction: string | null;
  confidence: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePatternInput {
  type: PatternType;
  title: string;
  description: string;
  evidence?: string[];
  recommendedAction?: string;
  confidence?: number;
}

// ============================================
// PERSONALITY INSIGHT TYPES
// ============================================

export interface PersonalityInsight {
  id: string;
  userId: string;
  insight: string;
  category: string | null;
  source: string | null;
  createdAt: Date;
}

export interface CreatePersonalityInsightInput {
  insight: string;
  category?: string;
  source?: string;
}

// ============================================
// LIMITING BELIEF TYPES
// ============================================

export interface LimitingBelief {
  id: string;
  userId: string;
  belief: string;
  category: string | null;
  challenge: string | null;
  evidence: string | null;
  isActive: boolean;
  shiftLevel: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLimitingBeliefInput {
  belief: string;
  category?: string;
}

export interface UpdateLimitingBeliefInput {
  challenge?: string;
  evidence?: string;
  shiftLevel?: number;
  isActive?: boolean;
}

// ============================================
// BELIEF TYPES (UNIFIED SYSTEM)
// ============================================

export interface Belief {
  id: string;
  userId: string;
  type: BeliefType;
  statement: string;
  category: BeliefCategory | null;
  origin: string | null;
  evidence: string | null;
  counterEvidence: string | null;
  challenge: string | null;
  reframe: string | null;
  strength: number;
  priority: number | null;
  isEmpowering: boolean;
  isActive: boolean;
  sourceType: string | null;
  sourceId: string | null;
  parentBeliefId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBeliefInput {
  type: BeliefType;
  statement: string;
  category?: BeliefCategory;
  origin?: string;
  evidence?: string;
  strength?: number;
  priority?: number;
  parentBeliefId?: string;
}

export interface UpdateBeliefInput {
  statement?: string;
  category?: BeliefCategory;
  origin?: string;
  evidence?: string;
  counterEvidence?: string;
  challenge?: string;
  reframe?: string;
  strength?: number;
  priority?: number;
  isActive?: boolean;
}

export interface TransformBeliefInput {
  transformedStatement: string;
  evidence: string;
  practices?: string[];
}

export interface DailyEntryBelief {
  id: string;
  dailyEntryId: string;
  beliefId: string;
  manifestation: string | null;
  actedOn: boolean;
  belief?: Belief;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

// Auth
export interface AuthResponse {
  user: User;
  session: { token: string; expiresAt: Date };
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
}

// AI Conversation
export interface SendMessageInput {
  conversationId: string;
  content: string;
}

export interface AIResponse {
  message: string;
  insights?: string[];
  suggestedValues?: string[];
  suggestedActions?: string[];
}

// Daily Entry
export interface DailyEntryWithValues extends DailyEntry {
  values: (DailyEntryValue & { value: Value })[];
}

// Dashboard
export interface DashboardData {
  user: User;
  topValues: Value[];
  recentEntries: DailyEntry[];
  activeArchetype: IdentityArchetype | null;
  stats: {
    totalEntries: number;
    averageAlignment: number;
    averageEnergy: number;
    currentStreak: number;
  };
}

// Pattern Analysis
export interface PatternAnalysis {
  patterns: Pattern[];
  weeklySummary: string;
  recommendations: string[];
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const CreateValueSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  priority: z.number().min(1).max(10).optional(),
  whyDeepDive: z.string().max(2000).optional(),
  connectionToIdentity: z.string().max(2000).optional(),
});

export const CreateDailyEntrySchema = z.object({
  date: z.date(),
  energyLevel: z.number().min(1).max(10).optional(),
  moodNote: z.string().max(1000).optional(),
  alignmentScore: z.number().min(1).max(10).optional(),
  morningResponse: z.string().max(5000).optional(),
  eveningResponse: z.string().max(5000).optional(),
});

export const SendMessageSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1).max(10000),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const CreateBeliefSchema = z.object({
  type: BeliefTypeSchema,
  statement: z.string().min(1).max(1000),
  category: BeliefCategorySchema.optional(),
  origin: z.string().max(2000).optional(),
  evidence: z.string().max(2000).optional(),
  strength: z.number().min(0).max(1).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  parentBeliefId: z.string().optional(),
});

export const UpdateBeliefSchema = z.object({
  statement: z.string().min(1).max(1000).optional(),
  category: BeliefCategorySchema.optional(),
  origin: z.string().max(2000).optional(),
  evidence: z.string().max(2000).optional(),
  counterEvidence: z.string().max(2000).optional(),
  challenge: z.string().max(1000).optional(),
  reframe: z.string().max(1000).optional(),
  strength: z.number().min(0).max(1).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  isActive: z.boolean().optional(),
});

export const TransformBeliefSchema = z.object({
  transformedStatement: z.string().min(1).max(1000),
  evidence: z.string().min(1).max(2000),
  practices: z.array(z.string()).optional(),
});
